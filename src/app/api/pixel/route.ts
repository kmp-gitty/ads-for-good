import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { chapterSchemas } from "@/app/lib/chapter-db";

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

function isDeterministicIdentityKey(k: string | null | undefined) {
    if (!k) return false;
  
    // allowlist the namespaces you want to support
    const allowedPrefixes = [
      "email_sha256:",
      "phone_sha256:",
      "customer_id:",
      "shopify_customer_id:",
      "crm_contact_id:",
      "pos_customer_id:",
    ];
  
    return allowedPrefixes.some((p) => k.startsWith(p));
  }

export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = String(payload?.client_key || "").trim();
  const event_name = String(payload?.event_name || "").trim();

  if (!client_key)
    return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  if (!event_name)
    return NextResponse.json({ error: "Missing event_name" }, { status: 400 });

  // 0) Stable anon identity / incoming identity support
const anonCookieName = `up_anon_${client_key}`;
const existingAnon = req.cookies.get(anonCookieName)?.value || null;

const incomingIdentityKey =
  payload?.identity_key && String(payload.identity_key).trim()
    ? String(payload.identity_key).trim()
    : null;

const anon_id =
  existingAnon && /^[0-9a-fA-F-]{36}$/.test(existingAnon)
    ? existingAnon
    : randomUUID();

// Prefer incoming identity_key when provided.
// Otherwise fall back to anon cookie identity.
const identity_key = incomingIdentityKey || anon_id;

  const vertical = payload?.vertical ? String(payload.vertical).trim() : null;

  const page_url = payload?.page_url ? String(payload.page_url) : null;
  const page_path = payload?.page_path ? String(payload.page_path) : null;
  const referrer = payload?.referrer
    ? String(payload.referrer)
    : req.headers.get("referer") || null;

  // 1) Journey support: prefer incoming journey_id, then cookie, then generate
const cookieName = `up_journey_${client_key}`;
const existing = req.cookies.get(cookieName)?.value || null;

const incomingJourneyId =
  payload?.journey_id && /^[0-9a-fA-F-]{36}$/.test(String(payload.journey_id).trim())
    ? String(payload.journey_id).trim()
    : null;

