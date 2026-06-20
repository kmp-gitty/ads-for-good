import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";

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
  return s === "opt_out" ? "opt_out" : "opt_in";
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsPreflightHeaders(req) });
}

export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return withCors(req, NextResponse.json({ error: "Invalid JSON" }, { status: 400 }));
  }

  const client_key = safeString(payload?.client_key);
  if (!client_key) {
    return withCors(req, NextResponse.json({ error: "Missing client_key" }, { status: 400 }));
  }
  if (!isKnownClient(client_key)) {
    return withCors(req, NextResponse.json({ error: "unknown_client" }, { status: 400 }));
  }

  const consent_status = safeConsentStatus(payload?.consent_status);
  const consent_mode = safeConsentMode(payload?.consent_mode);
  const consent_ts = safeString(payload?.consent_ts) || new Date().toISOString();
  const source = safeString(payload?.source);

  const page_url = safeString(payload?.page_url);
  const page_path = safeString(payload?.page_path);
  const referrer = safeString(payload?.referrer) || req.headers.get("referer") || null;

  const isLocal =
    req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  // Cookie-based or freshly generated identifiers.
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

  // Prefer explicit identity_key (already hashed) if the client provides one,
  // otherwise fall back to the anonymous cookie ID.
  const identity_key = safeString(payload?.identity_key) || anon_id;

  const client_event_id = safeString(payload?.client_event_id) || randomUUID();

  const metadata =
    payload?.metadata && typeof payload.metadata === "object" ? payload.metadata : null;

  const nowIso = new Date().toISOString();

  // All writes against RLS-protected tables happen inside withClient.
  try {
    await withClient(client_key, async (tx) => {
      // 1. consent_events insert.
      const metadataParam = metadata ? tx.json(metadata) : null;
      try {
        await tx`
          INSERT INTO chapter_ingest.consent_events (
            client_key, journey_id, identity_key, client_event_id,
            consent_status, consent_mode, consent_ts,
            source, page_url, page_path, referrer, metadata
          ) VALUES (
            ${client_key}, ${journey_id}, ${identity_key}, ${client_event_id},
            ${consent_status}, ${consent_mode}, ${consent_ts},
            ${source}, ${page_url}, ${page_path}, ${referrer}, ${metadataParam}::jsonb
          )
        `;
      } catch (insErr: any) {
        // Unique-violation on client_event_id is idempotent — same consent posted twice.
        if (insErr?.code !== "23505") throw insErr;
      }

      // 2. Journey upsert (consent fields). Single statement avoids the
      //    SELECT-then-INSERT-or-UPDATE pattern from the original supabase-js code.
      const firstTouch = tx.json({ referrer });
      await tx`
        INSERT INTO chapter_journey.journeys (
          id, client_key, first_seen, last_seen,
          first_touch, last_touch,
          user_agent, country, region, city,
          consent_status, consent_mode, consent_ts,
          ever_opted_in, last_identity_key
        ) VALUES (
          ${journey_id}, ${client_key}, ${nowIso}, ${nowIso},
          ${firstTouch}::jsonb, ${firstTouch}::jsonb,
          ${req.headers.get("user-agent") ?? null},
          ${req.headers.get("x-vercel-ip-country") ?? null},
          ${req.headers.get("x-vercel-ip-country-region") ?? null},
          ${req.headers.get("x-vercel-ip-city") ?? null},
          ${consent_status}, ${consent_mode}, ${consent_ts},
          ${consent_status === "opt_in"}, ${identity_key}
        )
        ON CONFLICT (id) DO UPDATE SET
          last_seen = EXCLUDED.last_seen,
          consent_status = EXCLUDED.consent_status,
          consent_mode = EXCLUDED.consent_mode,
          consent_ts = EXCLUDED.consent_ts,
          ever_opted_in = chapter_journey.journeys.ever_opted_in OR EXCLUDED.ever_opted_in,
          last_identity_key = EXCLUDED.last_identity_key
      `;
    });
  } catch (err: any) {
    console.error("consent_events insert / journey upsert failed:", err);
    return withCors(req, NextResponse.json({ error: "db_insert_failed" }, { status: 500 }));
  }

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

  // Set chapter_consent on the API/redirect origin so the redirect handler
  // at /r/<key>/<slug> reads the right state on the next click. For 1P
  // installs (storefront and API on same eTLD+1), this lands on the same
  // host the storefront pixel reads. For 3P installs (cross-origin call
  // from storefront → ads4good.com), the cookie lands on ads4good.com and
  // covers the redirect-handler read path; the storefront-side cookie is
  // set client-side by the pixel (see chapterWriteConsentCookie in pixel.js).
  if (consent_status === "opt_in" || consent_status === "opt_out") {
    res.cookies.set("chapter_consent", consent_status, {
      httpOnly: false,
      secure: !isLocal,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return withCors(req, res);
}
