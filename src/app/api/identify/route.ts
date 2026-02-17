import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = safeString(payload?.client_key);
  const identity_key = safeString(payload?.identity_key); // IMPORTANT: hashed already
  const traits =
    payload?.traits && typeof payload.traits === "object" ? payload.traits : null;

  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  if (!identity_key) return NextResponse.json({ error: "Missing identity_key" }, { status: 400 });

  // Get or issue journey cookie (same pattern as /api/pixel)
  const cookieName = `up_journey_${client_key}`;
  const existing = req.cookies.get(cookieName)?.value || null;
  const journey_id =
    existing && /^[0-9a-fA-F-]{36}$/.test(existing) ? existing : randomUUID();

  // Ensure journey exists (best effort)
  const { data: existingJourney } = await supabase
    .from("journeys")
    .select("id")
    .eq("id", journey_id)
    .maybeSingle();

  if (!existingJourney) {
    // Create a minimal journey row so the FK link works
    await supabase.from("journeys").insert({
      id: journey_id,
      client_key,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      first_touch: { referrer: req.headers.get("referer") || null },
      last_touch: { referrer: req.headers.get("referer") || null },
      user_agent: req.headers.get("user-agent") || null,
      country: req.headers.get("x-vercel-ip-country") || null,
      region: req.headers.get("x-vercel-ip-country-region") || null,
      city: req.headers.get("x-vercel-ip-city") || null,
    });
  }

  // Upsert identity link (insert or bump last_linked_at)
  const now = new Date().toISOString();

  await supabase
  .from("journeys")
  .update({
    last_seen: now,
    last_identity_key: identity_key,
  })
  .eq("id", journey_id);

  // Try insert first; if unique violation, update last_linked_at/traits.
  const ins = await supabase.from("identity_links").insert({
    client_key,
    identity_key,
    journey_id,
    first_linked_at: now,
    last_linked_at: now,
    traits,
  });

  if (ins.error) {
    // Likely unique conflict; update
    await supabase
      .from("identity_links")
      .update({
        last_linked_at: now,
        traits: traits ?? undefined,
      })
      .eq("client_key", client_key)
      .eq("identity_key", identity_key)
      .eq("journey_id", journey_id);
  }

  // ✅ Backfill: any journey linked to this identity_key should carry last_identity_key
const { data: linked } = await supabase
.from("identity_links")
.select("journey_id")
.eq("client_key", client_key)
.eq("identity_key", identity_key);

if (linked && linked.length) {
const journeyIds = linked.map((r: any) => r.journey_id);

await supabase
  .from("journeys")
  .update({
    last_identity_key: identity_key,
    last_seen: now,
  })
  .in("id", journeyIds);
}

  // Also record an identify event (handy for auditing)
  await supabase.from("pixel_events").insert({
    ts: now,
    client_key,
    journey_id,
    event_name: "identify",
    identity_key,
    page_url: payload?.page_url || null,
    page_path: payload?.page_path || null,
    referrer: payload?.referrer || req.headers.get("referer") || null,
    props: traits ? { traits } : null,
  });

  const res = NextResponse.json({ ok: true, journey_id }, { status: 200 });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");

  const isLocal =
    req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

  res.cookies.set(cookieName, journey_id, {
    httpOnly: false,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return res;
}
