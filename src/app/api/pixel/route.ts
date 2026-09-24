import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";
import { hasGpcHeader } from "@/app/lib/consent/gpc";
import { isCollectionEnabled } from "@/app/lib/consent/collection-switch";
import { getConsentPolicyConfig, consentDefaultToMode } from "@/app/lib/consent/consent-config";

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

// ---------------------------------------------------------------------------
// W1: batch intake.
//
// The pixel may POST either
//   (a) today's single-event shape: { client_key, event_name, page_url, ... }
//   (b) a batch:                    { client_key, events: [ {event_name, ...}, ... ] }
//
// Both are NORMALISED TO A LIST OF ONE OR MORE before anything else happens, so
// there is exactly ONE code path. That is what makes "batched and unbatched
// produce identical rows" a structural property rather than something that has
// to be chased in testing — do not add a second branch for single events.
//
// SESSION-level fields (client_key, anonymous_id, journey_id, vertical, the
// fallback identity_key, consent_mode) are read from the TOP LEVEL. In the
// single-event shape the payload IS the event, so the same reads resolve to the
// same values they always did.
//
// PER-EVENT fields (event_name, page_url/path, referrer, utm, partner_ids,
// props, traits, event_ts, _replay, consent_status/mode/ts, and an optional
// identity_key override) are read off each entry.
// ---------------------------------------------------------------------------
const MAX_BATCH_EVENTS = 100; // matches the pixel's localStorage buffer cap
const INSERT_CHUNK = 25; // rows per multi-row INSERT statement

type PreparedEvent = {
  event_name: string;
  identity_key: string;
  page_url: string | null;
  page_path: string | null;
  referrer: string | null;
  utm: Record<string, any>;
  partner_ids: Record<string, any>;
  props: any;
  traits: any;
  event_ts: string;
  first_touch: Record<string, any> | null;
  consent_status: "opt_in" | "opt_out" | "unknown";
  consent_mode: "opt_in" | "opt_out";
  consent_ts: string | null;
};

