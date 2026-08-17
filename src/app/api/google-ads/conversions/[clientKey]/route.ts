// Google Ads offline conversion feed (pull method).
//
// Google Ads Data Manager fetches this URL on a schedule (HTTPS source, HTTP
// Basic Auth) and imports the rows as offline click conversions. We serve a
// rolling 90-day window of the client's Google conversions from the ledger and
// do NOT mark rows delivered — Google re-imports and dedupes identical
// conversions (same click id + action + time), so re-serving is safe and never
// loses a conversion to a failed import.
//
// Auth: HTTP Basic (GADS_FEED_USER / GADS_FEED_PASS env). The same credentials
// go in the Data Manager HTTPS source's username/password fields.
//
// Columns: separate Google Click ID / GBRAID / WBRAID so iOS-privacy clicks
// (gbraid/wbraid) land correctly — the entry-relay captured which kind each is.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function unauthorized(): NextResponse {
  return new NextResponse("Unauthorized", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="chapter-gads-feed"' },
  });
}

// "YYYY-MM-DD HH:MM:SS+00:00" (UTC, explicit offset) — Google Ads offline
// conversion import parses this unambiguously regardless of account timezone.
function fmtConversionTime(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ") + "+00:00";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientKey: string }> },
) {
  const user = process.env.GADS_FEED_USER;
  const pass = process.env.GADS_FEED_PASS;
  if (!user || !pass) return new NextResponse("feed not configured", { status: 503 });

  // HTTP Basic Auth
  const authHeader = req.headers.get("authorization") ?? "";
  const m = authHeader.match(/^Basic\s+(.+)$/i);
  if (!m) return unauthorized();
  let decoded = "";
  try {
    decoded = Buffer.from(m[1], "base64").toString("utf8");
  } catch {
    return unauthorized();
  }
  const sep = decoded.indexOf(":");
  const u = sep >= 0 ? decoded.slice(0, sep) : decoded;
  const p = sep >= 0 ? decoded.slice(sep + 1) : "";
  if (!safeEq(u, user) || !safeEq(p, pass)) return unauthorized();

  // Allow the URL to end in .csv so it reads like a file.
  const { clientKey: rawKey } = await params;
  const clientKey = rawKey.replace(/\.csv$/i, "");

  const sinceIso = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .schema("chapter_engagement")
    .from("gads_click_conversions")
    .select("click_id, click_kind, conversion_action_name, conversion_ts, value, currency")
    .eq("client_key", clientKey)
    .eq("click_platform", "google")
    .gte("conversion_ts", sinceIso)
    .order("conversion_ts", { ascending: true })
    .limit(50000);

  if (error) return new NextResponse("error", { status: 500 });

  const header =
    "Google Click ID,GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency";
  const lines = [header];
  for (const r of data ?? []) {
    const kind = (r.click_kind as string | null) ?? "gclid"; // legacy/unknown → gclid
    lines.push(
      [
        csvEscape(kind === "gclid" ? (r.click_id as string) : ""),
        csvEscape(kind === "gbraid" ? (r.click_id as string) : ""),
        csvEscape(kind === "wbraid" ? (r.click_id as string) : ""),
        csvEscape(r.conversion_action_name as string),
        fmtConversionTime(new Date(r.conversion_ts as string)),
        String(r.value ?? 0),
        csvEscape((r.currency as string) ?? "USD"),
      ].join(","),
    );
  }

  return new NextResponse(lines.join("\n") + "\n", {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
