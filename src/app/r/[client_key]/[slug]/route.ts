// Tier 1 first-party redirect endpoint.
//
// URL shape:
//   /r/<client_key>/<slug>?utm_source=...&utm_campaign=...&to=https://...
//
// What happens on each click:
//   1. Resolve identity (cookies) + mint journey if first hit
//   2. Build eval context (geo + device + segments + cart + ab experiments + query)
//   3. Fetch enabled rules for (client_key, slug), priority-ordered
//   4. First rule whose condition_jsonb matches the context wins
//   5. Interpolate that rule's destination_template (or fall back to ?to= param)
//   6. Fire-and-forget click insert into pixel_events
//   7. 302 with identity/journey cookies set
//
// LATENCY. This is a navigation-BLOCKING path — the reader stares at a blank
// tab until the 302 ships — so the budget is 50ms and it is enforced by four
// rules, in order of how much they matter:
//
//   1. Don't fetch what no rule reads. The visitor-history lookups
//      (resolveSegments / resolveCart) run ONLY when some enabled rule on the
//      slug declares it needs them — see requiredContext() in conditions.ts.
//      Measured Sep 2026: they were ~2-3 serial cross-region round trips on
//      every click, for conditions that did not exist on any enabled rule.
//   2. This route deliberately does NOT run next to the database, and that is
//      the opposite of the rest of the project — see the region note below
//      rule 4. It only holds while rule 1 holds.
//   3. Fetch independent things together, not in sequence. PHASE 1 below is one
//      Promise.all; anything added to this route that doesn't depend on the
//      rule list belongs in it, NOT as a fresh `await`.
//   4. Never block on a write. Click log, hit_count, identity stitch and the
//      Google Ads conversion all run in after(), post-302.
//
// Everything else is already free: geo comes from Vercel headers, device from
// a UA regex, identity from cookies. Per-client config (rules, AB experiments,
// consent policy, ignore lists) is 5-min in-process cached, so a warm lambda
// serving a catch-all rule does ZERO blocking DB work.
//
// What this endpoint does NOT do:
//   - Authentication: the endpoint is intentionally public (it serves end users)
//   - HMAC: clicks aren't signed; signature wouldn't add anything since the
//     request comes from a browser following a link
//   - Rate limiting: handled at the Vercel edge level

import { NextRequest, NextResponse, after } from "next/server";
import { fetchRules, fetchAbExperiments, fetchClientRedirectConfig, incrementRuleHitCount } from "@/app/lib/redirect/rules";
import { resolveIdentity, applyIdentityCookies } from "@/app/lib/redirect/identity";
import { applyEntryRelayCookie, hasInboundAttribution, pickClickId } from "@/app/lib/redirect/entry-relay";
import { readEntryClick, fetchGadsConfig, recordGadsConversion } from "@/app/lib/redirect/gads-conversion";
import { resolveGeo } from "@/app/lib/redirect/geo";
import { classifyUA } from "@/app/lib/redirect/device";
import { resolveSegments, SKIPPED_SEGMENTS } from "@/app/lib/redirect/segments";
import { resolveCart, SKIPPED_CART } from "@/app/lib/redirect/cart";
import { evaluateConditions, requiredContext, EvalContext } from "@/app/lib/redirect/conditions";
import { interpolateTemplate, isValidDestination, appendIdentityHandoff } from "@/app/lib/redirect/template";
import { logRedirectClick } from "@/app/lib/redirect/click-logger";
import { isEmailIgnored, isUaIgnored } from "@/app/lib/auth/tracking-ignore";
import { readConsentState, applyConsentPolicy } from "@/app/lib/redirect/consent";
import { isCollectionEnabled } from "@/app/lib/consent/collection-switch";
import { getConsentPolicyConfig } from "@/app/lib/consent/consent-config";
import { hasGpcHeader } from "@/app/lib/consent/gpc";
import { extractEmailHint, stripHintParams } from "@/app/lib/redirect/email-hint";
import { resolveRecipientToken } from "@/app/lib/redirect/recipient-lookup";
import { stitchIdentity } from "@/app/lib/redirect/identity-stitch";
import { classifyForScannerRisk } from "@/app/lib/redirect/scanner-detection";
import { logAuthAttempt } from "@/app/lib/audit/auth";

export const dynamic = "force-dynamic";