const journey_id =
  incomingJourneyId ||
  (existing && /^[0-9a-fA-F-]{36}$/.test(existing) ? existing : randomUUID());

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

  // ---------------------------------------------------------------------------
  // 2.5) Consent gate (align to site state)
  // Incoming signals from client
  const consent_status = String(payload?.consent_status || "unknown"); // opt_in | opt_out | unknown
  const consent_mode = String(payload?.consent_mode || "opt_in");      // opt_in | opt_out (site behavior)

  // DB signal (authoritative if opt_out)
  let db_consent: "opt_in" | "opt_out" | "unknown" = "unknown";
  let db_consent_mode: "opt_in" | "opt_out" | null = null;
  let db_consent_ts: string | null = null; // ✅ declare OUTSIDE try so it's in scope below

  try {
    const { data: j } = await chapterSchemas
  .journey(supabase)
  .from("journeys")
  .select("consent_status, consent_mode, consent_ts")
  .eq("id", journey_id)
  .maybeSingle();

    const v = (j as any)?.consent_status;
    if (v === "opt_in" || v === "opt_out" || v === "unknown") {
      db_consent = v;
    }

    const cm = (j as any)?.consent_mode;
    if (cm === "opt_in" || cm === "opt_out") {
      db_consent_mode = cm;
    }

    const cts = (j as any)?.consent_ts;
    if (cts) db_consent_ts = cts;
  } catch {
    db_consent = "unknown";
    db_consent_mode = null;
    db_consent_ts = null;
  }

  // Decide effective consent:
  // - DB opt_out always wins
  // - otherwise, explicit client opt_in/opt_out wins
  // - otherwise unknown
  let effective_consent = db_consent;
  if (effective_consent !== "opt_out") {
    if (consent_status === "opt_in" || consent_status === "opt_out") {
      effective_consent = consent_status as any;
    }
  }

  // Determine site tracking mode (align to stored site state if not provided)
  const effective_mode =
    consent_mode === "opt_in" || consent_mode === "opt_out"
      ? (consent_mode as any)
      : (db_consent_mode ?? "opt_in");

  // Align-to-site-state gate:
  // - opt_in => track
  // - opt_out => do not track
  // - unknown => follow effective_mode
  const should_track =
    effective_consent === "opt_in" ||
    (effective_consent === "unknown" && effective_mode === "opt_out"); // site tracks until opt-out

    const payload_consent_ts =
    payload?.consent_ts ? String(payload.consent_ts) : null;
  
  const effective_consent_ts =
    payload_consent_ts ??
    db_consent_ts ??
    (effective_consent === "unknown" ? null : new Date().toISOString());

  if (!should_track) {
    const res = new NextResponse(null, { status: 204 });

    const isLocal =
      req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

    // still set cookies so the user can later opt-in and we can continue that same journey
    res.cookies.set(cookieName, journey_id, {
      httpOnly: false,
      secure: !isLocal,
      sameSite: isLocal ? "lax" : "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

    res.cookies.set(anonCookieName, anon_id, {
      httpOnly: false,
      secure: !isLocal,
      sameSite: isLocal ? "lax" : "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  // ---------------------------------------------------------------------------

  // 3) Privacy-safe request context (no raw IP stored)
  const ua = req.headers.get("user-agent") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const region = req.headers.get("x-vercel-ip-country-region") || null;
  const city = req.headers.get("x-vercel-ip-city") || null;

  // 4) Upsert journey summary
  const first_touch =
    Object.keys(utm).length || Object.keys(partner_ids).length || referrer
      ? { ...utm, ...partner_ids, referrer }
      : null;

      const { data: existingJourney } = await chapterSchemas
      .journey(supabase)
      .from("journeys")
      .select("id")
      .eq("id", journey_id)
      .maybeSingle();

  if (!existingJourney) {
    await chapterSchemas.journey(supabase).from("journeys").insert({
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
    await chapterSchemas
  .journey(supabase)
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

    const ins = await chapterSchemas
  .identity(supabase)
  .from("identity_links")
  .insert({
      client_key,
      identity_key,
      journey_id,
      first_linked_at: now,
      last_linked_at: now,
      traits:
        payload?.traits && typeof payload.traits === "object" ? payload.traits : null,
    });

    if (ins.error) {
        await chapterSchemas
        .identity(supabase)
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

// ------------------------------------------------------
// Offline identity seed matching (only after deterministic ID + opt-in)
// ------------------------------------------------------
function isDeterministicIdentityKey(k: string | null | undefined) {
    if (!k) return false;
    const allowedPrefixes = [
      "email_sha256:",
      "phone_sha256:",
      "customer_id:",
      "shopify_customer_id:",
      "crm_contact_id:",
      "crm_id:",
      "loyalty_id:",
      "pos_customer_id:",
      "external_id:",
    ];
    return allowedPrefixes.some((p) => k.startsWith(p));
  }
  
  if (isDeterministicIdentityKey(identity_key) && effective_consent === "opt_in") {
    try {
        const { data: seeds } = await chapterSchemas
        .ingest(supabase)
        .from("offline_identity_seeds")
        .select("source_type, source_id, seed_ts, metadata, identity_type, is_hashed")
        .eq("client_key", client_key)
        .eq("identity_key", identity_key)
        .limit(25);
  
      if (seeds && seeds.length) {
        const rows = seeds.map((s: any) => {
          const kind = s?.metadata?.kind || "outside"; // outside | inside | conversion (stored in metadata)
          return {
            client_key,
            identity_key,
            milestone_name: s.source_type || `offline_${kind}_seed_match`,
            milestone_ts: s.seed_ts || new Date().toISOString(),
            value: null,
            currency: null,
            source_type: s.source_type,
            source_id: s.source_id,
            metadata: s.metadata || null,
            identity_type: s.identity_type || null,
            is_hashed: typeof s.is_hashed === "boolean" ? s.is_hashed : null,
          };
        });
  
        const { error } = await chapterSchemas
  .ingest(supabase)
  .from("offline_milestones")
  .insert(rows);
  
        // duplicates are OK (idempotent)
        if (error && !String(error.code || "").includes("23505")) {
          console.error("offline milestone insert error:", error);
        }
      }
    } catch (err) {
      console.error("offline seed match error:", err);
    }
  }
  
  // 5) Insert event row
  const { error: eventErr } = await chapterSchemas
  .ingest(supabase)
  .from("pixel_events")
  .insert({
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

    consent_status: effective_consent,
    consent_mode: effective_mode,
    consent_ts: effective_consent_ts,
  });

  if (eventErr) {
    console.error("pixel_events insert error:", eventErr);
  }

  // Keep journey's canonical identity updated
  if (identity_key) {
    await chapterSchemas
  .journey(supabase)
  .from("journeys")
  .update({
        last_identity_key: identity_key,
        last_seen: new Date().toISOString(),
      })
      .eq("id", journey_id);
  }

  // 6) Return 204 + Set-Cookie
  const res = new NextResponse(null, { status: 204 });

  const isLocal =
    req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";

    res.cookies.set(cookieName, journey_id, {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    
    res.cookies.set(anonCookieName, anon_id, {
      httpOnly: false,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}