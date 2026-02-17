import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-side only
);

function getUtmFromUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const sp = url.searchParams;

    const utm_source = sp.get("utm_source") || null;
    const utm_medium = sp.get("utm_medium") || null;
    const utm_campaign = sp.get("utm_campaign") || null;
    const utm_content = sp.get("utm_content") || null;
    const utm_term = sp.get("utm_term") || null;

    // partner click IDs often show up on landing URLs
    const gclid = sp.get("gclid") || null;
    const fbclid = sp.get("fbclid") || null;
    const rdt_cid = sp.get("rdt_cid") || null;
    const ttclid = sp.get("ttclid") || null;

    return {
      utm: { utm_source, utm_medium, utm_campaign, utm_content, utm_term },
      partner_ids: { gclid, fbclid, rdt_cid, ttclid },
    };
  } catch {
    return { utm: null, partner_ids: null };
  }
}

function cleanNulls<T extends Record<string, any>>(obj: T) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== null && v !== "" && v !== undefined) out[k] = v;
  }
  return out as T;
}

/**
 * POST /api/pixel
 * Body example:
 * {
 *   "client_key": "adsforgood",          // REQUIRED (tenant)
 *   "vertical": "PUBLISHER_NEWS",        // optional
 *   "event_name": "page_view",           // REQUIRED
 *   "page_url": "https://.../faux-news?utm_source=reddit...",
 *   "page_path": "/faux-news",
 *   "referrer": "https://google.com",
 *   "props": { "placement": "hero", "story_id": "hero-1" },
 *   "utm": { ...optional override... },
 *   "partner_ids": { ...optional override... }
 * }
 */
export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = String(payload?.client_key || "").trim();
  const event_name = String(payload?.event_name || "").trim();
  const identity_key =
  payload?.identity_key ? String(payload.identity_key).trim() : null;


  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  if (!event_name) return NextResponse.json({ error: "Missing event_name" }, { status: 400 });

  const vertical = payload?.vertical ? String(payload.vertical).trim() : null;

  const page_url = payload?.page_url ? String(payload.page_url) : null;
  const page_path = payload?.page_path ? String(payload.page_path) : null;
  const referrer = payload?.referrer ? String(payload.referrer) : (req.headers.get("referer") || null);

  // 1) Journey cookie (first-party)
  const cookieName = `up_journey_${client_key}`;
  const existing = req.cookies.get(cookieName)?.value || null;

  // If existing cookie isn't a valid UUID, reissue.
  const journey_id = existing && /^[0-9a-fA-F-]{36}$/.test(existing) ? existing : randomUUID();

  // 2) Source snapshot from page_url (if present)
  const derived = page_url ? getUtmFromUrl(page_url) : { utm: null, partner_ids: null };

  const utm = cleanNulls({
    ...(derived.utm || {}),
    ...(payload?.utm || {}),
  });

  const partner_ids = cleanNulls({
    ...(derived.partner_ids || {}),
    ...(payload?.partner_ids || {}),
  });

  // 3) Privacy-safe request context (no raw IP stored)
  const ua = req.headers.get("user-agent") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const region = req.headers.get("x-vercel-ip-country-region") || null;
  const city = req.headers.get("x-vercel-ip-city") || null;

  // 4) Upsert journey summary
  // We update last_seen each time; first_seen/first_touch only set on insert.
  const first_touch = Object.keys(utm).length || Object.keys(partner_ids).length || referrer
    ? { ...utm, ...partner_ids, referrer }
    : null;

  // Insert if missing; then update last_seen + last_touch
  // (Two-step keeps it simple and avoids edge-case upsert constraints.)
  const { data: existingJourney } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journey_id)
    .maybeSingle();

  if (!existingJourney) {
    await supabase.from("journeys").insert({
      id: journey_id,
      client_key,
      vertical,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      first_touch,
      last_touch: first_touch,
      user_agent: ua,
      country,
      region,
      city,
    });
  } else {
    await supabase
      .from("journeys")
      .update({
        last_seen: new Date().toISOString(),
        last_touch: first_touch,
        vertical: vertical ?? undefined,
      })
      .eq("id", journey_id);
  }

  if (identity_key) {
    const now = new Date().toISOString();
  
    // Try to insert the mapping
    const ins = await supabase.from("identity_links").insert({
      client_key,
      identity_key,
      journey_id,
      first_linked_at: now,
      last_linked_at: now,
      traits: payload?.traits && typeof payload.traits === "object" ? payload.traits : null,
    });
  
    // If it already exists (unique constraint), just bump last_linked_at
    if (ins.error) {
      await supabase
        .from("identity_links")
        .update({
          last_linked_at: now,
          traits:
            payload?.traits && typeof payload.traits === "object"
              ? payload.traits
              : undefined,
        })
        .eq("client_key", client_key)
        .eq("identity_key", identity_key)
        .eq("journey_id", journey_id);
    }
  }
  
  // 5) Insert event row
  const { error: eventErr } = await supabase.from("pixel_events").insert({
    ts: new Date().toISOString(),
    client_key,
    journey_id,
    identity_key: identity_key || null,
    event_name,
    page_url,
    page_path,
    referrer,
    utm: Object.keys(utm).length ? utm : null,
    partner_ids: Object.keys(partner_ids).length ? partner_ids : null,
    props: payload?.props ?? null,
  });

  if (eventErr) {
    // Don’t break the caller (pixel calls should be resilient)
    console.error("pixel_events insert error:", eventErr);
  }

  // If the event includes identity_key, keep journey's canonical identity updated
if (identity_key) {
await supabase
  .from("journeys")
  .update({
    last_identity_key: identity_key,
    last_seen: new Date().toISOString(),
  })
  .eq("id", journey_id);
}


  // 6) Return 204 with Set-Cookie to persist journey_id
  const res = new NextResponse(null, { status: 204 });

  const isLocal =
  req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

res.cookies.set(cookieName, journey_id, {
  httpOnly: false,
  secure: !isLocal, // ✅ allow cookie on localhost
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 180,
});

  // Also avoid indexing this endpoint
  res.headers.set("X-Robots-Tag", "noindex, nofollow");

  return res;
}