// REGION — this route is pinned to iad1 (Virginia) in vercel.json, while every
// other function in the project runs in pdx1 (Oregon) next to Supabase.
// That inversion is deliberate and it is conditional:
//
//   Supabase is us-west-2, so almost everything here benefits from running in
//   Oregon — one cross-country round trip measured ~150-300ms (/api/health,
//   which is a bare `select 1`, took 200-410ms from iad1).
//
//   This route is the exception because of rule 1 above: on a warm lambda with
//   catch-all rules it makes ZERO blocking DB calls, so it has no round trips
//   to shorten — while its readers are overwhelmingly east-coast (measured
//   Sep 2026: acj_today 100% east, not_so_cavalier ~98% east; both are
//   Philadelphia-area). Moving it west would cost every click ~50-70ms of
//   user->function latency and save nothing.
//
// IF YOU ADD A BLOCKING DB CALL BACK TO THE PRE-302 PATH, THIS PIN BECOMES
// WRONG and nothing will tell you. Re-measure, and consider dropping the
// vercel.json override so the route inherits pdx1 like everything else.
//
// (An earlier attempt used a `preferredRegion` route-segment export here. It is
// inert on the Node runtime — verified by 10 minutes of polling after deploy,
// region never left iad1. Region for Node functions comes from vercel.json.)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ client_key: string; slug: string }> }
) {
  const { client_key, slug } = await params;
  if (!client_key || !slug) {
    return new NextResponse("not_found", { status: 404 });
  }

  // Parse query params into a flat object.
  const rawQuery: Record<string, string> = {};
  for (const [k, v] of req.nextUrl.searchParams.entries()) {
    rawQuery[k] = v;
  }

  // Extract identity hint (?rh / ?rid / ?re) BEFORE stripping. Solution 2 of
  // the cross-device stitching plan. Hint params are stripped from the
  // forwarded URL + click log immediately after extraction so PII never
  // propagates beyond this server.
  const emailHint = extractEmailHint(rawQuery);
  const query = stripHintParams(rawQuery);

  const identity = resolveIdentity(req, client_key);
  const geo = resolveGeo(req);
  const device = classifyUA(req.headers.get("user-agent"));
  const referrer = req.headers.get("referer");
  // Consent gate: always-on, derived from `chapter_consent` cookie on this
  // apex (+ GPC). Visitor still gets routed to the right destination; we just
  // skip every write (click log + cookie issuance) when collection is denied.
  // Raw state now; policy default (us vs eu) is applied after the per-client
  // config resolves in PHASE 1 below.
  const consentState = readConsentState(req);

  // Bot fast-path: never log bot clicks, redirect to default destination with
  // no further processing. Saves the entire 50ms budget for actual humans.
  if (device.device_type === "bot") {
    const defaultDest = query.to;
    if (defaultDest && isValidDestination(defaultDest)) {
      return NextResponse.redirect(defaultDest, { status: 302 });
    }
    return new NextResponse("not_found", { status: 404 });
  }

  // ── PHASE 1: everything that does NOT depend on which rules exist ────────
  //
  // All seven are per-CLIENT (not per-visitor) and 5-min in-process cached, so on
  // a warm lambda this whole batch costs zero network. clientConfig and the two
  // ignore-list checks used to sit AFTER the batch as separate awaits, which
  // made them serial round trips on a cold lambda for no reason — nothing here
  // depends on anything else here.
  const userAgent = req.headers.get("user-agent");
  const [rules, abExperiments, collectionEnabled, policyCfg, clientConfig, uaIgnored, hintEmailIgnored] =
    await Promise.all([
      fetchRules(client_key, slug),
      fetchAbExperiments(client_key),
      isCollectionEnabled(client_key),
      getConsentPolicyConfig(client_key),
      // Hoisted: drives BOTH the destination fallback chain and the ?chid=
      // handoff gate below, and it is a 5-min cache, so one lookup serves both.
      fetchClientRedirectConfig(client_key),
      isUaIgnored(client_key, userAgent),
      // Token-flavored hints can't be checked here (they need a DB resolve);
      // those are re-checked at resolution time inside the after() block.
      emailHint && emailHint.source !== "token"
        ? isEmailIgnored(client_key, emailHint.email_sha256)
        : Promise.resolve(false),
    ]);

  // ── PHASE 2: visitor-history lookups, ONLY if a rule actually reads them ──
  //
  // resolveSegments and resolveCart are the two genuinely expensive calls on
  // this path — per-VISITOR, so the segment cache misses for every new reader,
  // and resolveCart has no cache at all. Between them that was ~2-3 sequential
  // cross-region round trips on EVERY click.
  //
  // requiredContext() (conditions.ts) reads the SAME registry the evaluators
  // are dispatched from, so the two can't drift: a rule that asks about carts
  // gets cart data, and a rule that doesn't costs nothing. Today every enabled
  // rule across every client is a catch-all ({}), so in practice this skips
  // both — but the moment someone writes `has_open_cart`, that slug starts
  // paying for it again automatically, with no code change.
  const needs = requiredContext(rules.map((r) => r.condition_jsonb));
  const [segments, cart] = await Promise.all([
    needs.segments
      ? resolveSegments(client_key, identity.identityKey)
      : Promise.resolve(SKIPPED_SEGMENTS),
    needs.cart
      ? resolveCart(client_key, identity.identityKey)
      : Promise.resolve(SKIPPED_CART),
  ]);

  // Apply the per-client jurisdiction default (us = collect-when-unknown,
  // eu = strict opt-in-only). Explicit opt_in/opt_out always wins over this.
  let consent = applyConsentPolicy(
    consentState,
    policyCfg.consentDefault === "strict" ? "opt_out" : "opt_in",
  );
  // Kill switch: collection_enabled=false behaves like opt_out (no writes, no
  // cookies) — the visitor is still routed to their destination.
  if (!collectionEnabled) consent = { ...consent, allowCollection: false };

  const ctx: EvalContext = {
    client_key,
    identityKey: identity.identityKey,
    query,
    referrer,
    now: new Date(),
    geo,
    device,
    segments,
    cart,
    abExperiments,
  };

  // Walk rules priority-ascending, first match wins.
  let matchedRuleId: string | null = null;
  let destination: string | null = null;
  for (const rule of rules) {
    if (evaluateConditions(rule.condition_jsonb, ctx)) {
      matchedRuleId = rule.id;
      destination = interpolateTemplate(rule.destination_template, ctx);
      break;
    }
  }

  // Fallback chain: ?to= query param → client-level default → 404.
  //
  // Client-level default (default_redirect_destination on chapter_config.clients)
  // is the safety net that prevents 404s on unmatched-rule paths. Set once per
  // client (e.g. https://eosfabrics.com for eos_fabrics) — any /r/<client>/<slug>
  // that misses every rule + has no ?to= param falls back to it. Per-slug
  // catch-alls still override when the slug's specific fallback should differ
  // from the client-wide default.
  // clientConfig is resolved in PHASE 1 above (it feeds both this fallback
  // chain and the ?chid= handoff gate further down).
  if (!destination || !isValidDestination(destination)) {
    const fallback = query.to;
    if (fallback && isValidDestination(fallback)) {
      destination = fallback;
    } else {
      if (
        clientConfig.default_redirect_destination &&
        isValidDestination(clientConfig.default_redirect_destination)
      ) {
        destination = clientConfig.default_redirect_destination;
      } else {
        console.warn(`[redirect] no destination for ${client_key}/${slug}; rules=${rules.length}`);
        return new NextResponse("not_found", { status: 404 });
      }
    }
  }

  // Tracking-ignore suppression. Two layers:
  //   1. UA substring match → skip ALL writes (click log + email-hint stitch).
  //      Lets operators mute known bot UAs (e.g. GoogleHypersonic) or QA tools
  //      without affecting the visitor's 302.
  //   2. Email-hint match — handled inside the after() block at the resolution
  //      point (token-flavored hints aren't resolved synchronously here).
  // Visitor still gets routed to their destination; we just don't persist them.
  // uaIgnored + hintEmailIgnored are resolved in PHASE 1 above.
  const suppressed = uaIgnored || hintEmailIgnored;

  // Scanner-risk classification (email security scanners like Proofpoint /
  // Mimecast / Microsoft Safe Links click every email link before the human
  // opens it). Suspicious clicks still get logged (with a tag) but don't
  // pollute the identity graph — no cookie writes, no email-hint stitch, no
  // ?chid= handoff on the destination.
  const scannerRisk = classifyForScannerRisk(req);
  const scannerSuspected = scannerRisk.suspicious && !suppressed;

  // Wrapped-link consented-channel measurement (policy flag, default off).
  // When a GPC-driven opt-out visitor clicks an ESP-wrapped link carrying a
  // recipient token (?rid/?rh/?re), that token proves they subscribed to that
  // channel. With esp_link_click_attribution on, we MEASURE that one click
  // (log it + stitch to the known subscriber) but STOP at the browser — no
  // cookies, no ?chid handoff, no entry-relay (those stay under allowCollection).
  // Guards: applies ONLY to GPC-driven opt-out (not an explicit opt_out cookie,
  // not the kill switch), and only when a recipient token is present.
  const explicitOptOutCookie = req.cookies.get("chapter_consent")?.value === "opt_out";
  const gpcDrivenOptOut =
    !consent.allowCollection &&
    hasGpcHeader(req) &&
    !explicitOptOutCookie &&
    collectionEnabled;
  const allowConsentedMeasurement =
    policyCfg.espLinkClickAttribution &&
    gpcDrivenOptOut &&
    !!emailHint &&
    !suppressed &&
    !scannerSuspected;

  if (scannerSuspected) {
    // Route to the auth-audit table so the daily-digest cron can surface the
    // pattern. Fire-and-forget; never blocks the redirect.
    void logAuthAttempt({
      endpoint: "/r/redirect",
      client_key,
      success: false,
      failure_reason: `scanner_suspected:${scannerRisk.reasons.join(",")}`,
      ip_hash: scannerRisk.ip_hash,
      user_agent_snippet: userAgent?.slice(0, 200) ?? null,
      request_id: req.headers.get("x-vercel-id") ?? null,
    });
  }

  // Solution 1: append ?chid={identity_key}&jid={journey_id} to the
  // destination so the destination's Chapter pixel can alias its anonymous_id
  // back to the redirect's identity at landing. Skipped under opt-out AND
  // when the click is flagged suspected-scanner (so we don't leak a synthetic
  // identity into the destination URL that the scanner then follows).
  // Also gated per client: tenants whose links point off-site to third parties
  // (advertisers, affiliates) get no value from the handoff — there is no
  // Chapter pixel at the destination to consume it — so we don't ride into
  // someone else's URL with it.
  destination = appendIdentityHandoff(
    destination,
    identity.identityKey,
    identity.journeyId,
    consent.allowCollection && !scannerSuspected && clientConfig.identity_handoff_enabled,
  );

  // Solution 2: stitch the redirect's identity to a known email_sha256 at
  // click time via one of three URL hint flavors (?rh / ?re / ?rid). Closes
  // the cross-device gap that solution 1's pixel handoff can't cover when
  // the visitor never identifies on the redirect-clicking device.
  // Uses after() so the work continues past the 302 — without it the runtime
  // would kill the pending async on response and no stitch row would land.
  // Skipped under opt-out AND when suspected-scanner (would falsely bind the
  // real recipient's email_sha256 to a scanner's synthetic anonymous_id).
  if ((consent.allowCollection || allowConsentedMeasurement) && emailHint && !suppressed && !scannerSuspected) {
    after(async () => {
      try {
        let email_sha256: string | null = null;
        let reason: "redirect_email_prehashed" | "redirect_email_plaintext" | "redirect_recipient_token" | null = null;
        if (emailHint.source === "prehashed") {
          email_sha256 = emailHint.email_sha256;
          reason = "redirect_email_prehashed";
        } else if (emailHint.source === "plaintext") {
          email_sha256 = emailHint.email_sha256;
          reason = "redirect_email_plaintext";
        } else if (emailHint.source === "token") {
          email_sha256 = await resolveRecipientToken(client_key, emailHint.token);
          reason = "redirect_recipient_token";
        }
        // Re-check at resolution time — token-flavored hints couldn't be checked
        // upfront. If the token resolves to an ignored email, skip the stitch.
        if (email_sha256 && (await isEmailIgnored(client_key, email_sha256))) {
          return;
        }
        if (email_sha256 && reason) {
          await stitchIdentity(
            client_key,
            identity.identityKey,
            `email_sha256:${email_sha256}`,
            reason,
            { slug },
          );
        }
      } catch (err) {
        console.warn("[redirect] solution-2 stitch failed:", err);
      }
    });
  }

  // Click log via after() — runs after the 302 ships so it doesn't add
  // latency. Earlier this looked broken (zero rows landing), but the real
  // bug was the click logger throwing FK 23503 because the journey row
  // didn't exist (now fixed by the journey upsert inside logRedirectClick).
  // With that resolved, after() works cleanly and saves ~50-100ms on the
  // critical path. Skipped when consent gate denies collection OR when the
  // visitor's UA / hinted email is on the tracking ignore list.
  if ((consent.allowCollection || allowConsentedMeasurement) && !suppressed) {
    after(() =>
      logRedirectClick({
        client_key,
        identity_key: identity.identityKey,
        journey_id: identity.journeyId,
        slug,
        destination,
        matched_rule_id: matchedRuleId,
        // Which 1P host served this click. `hostname` is declared further down
        // (it is needed for cookie apex), so read it off the request directly.
        link_host: req.nextUrl.hostname,
        query,
        referrer,
        geo,
        device,
        user_agent: req.headers.get("user-agent"),
        // Tag suspected scanner clicks so downstream analytics + attribution
        // can filter them out. Still logged (for observability + billing
        // audit) but distinguishable from real human clicks.
        suspected_scanner: scannerSuspected,
        suspected_scanner_reasons: scannerSuspected ? scannerRisk.reasons : null,
      }),
    );
  }

  // Increment hit_count on the matched rule via after() too.
  //
  // GATED IDENTICALLY TO THE CLICK LOG ABOVE — this is load-bearing. hit_count
  // is the operator-facing "is this rule firing?" number in the admin UI, and
  // it is routinely reconciled against the logged clicks in pixel_events. Until
  // Sep 2026 it had NO gate, so a click that was correctly withheld from the
  // click log still bumped the counter, in two cases:
  //   - `suppressed`: the visitor's UA is on tracking_ignore_list, or a
  //     ?rh=/?re= hint resolved to an ignored email (e.g. an operator testing
  //     their own wrapped link)
  //   - consent denied: opt_out cookie, GPC, or the collection_enabled switch
  // Measured drift at the time of the fix: eos_fabrics/email_register read 7
  // against 1 real logged click (6 of 7 phantom — operator self-tests), and
  // not_so_cavalier/google-ads read 310 against 308. ACJ was clean at 0, which
  // is why an ACJ-only check had previously recorded the two as "matching".
  //
  // The ignore list exists to declare "this is not real traffic", so it should
  // mute the rule counter too, not just analytics — otherwise muting a bot UA
  // leaves its clicks inflating the rule's apparent performance, and the
  // admin-UI number is the flattering one. Keep these two conditions in sync;
  // if a routing-diagnostic counter that ignores consent is ever wanted, it
  // belongs in a separate column with a name that says so.
  //
  // Also skipped on no-rule paths (a ?to= / client-default destination isn't
  // tied to a stored rule).
  if (matchedRuleId && (consent.allowCollection || allowConsentedMeasurement) && !suppressed) {
    after(() => incrementRuleHitCount(matchedRuleId));
  }

  // Google Ads server-side conversion capture. If this slug is the client's
  // configured conversion slug (chapter_config.gads_conversions, enabled) AND
  // the entry-relay cookie carries an ad click id, record a conversion (deduped)
  // for the delivery layer to hand to Google Ads. Fired server-side in after(),
  // so it adds no latency and can't be lost to the mobile-Safari beacon race the
  // client-side gtag tag suffered. readEntryClick is cheap (no DB) and bails when
  // there's no ad click, so the config lookup only runs for ad-attributed clicks.
  // Same consent + non-scanner gate as the other writes.
  if (consent.allowCollection && !scannerSuspected) {
    after(async () => {
      const entryClick = readEntryClick(req, client_key);
      if (!entryClick) return;
      const gadsCfg = await fetchGadsConfig(client_key, slug);
      if (gadsCfg && entryClick.platform === gadsCfg.platform) {
        await recordGadsConversion({
          clientKey: client_key,
          clickId: entryClick.clickId,
          clickPlatform: entryClick.platform,
          clickKind: entryClick.kind,
          cfg: gadsCfg,
        });
      }
    });
  }

  const hostname = req.nextUrl.hostname;
  const res = NextResponse.redirect(destination, { status: 302 });
  // Cookies are part of the collection contract — skipped on opt-out so we
  // don't issue new identifiers. Existing cookies are NOT cleared here; that's
  // the consent banner's responsibility on the property where the visitor
  // expressed the opt-out.
  //
  // Also skipped when suspected-scanner: don't issue a durable anonymous_id
  // cookie to a scanner's IP. If it's a real human being false-flagged, their
  // next real pixel event brings its own anonymous_id from localStorage and
  // the graph unifies normally.
  if (consent.allowCollection && !scannerSuspected) {
    applyIdentityCookies(res, identity, hostname, client_key);

    // Entry-relay cookie: on ENTRY clicks (carry inbound attribution), stash the
    // handoff context on the apex so the pixel can thread this click to the
    // on-site session even when an ad-network intermediary (e.g. google.com/asnc)
    // strips our ?chid from the destination URL. Only set when attribution is
    // present, so plain exit redirects (book-now → Square) never trigger it.
    if (hasInboundAttribution(query)) {
      const click = pickClickId(query);
      applyEntryRelayCookie(res, hostname, client_key, {
        identityKey: identity.identityKey,
        journeyId: identity.journeyId,
        slug,
        clickId: click?.id ?? null,
        clickPlatform: click?.platform ?? null,
        clickKind: click?.kind ?? null,
        utmSource: query.utm_source ?? null,
      });
    }
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