export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = String(payload?.client_key || "").trim();

  if (payload?.internal_ignore === true) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });

  // Normalise to a list. An `events` array that is present but not an array, or
  // empty, is treated as "no valid event" below — same 400 as a single event
  // with no event_name.
  const rawEvents: any[] = Array.isArray(payload?.events) ? payload.events : [payload];
  if (rawEvents.length > MAX_BATCH_EVENTS) {
    console.warn(
      `[pixel] batch of ${rawEvents.length} exceeds cap ${MAX_BATCH_EVENTS} for ${client_key}; truncating`,
    );
    rawEvents.length = MAX_BATCH_EVENTS;
  }

  // Validation mirrors the single-event contract exactly: 400 only when NO
  // event in the request is usable. A batch with one malformed entry still
  // writes the rest rather than discarding the whole flush.
  const namedEvents = rawEvents.filter(
    (e) => e && String(e?.event_name || "").trim().length > 0,
  );
  if (namedEvents.length === 0) {
    return NextResponse.json({ error: "Missing event_name" }, { status: 400 });
  }

  if (!isKnownClient(client_key)) {
    return NextResponse.json({ error: "unknown_client" }, { status: 400 });
  }

  // Client-level kill switch. chapter_config.clients.collection_enabled=false is a
  // hard stop — no event/identity writes, no new-identifier cookies. Cached 5 min;
  // fail-open (a config-read error keeps collection on). Flip back to true to resume.
  if (!(await isCollectionEnabled(client_key))) {
    return new NextResponse(null, { status: 204 });
  }

  // ── Session-level identity ────────────────────────────────────────────────
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

  // Prefix raw UUIDs with 'anonymous_id:' so pixel identities share format with
  // redirect-minted identities (`anonymous_id:<uuid>` per src/app/lib/redirect/
  // identity.ts). Without this, pixel identities and redirect identities can
  // never share a canonical even when they're the same visitor. Callers that
  // pass an explicit deterministic identity_key (email_sha256:*, phone_sha256:*,
  // shopify_customer_id:*, etc.) bypass wrapping.
  const identity_key = incomingIdentityKey || `anonymous_id:${anon_id}`;

  const vertical = payload?.vertical ? String(payload.vertical).trim() : null;

  // Compute shared-apex for cookie domain so pixel + redirect subdomains can
  // share cookies. For NSC (1P): pixel is on notsocavalier.com, collect route
  // is on chapter.notsocavalier.com. Setting Domain=.notsocavalier.com makes
  // the cookie visible on both. Without this, pixel-side identity and redirect-
  // side identity fragment into separate anonymous_ids for the same visitor.
  const reqHost = req.nextUrl.hostname;
  const isLocalReq = reqHost === "localhost" || reqHost.startsWith("127.");
  const cookieApex = (() => {
    if (isLocalReq) return undefined;
    const parts = reqHost.split(".");
    if (parts.length <= 2) return reqHost;
    // Strip leftmost subdomain: chapter.notsocavalier.com → notsocavalier.com
    return parts.slice(1).join(".");
  })();
  const cookieDomain = cookieApex ? `.${cookieApex}` : undefined;

  const cookieName = `up_journey_${client_key}`;
  const existing = req.cookies.get(cookieName)?.value || null;

  const incomingJourneyId =
    payload?.journey_id && /^[0-9a-fA-F-]{36}$/.test(String(payload.journey_id).trim())
      ? String(payload.journey_id).trim()
      : null;

  const journey_id =
    incomingJourneyId ||
    (existing && /^[0-9a-fA-F-]{36}$/.test(existing) ? existing : randomUUID());

  const headerReferrer = req.headers.get("referer") || null;

  // ---------------------------------------------------------------------------
  // Phase 1: Consent gate — read existing journey consent state ONCE per request.
  // The per-event evaluation below reuses it; a batch must not turn one consent
  // read into N reads.
  // ---------------------------------------------------------------------------
  const client_default_mode = consentDefaultToMode(
    (await getConsentPolicyConfig(client_key)).consentDefault,
  );

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
    // Stay at defaults; the write phase will INSERT the journey row.
  }

  const gpc = hasGpcHeader(req);
  const nowIso = new Date().toISOString();

  // W0c clamp bounds. A fresh event is transmitted immediately, so it can only
  // be seconds old — anything older is a wrong clock, not a real delay. A REPLAY
  // from the localStorage buffer can legitimately be days old. The two are
  // indistinguishable server-side, so the PIXEL tells us which it is (`_replay`),
  // and only replays get the generous past window. This keeps a badly-skewed
  // device clock from silently backdating live events into an earlier
  // attribution window. Out-of-window values FALL BACK to receipt time rather
  // than being clamped to the boundary — a clamped value would silently inject a
  // wrong timestamp into a real attribution window, which is worse than being
  // honestly late.
  //
  //   ts          = when the event HAPPENED   (client-controlled)
  //   ingested_at = when Chapter RECEIVED it  (DB DEFAULT now(), untouched)
  //
  // Only safe because W0b moved the attribution chain's new-work DETECTION onto
  // ingested_at. Do not repoint detection back at ts.
  const CLIENT_TS_MAX_FUTURE_MS = 5 * 60 * 1000; // clock skew ahead, both cases
  const CLIENT_TS_MAX_PAST_FRESH_MS = 5 * 60 * 1000; // live event: tight
  const CLIENT_TS_MAX_PAST_REPLAY_MS = 7 * 24 * 60 * 60 * 1000; // buffered: generous

  function resolveEventTs(raw: any, isReplay: boolean): string {
    if (!raw) return nowIso; // pre-W0c pixel, or a non-pixel caller
    const parsed = Date.parse(String(raw));
    if (!Number.isFinite(parsed)) return nowIso;
    const skew = parsed - Date.now();
    const maxPast = isReplay ? CLIENT_TS_MAX_PAST_REPLAY_MS : CLIENT_TS_MAX_PAST_FRESH_MS;
    if (skew > CLIENT_TS_MAX_FUTURE_MS || skew < -maxPast) return nowIso;
    return new Date(parsed).toISOString();
  }

  // ---------------------------------------------------------------------------
  // CONSENT IS EVALUATED PER EVENT, IN ORDER — never once per batch.
  //
  // `runningConsent` starts at the journey's stored state and carries forward,
  // which reproduces the sticky-opt_out rule inside a flush: once a visitor
  // signals opt_out partway through a buffered batch, every later event in that
  // same batch is dropped too. Unbatched, that visitor's later events would not
  // have been sent at all (the pixel's own gate stops them), so stickiness here
  // is what keeps batched and unbatched behaviour aligned. An opt_in appearing
  // after an opt_out cannot re-enable collection — same as today, where an
  // opt_out on the journey row is sticky.
  // ---------------------------------------------------------------------------
  let runningConsent: "opt_in" | "opt_out" | "unknown" = db_consent;
  const prepared: PreparedEvent[] = [];

  for (const ev of namedEvents) {
    let ec = runningConsent;
    const evConsentIn = String(ev?.consent_status ?? payload?.consent_status ?? "unknown");
    if (ec !== "opt_out" && (evConsentIn === "opt_in" || evConsentIn === "opt_out")) {
      ec = evConsentIn as "opt_in" | "opt_out";
    }
    // GPC: a browser opt-out signal (Sec-GPC: 1) forces opt_out unless the
    // visitor has explicitly opted in (already folded in above). Header-level,
    // so it applies to every event in the request. Defense-in-depth for the
    // pixel's own client-side GPC handling (and covers stripped payloads).
    if (gpc && ec !== "opt_in") ec = "opt_out";
    runningConsent = ec;

    const evModeRaw = ev?.consent_mode ?? payload?.consent_mode;
    const evMode: "opt_in" | "opt_out" =
      evModeRaw === "opt_in" || evModeRaw === "opt_out"
        ? evModeRaw
        : (db_consent_mode ?? client_default_mode);

    const should_track = ec === "opt_in" || (ec === "unknown" && evMode === "opt_out");
    if (!should_track) continue;

    const page_url = ev?.page_url ? String(ev.page_url) : null;
    const page_path = ev?.page_path ? String(ev.page_path) : null;
    const referrer = ev?.referrer ? String(ev.referrer) : headerReferrer;

    const derived = page_url ? getUtmFromUrl(page_url) : { utm: null, partner_ids: null };
    const utm = cleanNulls({ ...(derived.utm || {}), ...(ev?.utm || {}) });
    const partner_ids = cleanNulls({
      ...(derived.partner_ids || {}),
      ...(ev?.partner_ids || {}),
    });

    const evIdentityRaw =
      ev?.identity_key && String(ev.identity_key).trim()
        ? String(ev.identity_key).trim()
        : null;

    const evConsentTsRaw = ev?.consent_ts ?? payload?.consent_ts;

    prepared.push({
      event_name: String(ev.event_name).trim(),
      // A batch can straddle an identify() call, so each event may carry its own
      // identity_key; it falls back to the session-level one. In the
      // single-event shape this resolves to exactly the value it always did.
      identity_key: evIdentityRaw ?? identity_key,
      page_url,
      page_path,
      referrer,
      utm,
      partner_ids,
      props: ev?.props ?? null,
      traits: ev?.traits && typeof ev.traits === "object" ? ev.traits : null,
      event_ts: resolveEventTs(ev?.event_ts, ev?._replay === true),
      first_touch:
        Object.keys(utm).length || Object.keys(partner_ids).length || referrer
          ? { ...utm, ...partner_ids, referrer }
          : null,
      consent_status: ec,
      consent_mode: evMode,
      consent_ts:
        (evConsentTsRaw ? String(evConsentTsRaw) : null) ??
        db_consent_ts ??
        (ec === "unknown" ? null : nowIso),
    });
  }

  if (prepared.length === 0) {
    // opt_out (explicit, sticky-from-journey, or GPC) for every event in the
    // request: no writes AND no new identifiers. Existing cookies are NOT
    // cleared (that's the consent banner's job on the property where the visitor
    // opted out). Matches the /r redirect path — neither issues identifiers on
    // opt_out.
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  // ---------------------------------------------------------------------------
  // Phase 2: Atomic write — ONE journey upsert + one identity upsert per distinct
  // identity + one multi-row pixel_events INSERT, all in a single transaction.
  //
  // This is the whole point of W1: EOS fires ~8 events per pageview and every one
  // of them used to upsert the SAME journey row in its own transaction, so they
  // serialised behind each other's row lock. That single statement was measured
  // at 74.5% of all database execution time. A batch collapses those 8 competing
  // writes into 1.
  // ---------------------------------------------------------------------------
  const ua = req.headers.get("user-agent") || null;
  const country = req.headers.get("x-vercel-ip-country") || null;
  const region = req.headers.get("x-vercel-ip-country-region") || null;
  const city = req.headers.get("x-vercel-ip-city") || null;

  // Events arrive in capture order, so the earliest carries the journey's
  // first_touch and the latest its last_touch. For a single event these are the
  // same object, which is exactly what the route did before.
  const firstTouch = prepared.find((e) => e.first_touch !== null)?.first_touch ?? null;
  const lastTouch =
    [...prepared].reverse().find((e) => e.first_touch !== null)?.first_touch ?? null;

  // Distinct identities across the batch, in first-seen order. Usually one.
  const identityRows = new Map<string, any>();
  for (const e of prepared) {
    if (!identityRows.has(e.identity_key)) identityRows.set(e.identity_key, e.traits);
    else if (e.traits && !identityRows.get(e.identity_key)) {
      identityRows.set(e.identity_key, e.traits);
    }
  }

  try {
    await withClient(client_key, async (tx) => {
      // Journey upsert. ON CONFLICT DO UPDATE preserves first_seen/first_touch via
      // EXCLUDED-bypass and only refreshes last_seen, last_touch, vertical (if given),
      // and last_identity_key.
      const firstTouchParam = firstTouch ? tx.json(firstTouch) : null;
      const lastTouchParam = lastTouch ? tx.json(lastTouch) : null;
      const lastIdentity = prepared[prepared.length - 1].identity_key;
      await tx`
        INSERT INTO chapter_journey.journeys (
          id, client_key, vertical, first_seen, last_seen,
          first_touch, last_touch, user_agent, country, region, city,
          last_identity_key
        ) VALUES (
          ${journey_id}, ${client_key}, ${vertical}, ${nowIso}, ${nowIso},
          ${firstTouchParam}::jsonb, ${lastTouchParam}::jsonb,
          ${ua}, ${country}, ${region}, ${city},
          ${lastIdentity}
        )
        ON CONFLICT (id) DO UPDATE SET
          last_seen = EXCLUDED.last_seen,
          last_touch = EXCLUDED.last_touch,
          vertical = COALESCE(EXCLUDED.vertical, chapter_journey.journeys.vertical),
          last_identity_key = EXCLUDED.last_identity_key,
          -- COALESCE-update UA + geo: backfills if the row was created with
          -- nulls (e.g. by the Tier 1 redirect click logger), but doesn't
          -- overwrite if a previous pixel event already set them. Matters for
          -- bot classification + device reporting on redirect-originated
          -- journeys whose first event was the server-side redirect_click.
          user_agent = COALESCE(chapter_journey.journeys.user_agent, EXCLUDED.user_agent),
          country = COALESCE(chapter_journey.journeys.country, EXCLUDED.country),
          region = COALESCE(chapter_journey.journeys.region, EXCLUDED.region),
          city = COALESCE(chapter_journey.journeys.city, EXCLUDED.city)
      `;

      for (const [idKey, traits] of identityRows) {
        // identity_links upsert (matches Phase 4 of /api/identify).
        const traitsParam = traits ? tx.json(traits) : null;
        await tx`
          INSERT INTO chapter_identity.identity_links
            (client_key, identity_key, journey_id, first_linked_at, last_linked_at, traits)
          VALUES (${client_key}, ${idKey}, ${journey_id}, ${nowIso}, ${nowIso}, ${traitsParam}::jsonb)
          ON CONFLICT (client_key, identity_key, journey_id)
          DO UPDATE SET
            last_linked_at = EXCLUDED.last_linked_at,
            traits = COALESCE(EXCLUDED.traits, chapter_identity.identity_links.traits)
        `;

        // Self-canonical: ensure the pixel identity exists in identity_canon
        // so downstream canonical_v1 chain classification can find it. Without
        // this, pixel identities stay orphan-canonical (never populate canon
        // unless an alias is inserted for them). Idempotent via ON CONFLICT.
        await tx`
          INSERT INTO chapter_identity.identity_canon
            (client_key, identity_key, canonical_identity_key, updated_at)
          VALUES (${client_key}, ${idKey}, ${idKey}, ${nowIso})
          ON CONFLICT (client_key, identity_key) DO NOTHING
        `;
      }

      // pixel_events multi-row INSERT, chunked so the composed VALUES fragment
      // stays shallow. Column list + casts are byte-identical to the
      // single-row form, so a batched row and an unbatched row are the same row.
      for (let i = 0; i < prepared.length; i += INSERT_CHUNK) {
        const chunk = prepared.slice(i, i + INSERT_CHUNK);
        const rowFragments = chunk.map((e) => {
          const utmParam = Object.keys(e.utm).length ? tx.json(e.utm) : null;
          const partnerParam = Object.keys(e.partner_ids).length
            ? tx.json(e.partner_ids)
            : null;
          const propsParam = e.props ? tx.json(e.props) : null;
          return tx`(
            ${e.event_ts}, ${client_key}, ${journey_id}, ${e.identity_key}, ${e.event_name},
            ${e.page_url}, ${e.page_path}, ${e.referrer},
            ${utmParam}::jsonb, ${partnerParam}::jsonb, ${propsParam}::jsonb,
            ${e.consent_status}, ${e.consent_mode}, ${e.consent_ts}
          )`;
        });
        const values = rowFragments.reduce((acc: any, frag: any) => tx`${acc}, ${frag}`);
        await tx`
          INSERT INTO chapter_ingest.pixel_events (
            ts, client_key, journey_id, identity_key, event_name,
            page_url, page_path, referrer,
            utm, partner_ids, props,
            consent_status, consent_mode, consent_ts
          ) VALUES ${values}
        `;
      }
    });
  } catch (err) {
    console.error("pixel write phase failed:", err);
    // Fall through — return 204 + cookies anyway. Losing one flush is less bad
    // than the browser retrying and amplifying DB load.
  }

  // ---------------------------------------------------------------------------
  // Phase 3: Offline seed matching — only for deterministic identities + opt-in.
  // Runs once per distinct qualifying identity in the batch (usually zero or one).
  // ---------------------------------------------------------------------------
  const seedIdentities = Array.from(
    new Set(
      prepared
        .filter(
          (e) => e.consent_status === "opt_in" && isDeterministicIdentityKey(e.identity_key),
        )
        .map((e) => e.identity_key),
    ),
  );

  if (seedIdentities.length > 0) {
    try {
      await withClient(client_key, async (tx) => {
        for (const idKey of seedIdentities) {
          // The seed table carries TWO key conventions in the wild, and this lookup
          // must match both:
          //   - PREFIXED (`email_sha256:<hash>`) — written by /api/offline and the
          //     Sprint 6 CSV uploader.
          //   - BARE sha256 (no prefix; type carried in identity_type/is_hashed) —
          //     written by the n8n CRM bridge, which writes DIRECT to Postgres and so
          //     never passes through this route's convention.
          // idKey is ALWAYS prefixed (isDeterministicIdentityKey gates on a prefix), so
          // before this, a bare-key seed could never match: the CRM seeding leg had
          // minted exactly zero milestones since it was built. Verified Sep 24, 2026 —
          // adsforgood_prod had 136 bare seeds and 0 seed-matched milestones.
          // The bare branch is additionally guarded on identity_type so an email hash
          // can never match a phone seed; for any other prefix bareType is null and
          // `identity_type = NULL` yields NULL (not true), so the branch is skipped.
          const sep = idKey.indexOf(":");
          const bareKey = sep > 0 ? idKey.slice(sep + 1) : null;
          const bareType = idKey.startsWith("email_sha256:")
            ? "email"
            : idKey.startsWith("phone_sha256:")
              ? "phone"
              : null;
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
            WHERE client_key = ${client_key}
              AND (
                identity_key = ${idKey}
                OR (identity_key = ${bareKey} AND is_hashed AND identity_type = ${bareType})
              )
            LIMIT 25
          `;
          if (seeds.length === 0) continue;

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
                ${client_key}, ${idKey},
                ${s.source_type || `offline_${kind}_seed_match`},
                ${s.seed_ts || nowIso},
                ${null}, ${null}, ${s.source_type}, ${s.source_id}, ${metaParam}::jsonb,
                ${s.identity_type}, ${s.is_hashed}
              )
            `;
          }
        }
      });
    } catch (err) {
      console.error("offline seed match phase failed:", err);
    }
  }

  // Response.
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(cookieName, journey_id, {
    domain: cookieDomain, httpOnly: false,
    secure: !isLocalReq, sameSite: isLocalReq ? "lax" : "none",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  res.cookies.set(anonCookieName, anon_id, {
    domain: cookieDomain, httpOnly: false,
    secure: !isLocalReq, sameSite: isLocalReq ? "lax" : "none",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  });
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
