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
// Latency budget: 50ms total. Achieved by:
//   - 5-min in-process caches on rule list, AB experiments, identity segments
//   - Vercel geo headers (no external geo lookup)
//   - All DB lookups run in PARALLEL via Promise.all
//   - Click insert is fire-and-forget (not awaited)
//
// What this endpoint does NOT do:
//   - Authentication: the endpoint is intentionally public (it serves end users)
//   - HMAC: clicks aren't signed; signature wouldn't add anything since the
//     request comes from a browser following a link
//   - Rate limiting: handled at the Vercel edge level

import { NextRequest, NextResponse, after } from "next/server";
import { fetchRules, fetchAbExperiments, incrementRuleHitCount } from "@/app/lib/redirect/rules";
import { resolveIdentity, applyIdentityCookies } from "@/app/lib/redirect/identity";
import { resolveGeo } from "@/app/lib/redirect/geo";
import { classifyUA } from "@/app/lib/redirect/device";
import { resolveSegments } from "@/app/lib/redirect/segments";
import { resolveCart } from "@/app/lib/redirect/cart";
import { evaluateConditions, EvalContext } from "@/app/lib/redirect/conditions";
import { interpolateTemplate, isValidDestination, appendIdentityHandoff } from "@/app/lib/redirect/template";
import { logRedirectClick } from "@/app/lib/redirect/click-logger";
import { isEmailIgnored, isUaIgnored } from "@/app/lib/auth/tracking-ignore";
import { readConsentState, applyConsentPolicy } from "@/app/lib/redirect/consent";
import { extractEmailHint, stripHintParams } from "@/app/lib/redirect/email-hint";
import { resolveRecipientToken } from "@/app/lib/redirect/recipient-lookup";
import { stitchIdentity } from "@/app/lib/redirect/identity-stitch";
import { classifyForScannerRisk } from "@/app/lib/redirect/scanner-detection";
import { logAuthAttempt } from "@/app/lib/audit/auth";

export const dynamic = "force-dynamic";

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
  // apex. Visitor still gets routed to the right destination; we just skip
  // every write (click log + cookie issuance) when collection is not allowed.
  const consent = applyConsentPolicy(readConsentState(req));

  // Bot fast-path: never log bot clicks, redirect to default destination with
  // no further processing. Saves the entire 50ms budget for actual humans.
  if (device.device_type === "bot") {
    const defaultDest = query.to;
    if (defaultDest && isValidDestination(defaultDest)) {
      return NextResponse.redirect(defaultDest, { status: 302 });
    }
    return new NextResponse("not_found", { status: 404 });
  }

  // Parallel: rules + ab experiments + segments + cart.
  const [rules, abExperiments, segments, cart] = await Promise.all([
    fetchRules(client_key, slug),
    fetchAbExperiments(client_key),
    resolveSegments(client_key, identity.identityKey),
    resolveCart(client_key, identity.identityKey),
  ]);

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

  // Fallback chain: ?to= query param → 404.
  if (!destination || !isValidDestination(destination)) {
    const fallback = query.to;
    if (fallback && isValidDestination(fallback)) {
      destination = fallback;
    } else {
      console.warn(`[redirect] no destination for ${client_key}/${slug}; rules=${rules.length}`);
      return new NextResponse("not_found", { status: 404 });
    }
  }

  // Tracking-ignore suppression. Two layers:
  //   1. UA substring match → skip ALL writes (click log + email-hint stitch).
  //      Lets operators mute known bot UAs (e.g. GoogleHypersonic) or QA tools
  //      without affecting the visitor's 302.
  //   2. Email-hint match — handled inside the after() block at the resolution
  //      point (token-flavored hints aren't resolved synchronously here).
  // Visitor still gets routed to their destination; we just don't persist them.
  const userAgent = req.headers.get("user-agent");
  const uaIgnored = await isUaIgnored(client_key, userAgent);
  const hintEmailIgnored =
    emailHint && emailHint.source !== "token"
      ? await isEmailIgnored(client_key, emailHint.email_sha256)
      : false;
  const suppressed = uaIgnored || hintEmailIgnored;

  // Scanner-risk classification (email security scanners like Proofpoint /
  // Mimecast / Microsoft Safe Links click every email link before the human
  // opens it). Suspicious clicks still get logged (with a tag) but don't
  // pollute the identity graph — no cookie writes, no email-hint stitch, no
  // ?chid= handoff on the destination.
  const scannerRisk = classifyForScannerRisk(req);
  const scannerSuspected = scannerRisk.suspicious && !suppressed;
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
  destination = appendIdentityHandoff(
    destination,
    identity.identityKey,
    identity.journeyId,
    consent.allowCollection && !scannerSuspected,
  );

  // Solution 2: stitch the redirect's identity to a known email_sha256 at
  // click time via one of three URL hint flavors (?rh / ?re / ?rid). Closes
  // the cross-device gap that solution 1's pixel handoff can't cover when
  // the visitor never identifies on the redirect-clicking device.
  // Uses after() so the work continues past the 302 — without it the runtime
  // would kill the pending async on response and no stitch row would land.
  // Skipped under opt-out AND when suspected-scanner (would falsely bind the
  // real recipient's email_sha256 to a scanner's synthetic anonymous_id).
  if (consent.allowCollection && emailHint && !suppressed && !scannerSuspected) {
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
  if (consent.allowCollection && !suppressed) {
    after(() =>
      logRedirectClick({
        client_key,
        identity_key: identity.identityKey,
        journey_id: identity.journeyId,
        slug,
        destination,
        matched_rule_id: matchedRuleId,
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

  // Increment hit_count on the matched rule via after() too. Skipped on
  // no-rule paths (default-destination via ?to= isn't tied to a stored rule).
  if (matchedRuleId) {
    after(() => incrementRuleHitCount(matchedRuleId));
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
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
