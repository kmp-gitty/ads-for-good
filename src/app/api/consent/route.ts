import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { chapterSchemas } from "@/app/lib/chapter-db";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function safeConsentStatus(v: any): "opt_in" | "opt_out" | "unknown" {
  const s = String(v || "").trim().toLowerCase();
  if (s === "opt_in") return "opt_in";
  if (s === "opt_out") return "opt_out";
  return "unknown";
}

function safeConsentMode(v: any): "opt_in" | "opt_out" {
  const s = String(v || "").trim().toLowerCase();
  return s === "opt_out" ? "opt_out" : "opt_in"; // default opt_in
}

/**
 * POST /api/consent
 */
export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = safeString(payload?.client_key);
  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });

  const consent_status = safeConsentStatus(payload?.consent_status);
  const consent_mode = safeConsentMode(payload?.consent_mode); // ✅ always set
  const consent_ts = safeString(payload?.consent_ts) || new Date().toISOString();
  const source = safeString(payload?.source);

  const page_url = safeString(payload?.page_url);
  const page_path = safeString(payload?.page_path);
  const referrer = safeString(payload?.referrer) || req.headers.get("referer") || null;

  // Cookies: same pattern as /api/pixel
  const isLocal =
    req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  const journeyCookieName = `up_journey_${client_key}`;
  const existingJourney = req.cookies.get(journeyCookieName)?.value || null;
  const journey_id =
    existingJourney && /^[0-9a-fA-F-]{36}$/.test(existingJourney)
      ? existingJourney
      : randomUUID();

  const anonCookieName = `up_anon_${client_key}`;
  const existingAnon = req.cookies.get(anonCookieName)?.value || null;
  const anon_id =
    existingAnon && /^[0-9a-fA-F-]{36}$/.test(existingAnon)
      ? existingAnon
      : randomUUID();

  // Prefer explicit identity_key if provided (already hashed), else anon_id
  const identity_key = safeString(payload?.identity_key) || anon_id;

  // ✅ always set a dedupe id
  const client_event_id = safeString(payload?.client_event_id) || randomUUID();

  const metadata =
    payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null;

  // 1) Insert consent event (audit log)
  const { error: insErr } = await chapterSchemas
  .ingest(supabase)
  .from("consent_events")
  .insert({
    client_key,
    journey_id,
    identity_key,
    client_event_id,
    consent_status,
    consent_mode,
    consent_ts,
    source,
    page_url,
    page_path,
    referrer,
    metadata,
  });

  if (insErr) {
    console.error("consent_events insert error:", insErr);
    return NextResponse.json({ error: "db_insert_failed" }, { status: 500 });
  }

  // 2) Update journey snapshot (best effort)
  const { data: existingJ } = await chapterSchemas
  .journey(supabase)
  .from("journeys")
  .select("id, ever_opted_in")
  .eq("id", journey_id)
  .maybeSingle();

  const nowIso = new Date().toISOString();

  if (!existingJ) {
    await chapterSchemas.journey(supabase).from("journeys").insert({
      id: journey_id,
      client_key,
      first_seen: nowIso,
      last_seen: nowIso,
      user_agent: req.headers.get("user-agent") || null,
      country: req.headers.get("x-vercel-ip-country") || null,
      region: req.headers.get("x-vercel-ip-country-region") || null,
      city: req.headers.get("x-vercel-ip-city") || null,
      consent_status,
      consent_mode,
      consent_ts,
      ever_opted_in: consent_status === "opt_in",
      last_identity_key: identity_key,
    });
  } else {
    await chapterSchemas
  .journey(supabase)
  .from("journeys")
  .update({
        consent_status,
        consent_mode,
        consent_ts,
        ever_opted_in: existingJ.ever_opted_in || consent_status === "opt_in",
        last_seen: nowIso,
        last_identity_key: identity_key,
      })
      .eq("id", journey_id);
  }

  // 3) Return + set cookies
  const res = NextResponse.json(
    {
      ok: true,
      client_key,
      journey_id,
      identity_key,
      consent_status,
      consent_mode,
      consent_ts,
      client_event_id,
    },
    { status: 200 }
  );

  res.cookies.set(journeyCookieName, journey_id, {
    httpOnly: false,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  res.cookies.set(anonCookieName, anon_id, {
    httpOnly: false,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}