// Safari ITP cookie-durability test endpoint.
//
// Purpose: measure whether Safari applies its 7-day cookie-lifetime cap to a
// server-set, JS-readable (HttpOnly:false) cookie when the origin resolves via
// an A record (vs. a CNAME chain, which is documented to trigger the cap).
//
// Provisioning: sctest.ads4good.com is an A record → 76.76.21.21 (Vercel's
// anycast IP). Confirmed via `dig sctest.ads4good.com +short`.
//
// Cookie config MATCHES Chapter's actual pixel API config exactly:
//   Domain=.ads4good.com  · Path=/  · Max-Age=31536000  · Secure  · SameSite=None
//   HttpOnly: OMITTED (i.e. false — Chapter's pixel JS reads the cookie as
//     fallback when localStorage is empty, per July 10 cross-subdomain fix).
//
// UX:
//   - First visit: set fresh cookie with value = <uuid>|<setAt_epoch_ms>
//   - Subsequent visits: preserve existing cookie, display "set X days ago"
//   - Never overwrite the setAt on existing cookies — that would reset Max-Age
//     and make us blind to real ITP cap behavior.
//
// Pass criterion (measured over 8+ days):
//   Cookie still present + setAt timestamp preserved + Expires column in
//   Safari's cookie inspector shows the full year → A-record evades ITP cap.
//
// Fail criterion:
//   Cookie disappears after ~7 days OR Expires column shows ~7-day rewrite
//   → A record does NOT help; the migration plan needs a rethink.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE_NAME = "sctest_id";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year, matches pixel API

function parseCookieValue(value: string | null): { uuid: string; setAtMs: number } | null {
  if (!value) return null;
  const [uuid, setAtStr] = value.split("|");
  const setAtMs = parseInt(setAtStr, 10);
  if (!uuid || !Number.isFinite(setAtMs)) return null;
  return { uuid, setAtMs };
}

function formatAge(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const mins = Math.floor(ms / (1000 * 60)) % 60;
  if (days > 0) return `${days} day${days === 1 ? "" : "s"}${hours > 0 ? `, ${hours} h` : ""}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? "" : "s"}${mins > 0 ? `, ${mins} min` : ""}`;
  return `${mins} minute${mins === 1 ? "" : "s"}`;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const host = url.hostname;
  const now = Date.now();

  const rawCookie = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const parsed = parseCookieValue(rawCookie);
  const isExisting = parsed !== null;

  // Preserve existing cookie to measure real durability. Only set fresh if absent.
  const value = isExisting
    ? rawCookie!
    : `${crypto.randomUUID()}|${now}`;

  const ageMs = parsed ? now - parsed.setAtMs : 0;

  const bodyHtml = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>ITP A-record cookie durability test</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #1f2d43; line-height: 1.55; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 15px; margin-top: 28px; color: #5c6b82; text-transform: uppercase; letter-spacing: 0.08em; }
    code { background: #f4f5f7; padding: 2px 6px; border-radius: 4px; font-size: 12px; word-break: break-all; }
    .box { background: #f8f8f8; border: 1px solid #ddd; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .ok { color: #0f5c24; font-weight: 600; }
    .fresh { color: #b04a00; }
    .small { font-size: 12px; color: #8b95a6; }
    ol li, ul li { margin: 4px 0; }
  </style>
</head>
<body>
  <h1>ITP A-record cookie durability test</h1>
  <p class="small">Host: <code>${host}</code> · Server time: <code>${new Date(now).toISOString()}</code></p>

  <div class="box">
    ${
      isExisting
        ? `<p><span class="ok">✓ Cookie still present</span> — set <strong>${formatAge(ageMs)}</strong> ago</p>
           <p class="small">Cookie value: <code>${parsed!.uuid.slice(0, 12)}…|${new Date(parsed!.setAtMs).toISOString()}</code></p>`
        : `<p><span class="fresh">↻ Fresh cookie set just now</span></p>
           <p class="small">Cookie value: <code>${value.split("|")[0].slice(0, 12)}…|${new Date(now).toISOString()}</code></p>`
    }
  </div>

  <h2>Cookie attributes being set</h2>
  <div class="box">
    <code>Domain=.ads4good.com; Path=/; Max-Age=31536000; Secure; SameSite=None</code>
    <p class="small" style="margin-top: 8px;"><code>HttpOnly</code> is <strong>omitted</strong> (i.e. false — matches Chapter's actual pixel API config since the pixel JS reads the cookie as fallback).</p>
  </div>

  <h2>What to do on Safari</h2>
  <ol>
    <li>Visit this page once (you just did — cookie is set)</li>
    <li>Come back <strong>day 3, day 7, and day 10</strong></li>
    <li>Each visit will show "set X days ago" if the cookie survived, or "fresh cookie set" if it was reaped</li>
  </ol>

  <h2>Interpretation</h2>
  <ul>
    <li><strong class="ok">PASS</strong> — day 10 still shows "set 10 days ago" → A record evades the ITP 7-day cap ✓</li>
    <li><strong class="fresh">FAIL</strong> — day 10 shows "fresh cookie set" (or day 8+ visits keep resetting) → ITP capped despite A record; need a different mitigation</li>
  </ul>

  <h2>Optional: inspect the actual expiry in Web Inspector</h2>
  <ol>
    <li>Safari → Settings → Advanced → enable "Show features for web developers"</li>
    <li>Develop menu → Show Web Inspector (Mac) or connect iPhone via cable + inspect via Mac</li>
    <li>Storage tab → Cookies → <code>sctest.ads4good.com</code></li>
    <li>Find <code>sctest_id</code> — check the <strong>Expires</strong> column</li>
  </ol>
  <p class="small">If Expires shows ~1 year from set date, ITP didn't cap. If it shows ~7 days, it did.</p>
</body>
</html>`;

  const res = new NextResponse(bodyHtml, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
  // Only issue Set-Cookie when there's no existing cookie — preserves the
  // original setAt timestamp so we can measure real cookie age across visits.
  if (!isExisting) {
    res.cookies.set(COOKIE_NAME, value, {
      domain: ".ads4good.com",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
      sameSite: "none",
      secure: true,
      // httpOnly OMITTED → defaults to false. Matches pixel API.
    });
  }
  return res;
}
