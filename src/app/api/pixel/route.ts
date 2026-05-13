import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";

function getUtmFromUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const sp = url.searchParams;
    return {
      utm: {
        utm_source: sp.get("utm_source") || null,
        utm_medium: sp.get("utm_medium") || null,
        utm_campaign: sp.get("utm_campaign") || null,
        utm_content: sp.get("utm_content") || null,
        utm_term: sp.get("utm_term") || null,
      },
      partner_ids: {
        gclid: sp.get("gclid") || null,
        fbclid: sp.get("fbclid") || null,
        rdt_cid: sp.get("rdt_cid") || null,
        ttclid: sp.get("ttclid") || null,
      },
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

const DETERMINISTIC_ID_PREFIXES = [
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
function isDeterministicIdentityKey(k: string | null | undefined): boolean {
  if (!k) return false;
  return DETERMINISTIC_ID_PREFIXES.some((p) => k.startsWith(p));
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

  if (payload?.internal_ignore === true) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  if (!event_name) return NextResponse.json({ error: "Missing event_name" }, { status: 400 });
  if (!isKnownClient(client_key)) {
    return NextResponse.json({ error: "unknown_client" }, { status: 400 });
  }

  // Stable anon identity / incoming identity.
  const anonCookieName = `up_anon_${client_key}`;
  const existingAnon = req.cookies.get(anonCookieName)?.value || null;

  const incomingIdentityKey =
    payload?.identity_key && String(payload.identity_key).trim()
      ? String(payload.identity_key).trim()
      : null;

  const incomingAnonymousId =
    payload?.anonymous_id && /^[0-9a-fA-F-]{36}$/.test(String(payload.anonymous_id).trim())
      ? String(payload.anonymous_id).trim()
      : null;

  const anon_id =
    incomingAnonymousId ||
    (existingAnon && /^[0-9a-fA-F-]{36}$/.test(existingAnon) ? existingAnon : null) ||
    randomUUID();

  const identity_key = incomingIdentityKey || anon_id;

  const vertical = payload?.vertical ? String(payload.vertical).trim() : null;
  const page_url = payload?.page_url ? String(payload.page_url) : null;
  const page_path = payload?.page_path ? String(payload.page_path) : null;
  const referrer = payload?.referrer
    ? String(payload.referrer)
    : req.headers.get("referer") || null;

  const cookieName = `up_journey_${client_key}`;
  const existing = req.cookies.get(cookieName)?.value || null;

  const incomingJourneyId =
    payload?.journey_id && /^[0-9a-fA-F-]{36}$/.test(String(payload.journey_id).trim())
      ? String(payload.journey_id).trim()
      : null;

  const journey_id =
    incomingJourneyId ||
    (existing && /^[0-9a-fA-F-]{36}$/.test(existing) ? existing : randomUUID());

  // Source snapshot from page_url + payload.
  const derived = page_url ? getUtmFromUrl(page_url) : { utm: null, partner_ids: null };
  const utm = cleanNulls({ ...(derived.utm || {}), ...(payload?.utm || {}) });
  const partner_ids = cleanNulls({ ...(derived.partner_ids || {}), ...(payload?.partner_ids || {}) });

  // ---------------------------------------------------------------------------
  // Phase 1: Consent gate — read existing journey consent state if any.
  // ---------------------------------------------------------------------------
  const consent_status_in = String(payload?.consent_status || "unknown");
  const consent_mode_in = String(payload?.consent_mode || "opt_in");

  let db_consent: "opt_in" | "opt_out" | "unknown" = "unknown";
  let db_consent_mode: "opt_in" | "opt_out" | null = null;
  let db_consent_ts: string | null = null;

  try {
    const rows = await withClient(client_key, async (tx) => {
      return tx<{ consent_status: string | null; consent_mode: string | null; consent_ts: string | null }[]>`
        SELECT consent_status, consent_mode, consent_ts
        FROM chapter_journey.journeys
        WHERE id = ${journey_id}
        LIMIT 1
      `;
    });
    const j = rows[0];
    const v = j?.consent_status;
    if (v === "opt_in" || v === "opt_out" || v === "unknown") db_consent = v;
    const cm = j?.consent_mode;
    if (cm === "opt_in" || cm === "opt_out") db_consent_mode = cm;
    if (j?.consent_ts) db_consent_ts = String(j.consent_ts);
  } catch {
    // Stay at defaults; next phase will INSERT the journey row.
  }

  let effective_consent = db_consent;
  if (effective_consent !== "opt_out") {
    if (consent_status_in === "opt_in" || consent_status_in === "opt_out") {
      effective_consent = consent_status_in as any;
    }
  }
  const effective_mode =
    consent_mode_in === "opt_in" || consent_mode_in === "opt_out"
      ? (consent_mode_in as any)
      : (db_consent_mode ?? "opt_in");

  const should_track =
    effective_consent === "opt_in" ||
    (effective_consent === "unknown" && effective_mode === "opt_out");

  const payload_consent_ts = payload?.consent_ts ? String(payload.consent_ts) : null;
  const effective_consent_ts =
    payload_consent_ts ??
    db_consent_ts ??
    (effective_consent === "unknown" ? null : new Date().toISOString());

  if (!should_track) {
    // 204 + cookies so the same journey continues if/when the user opts in.
    const res = new NextResponse(null, { status: 204 });
    const isLocal =
      req.nextUrl.hostname === "localhost" || req.nextUrl.hostname === "127.0.0.1";
    res.cookies.set(cookieName, journey_id, {
      httpOnly: false, secure: !isLocal, sameSite: isLocal ? "lax" : "none",
      path: "/", maxAge: 60 * 60 * 24 * 180,
    });
    res.cookies.set(anonCookieName, anon_id, {
      httpOnly: false, secure: !isLocal, sameSite: isLocal ? "lax" : "none",
      path: "/", maxAge: 60 * 60 * 24 * 365,
    });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Atomic write — journey upsert + identity_links upsert + pixel_events INSERT.
  // ---------------------------------------------------------------------------
  const ua = req.headers.get("user-agent") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const region = req.headers.get("x-vercel-ip-country-region") || null;
  const city = req.headers.get("x-vercel-ip-city") || null;

  const first_touch =
    Object.keys(utm).length || Object.keys(partner_ids).length || referrer
      ? { ...utm, ...partner_ids, referrer }
      : null;

  const nowIso = new Date().toISOString();

  try {
    await withClient(client_key, async (tx) => {
      // Journey upsert. ON CONFLICT DO UPDATE preserves first_seen/first_touch via
      // EXCLUDED-bypass and only refreshes last_seen, last_touch, vertical (if given),
      // and last_identity_key. Matches the original two-branch semantics in one
      // statement and a single round-trip.
      const firstTouchParam = first_touch ? tx.json(first_touch) : null;
      await tx`
        INSERT INTO chapter_journey.journeys (
          id, client_key, vertical, first_seen, last_seen,
          first_touch, last_touch, user_agent, country, region, city,
          last_identity_key
        ) VALUES (
          ${journey_id}, ${client_key}, ${vertical}, ${nowIso}, ${nowIso},
          ${firstTouchParam}::jsonb, ${firstTouchParam}::jsonb,
          ${ua}, ${country}, ${region}, ${city},
          ${identity_key}
        )
        ON CONFLICT (id) DO UPDATE SET
          last_seen = EXCLUDED.last_seen,
          last_touch = EXCLUDED.last_touch,
          vertical = COALESCE(EXCLUDED.vertical, chapter_journey.journeys.vertical),
          last_identity_key = EXCLUDED.last_identity_key
      `;

      // identity_links upsert (matches Phase 4 of /api/identify).
      if (identity_key) {
        const traits =
          payload?.traits && typeof payload.traits === "object" ? payload.traits : null;
        const traitsParam = traits ? tx.json(traits) : null;
        await tx`
          INSERT INTO chapter_identity.identity_links
            (client_key, identity_key, journey_id, first_linked_at, last_linked_at, traits)
          VALUES (${client_key}, ${identity_key}, ${journey_id}, ${nowIso}, ${nowIso}, ${traitsParam}::jsonb)
          ON CONFLICT (client_key, identity_key, journey_id)
          DO UPDATE SET
            last_linked_at = EXCLUDED.last_linked_at,
            traits = COALESCE(EXCLUDED.traits, chapter_identity.identity_links.traits)
        `;
      }

      // pixel_events INSERT (the main event row).
      const utmParam = Object.keys(utm).length ? tx.json(utm) : null;
      const partnerParam = Object.keys(partner_ids).length ? tx.json(partner_ids) : null;
      const propsParam = payload?.props ? tx.json(payload.props) : null;
      await tx`
        INSERT INTO chapter_ingest.pixel_events (
          ts, client_key, journey_id, identity_key, event_name,
          page_url, page_path, referrer,
          utm, partner_ids, props,
          consent_status, consent_mode, consent_ts
        ) VALUES (
          ${nowIso}, ${client_key}, ${journey_id}, ${identity_key || null}, ${event_name},
          ${page_url}, ${page_path}, ${referrer},
          ${utmParam}::jsonb, ${partnerParam}::jsonb, ${propsParam}::jsonb,
          ${effective_consent}, ${effective_mode}, ${effective_consent_ts}
        )
      `;
    });
  } catch (err) {
    console.error("pixel write phase failed:", err);
    // Fall through — return 204 + cookies anyway. Losing one pixel event is
    // less bad than the browser retrying and amplifying DB load.
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Offline seed matching — only for deterministic identities + opt-in.
  // ---------------------------------------------------------------------------
  if (isDeterministicIdentityKey(identity_key) && effective_consent === "opt_in") {
    try {
      await withClient(client_key, async (tx) => {
        const seeds = await tx<{
          source_type: string | null;
          source_id: string | null;
          seed_ts: string | null;
          metadata: any;
          identity_type: string | null;
          is_hashed: boolean | null;
        }[]>`
          SELECT source_type, source_id, seed_ts, metadata, identity_type, is_hashed
          FROM chapter_ingest.offline_identity_seeds
          WHERE client_key = ${client_key} AND identity_key = ${identity_key}
          LIMIT 25
        `;
        if (seeds.length === 0) return;

        // Insert one milestone row per matched seed.
        // Note: offline_milestones has no uniqueness constraint beyond PK, so
        // duplicate seed matches on repeat pixel events will accumulate. This
        // mirrors the original behavior (the prior code's 23505 catch was dead
        // because no constraint to violate). Out of scope for the RLS migration;
        // revisit if seed-match deduplication becomes a real reporting issue.
        for (const s of seeds) {
          const kind = s.metadata?.kind || "outside";
          const metaParam = s.metadata ? tx.json(s.metadata) : null;
          await tx`
            INSERT INTO chapter_ingest.offline_milestones (
              client_key, identity_key, milestone_name, milestone_ts,
              value, currency, source_type, source_id, metadata,
              identity_type, is_hashed
            ) VALUES (
              ${client_key}, ${identity_key},
              ${s.source_type || `offline_${kind}_seed_match`},
              ${s.seed_ts || nowIso},
              ${null}, ${null}, ${s.source_type}, ${s.source_id}, ${metaParam}::jsonb,
              ${s.identity_type}, ${s.is_hashed}
            )
          `;
        }
      });
    } catch (err) {
      console.error("offline seed match phase failed:", err);
    }
  }

  // Response.
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(cookieName, journey_id, {
    httpOnly: false, secure: true, sameSite: "none", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set(anonCookieName, anon_id, {
    httpOnly: false, secure: true, sameSite: "none", path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
