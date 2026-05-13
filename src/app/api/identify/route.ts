import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
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
  const identity_key = safeString(payload?.identity_key); // already hashed by pixel
  const previous_identity_key = safeString(payload?.previous_identity_key);

  if (!client_key) {
    return withCors(req, NextResponse.json({ error: "Missing client_key" }, { status: 400 }));
  }
  if (!identity_key) {
    return withCors(req, NextResponse.json({ error: "Missing identity_key" }, { status: 400 }));
  }
  if (!isKnownClient(client_key)) {
    return withCors(req, NextResponse.json({ error: "unknown_client" }, { status: 400 }));
  }

  // If previous_identity_key isn't provided, fall back to anon cookie (set by /api/pixel)
  const anonCookieName = `up_anon_${client_key}`;
  const anonFromCookie = req.cookies.get(anonCookieName)?.value || null;

  const effective_previous_identity_key =
    previous_identity_key ||
    (anonFromCookie && /^[0-9a-fA-F-]{36}$/.test(anonFromCookie) ? anonFromCookie : null);

  const traits =
    payload?.traits && typeof payload.traits === "object" ? payload.traits : null;

  // Resolve journey ID: prefer payload, then cookie, then generate.
  const cookieName = `up_journey_${client_key}`;
  const existingCookie = req.cookies.get(cookieName)?.value || null;
  const incomingJourneyId =
    payload?.journey_id && /^[0-9a-fA-F-]{36}$/.test(String(payload.journey_id).trim())
      ? String(payload.journey_id).trim()
      : null;
  const journey_id =
    incomingJourneyId ||
    (existingCookie && /^[0-9a-fA-F-]{36}$/.test(existingCookie) ? existingCookie : randomUUID());

  const now = new Date().toISOString();
  const referer = req.headers.get("referer") || null;

  // Phase 1: ensure journey row exists.
  try {
    await withClient(client_key, async (tx) => {
      const exists = await tx<{ id: string }[]>`
        SELECT id FROM chapter_journey.journeys
        WHERE id = ${journey_id}
        LIMIT 1
      `;
      if (exists.length === 0) {
        const firstTouch = tx.json({ referrer: referer });
        await tx`
          INSERT INTO chapter_journey.journeys
            (id, client_key, first_seen, last_seen, first_touch, last_touch,
             user_agent, country, region, city)
          VALUES (
            ${journey_id}, ${client_key}, ${now}, ${now},
            ${firstTouch}::jsonb, ${firstTouch}::jsonb,
            ${req.headers.get("user-agent") ?? null},
            ${req.headers.get("x-vercel-ip-country") ?? null},
            ${req.headers.get("x-vercel-ip-country-region") ?? null},
            ${req.headers.get("x-vercel-ip-city") ?? null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    });
  } catch (err) {
    console.error("identify phase 1 (journey ensure) failed:", err);
  }

  // Phase 2: self-canonical identity_canon entry.
  try {
    await withClient(client_key, async (tx) => {
      await tx`
        INSERT INTO chapter_identity.identity_canon (client_key, identity_key, canonical_identity_key, updated_at)
        VALUES (${client_key}, ${identity_key}, ${identity_key}, ${now})
        ON CONFLICT (client_key, identity_key)
        DO UPDATE SET canonical_identity_key = EXCLUDED.canonical_identity_key, updated_at = EXCLUDED.updated_at
      `;
    });
  } catch (err) {
    console.error("identify phase 2 (canon self-upsert) failed:", err);
  }

  // Phase 3: previous-identity bridge (alias + canon).
  if (effective_previous_identity_key && effective_previous_identity_key !== identity_key) {
    try {
      await withClient(client_key, async (tx) => {
        const metadata = tx.json({
          page_url: payload?.page_url || null,
          page_path: payload?.page_path || null,
          referrer: payload?.referrer || referer,
        });
        await tx`
          INSERT INTO chapter_identity.identity_aliases
            (client_key, ts, from_identity_key, to_identity_key, method, confidence, is_deterministic, reason, metadata)
          VALUES (
            ${client_key}, ${now}, ${effective_previous_identity_key}, ${identity_key},
            'client_previous_identity', 85, false, 'explicit_identify_call',
            ${metadata}::jsonb
          )
          ON CONFLICT (client_key, from_identity_key, to_identity_key) DO NOTHING
        `;
        await tx`
          INSERT INTO chapter_identity.identity_canon (client_key, identity_key, canonical_identity_key, updated_at)
          VALUES (${client_key}, ${effective_previous_identity_key}, ${identity_key}, ${now})
          ON CONFLICT (client_key, identity_key)
          DO UPDATE SET canonical_identity_key = EXCLUDED.canonical_identity_key, updated_at = EXCLUDED.updated_at
        `;
      });
    } catch (err) {
      console.error("identify phase 3 (prev-identity bridge) failed:", err);
    }
  }

  // Phase 4: identity_links upsert + journey update.
  // Uses ON CONFLICT DO UPDATE to handle existing (client_key, identity_key, journey_id)
  // rows. COALESCE(EXCLUDED.traits, identity_links.traits) preserves the existing
  // traits jsonb when the new payload didn't include any (matches the original's
  // `traits: traits ?? undefined` behavior).
  try {
    await withClient(client_key, async (tx) => {
      const traitsParam = traits ? tx.json(traits) : null;
      await tx`
        INSERT INTO chapter_identity.identity_links
          (client_key, identity_key, journey_id, first_linked_at, last_linked_at, traits)
        VALUES (${client_key}, ${identity_key}, ${journey_id}, ${now}, ${now}, ${traitsParam}::jsonb)
        ON CONFLICT (client_key, identity_key, journey_id)
        DO UPDATE SET
          last_linked_at = EXCLUDED.last_linked_at,
          traits = COALESCE(EXCLUDED.traits, chapter_identity.identity_links.traits)
      `;
      await tx`
        UPDATE chapter_journey.journeys
        SET last_seen = ${now}, last_identity_key = ${identity_key}
        WHERE id = ${journey_id}
      `;
    });
  } catch (err) {
    console.error("identify phase 4 (links + journey update) failed:", err);
  }

  // Phase 5: backfill last_identity_key on every journey linked to this identity.
  try {
    await withClient(client_key, async (tx) => {
      await tx`
        UPDATE chapter_journey.journeys j
        SET last_identity_key = ${identity_key},
            last_seen = ${now}
        FROM chapter_identity.identity_links il
        WHERE il.client_key = ${client_key}
          AND il.identity_key = ${identity_key}
          AND j.id = il.journey_id
          AND j.client_key = ${client_key}
      `;
    });
  } catch (err) {
    console.error("identify phase 5 (journey backfill) failed:", err);
  }

  // Phase 6: identify audit pixel_event. Unlike /api/purchase, we have a valid
  // journey_id here so this insert actually succeeds.
  try {
    await withClient(client_key, async (tx) => {
      const props = traits ? tx.json({ traits }) : null;
      await tx`
        INSERT INTO chapter_ingest.pixel_events
          (ts, client_key, journey_id, event_name, identity_key, page_url, page_path, referrer, props)
        VALUES (
          ${now}, ${client_key}, ${journey_id}, 'identify', ${identity_key},
          ${payload?.page_url ?? null}, ${payload?.page_path ?? null},
          ${payload?.referrer ?? referer},
          ${props}::jsonb
        )
      `;
    });
  } catch (err) {
    console.error("identify phase 6 (audit pixel_event) failed:", err);
  }

  // Response + cookies.
  const isLocal =
    req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  const res = NextResponse.json({ ok: true, journey_id }, { status: 200 });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");

  res.cookies.set(cookieName, journey_id, {
    httpOnly: false,
    secure: !isLocal,
    sameSite: isLocal ? "lax" : "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  const anonCookieValue =
    anonFromCookie && /^[0-9a-fA-F-]{36}$/.test(anonFromCookie)
      ? anonFromCookie
      : randomUUID();

  res.cookies.set(anonCookieName, anonCookieValue, {
    httpOnly: false,
    secure: !isLocal,
    sameSite: isLocal ? "lax" : "none",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return withCors(req, res);
}
