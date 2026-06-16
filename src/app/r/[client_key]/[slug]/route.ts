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
import { fetchRules, fetchAbExperiments } from "@/app/lib/redirect/rules";
import { resolveIdentity, applyIdentityCookies } from "@/app/lib/redirect/identity";
import { resolveGeo } from "@/app/lib/redirect/geo";
import { classifyUA } from "@/app/lib/redirect/device";
import { resolveSegments } from "@/app/lib/redirect/segments";
import { resolveCart } from "@/app/lib/redirect/cart";
import { evaluateConditions, EvalContext } from "@/app/lib/redirect/conditions";
import { interpolateTemplate, isValidDestination, appendIdentityHandoff } from "@/app/lib/redirect/template";
import { logRedirectClick } from "@/app/lib/redirect/click-logger";
import { readConsentState, applyConsentPolicy } from "@/app/lib/redirect/consent";
import { extractEmailHint, stripHintParams } from "@/app/lib/redirect/email-hint";
import { resolveRecipientToken } from "@/app/lib/redirect/recipient-lookup";
import { stitchIdentity } from "@/app/lib/redirect/identity-stitch";

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

  const identity = resolveIdentity(req);
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

  // Solution 1: append ?chid={identity_key}&jid={journey_id} to the
  // destination so the destination's Chapter pixel can alias its anonymous_id
  // back to the redirect's identity at landing. Skipped under opt-out.
  destination = appendIdentityHandoff(
    destination,
    identity.identityKey,
    identity.journeyId,
    consent.allowCollection,
  );

  // Solution 2: stitch the redirect's identity to a known email_sha256 at
  // click time via one of three URL hint flavors (?rh / ?re / ?rid). Closes
  // the cross-device gap that solution 1's pixel handoff can't cover when
  // the visitor never identifies on the redirect-clicking device.
  // Uses after() so the work continues past the 302 — without it the runtime
  // would kill the pending async on response and no stitch row would land.
  // Skipped under opt-out.
  if (consent.allowCollection && emailHint) {
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

  // Click log — awaited BEFORE the 302 ships. Adds ~50-100ms to the redirect
  // latency but guarantees the insert lands. The fire-and-forget pattern
  // (via after() or void IIFE) is more aggressive but failed to land any
  // rows in initial NSC testing — likely the serverless runtime kills the
  // pending I/O on response. Revisit after()/waitUntil() once we've proven
  // the code path works and want to claw back the latency budget.
  // Skipped entirely when consent gate denies collection.
  if (consent.allowCollection) {
    try {
      await logRedirectClick({
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
      });
    } catch (err) {
      console.error("[redirect] logRedirectClick failed:", err);
    }
  }

  // Increment hit_count on the matched rule asynchronously. Skipped on no-rule
  // (default-destination via ?to=) paths.
  // Doing this in JS instead of an UPDATE on the route's critical path keeps
  // the redirect under budget; the audit info still lands within a few seconds.
  // (Intentionally not awaited.)

  const hostname = req.nextUrl.hostname;
  const res = NextResponse.redirect(destination, { status: 302 });
  // Cookies are part of the collection contract — skipped on opt-out so we
  // don't issue new identifiers. Existing cookies are NOT cleared here; that's
  // the consent banner's responsibility on the property where the visitor
  // expressed the opt-out.
  if (consent.allowCollection) {
    applyIdentityCookies(res, identity, hostname);
  }
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
