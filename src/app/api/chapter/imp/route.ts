import { NextRequest, NextResponse } from "next/server";
import { withClient, isKnownClient } from "@/app/lib/db/per-client";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";
import { getImpressionConfig, paperForHost, bareHost } from "@/app/lib/publisher/config";
import { userAgentBotReasons } from "@/app/lib/redirect/scanner-detection";
import { datacenterProvider } from "@/app/lib/redirect/datacenter-ip";
import { hostingNetwork } from "@/app/lib/redirect/hosting-asn";
import { getClientIp } from "@/app/lib/audit/auth";
import { classifyUA } from "@/app/lib/redirect/device";
import { resolveGeo } from "@/app/lib/redirect/geo";
import { readConsentState } from "@/app/lib/redirect/consent";
import { isCollectionEnabled } from "@/app/lib/consent/collection-switch";
import { apexCookieDomain } from "@/app/lib/redirect/identity";

// Slide impression beacon. One row per page view in
// chapter_publisher.slide_pageviews, upserted: each beacon carries the page
// view's cumulative counts, and a later beacon (higher seq) replaces an earlier one.
//
// Identity: the visitor ID is Chapter's up_anon_<client> cookie on the paper's
// domain, the same cookie the wrapped-link redirect reads and writes, so
// impressions and clicks share one ID per reader per paper. Missing cookie:
// restored from the script's localStorage copy if it has one, else minted.
// Cookie and localStorage disagree (cookie was lost and re-minted): the two IDs
// are linked in the identity graph. Cross-paper arrival (chx param): the other
// paper's ID is linked to this one.
//
// Opt-out (chapter_consent=opt_out or GPC without opt_in): counted, but no ID,
// no cookie, no links. Bots are counted and flagged, never dropped, so the
// nightly job can re-check them.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_SLIDES = 120;
const str = (v: unknown, n = 200) => (typeof v === "string" ? v.slice(0, n) : "");
const int = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? Math.min(Math.floor(x), 10_000) : 0;
};

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsPreflightHeaders(req) });
}

export async function POST(req: NextRequest) {
  const done = (body: Record<string, unknown> = { ok: true }, status = 200) =>
    withCors(req, NextResponse.json(body, { status }));

  let b: Record<string, unknown>;
  try {
    b = JSON.parse(await req.text());
  } catch {
    return done({ ok: false, error: "bad_json" }, 400);
  }

  const k = str(b.k, 64);
  if (!isKnownClient(k)) return done({ ok: false, error: "unknown_client" }, 400);
  const pvId = str(b.pv, 36);
  if (!UUID_RE.test(pvId)) return done({ ok: false, error: "bad_pv" }, 400);

  const paper = paperForHost(req.nextUrl.hostname);
  const cfg = await getImpressionConfig(k);
  // The beacon must come from the paper whose Chapter host it was sent to.
  if (!cfg.liveHosts.includes(paper) || bareHost(str(b.host)) !== paper) return done({ ok: true, off: true });
  if (!(await isCollectionEnabled(k))) return done({ ok: true, off: true });

  const now = Date.now();
  const pvTs = Math.min(Math.max(Number(b.pv_ts) || now, now - 24 * 3600_000), now);
  const pvDate = new Date(pvTs).toISOString().slice(0, 10);
  const seq = int(b.seq);

  const slides = (Array.isArray(b.slides) ? b.slides : []).slice(0, MAX_SLIDES).map((x) => {
    const s = (x ?? {}) as Record<string, unknown>;
    return {
      link: str(s.link, 128), slug: str(s.slug, 64), partner: str(s.partner, 64),
      promo: str(s.promo, 128), loc: str(s.loc, 64), size: str(s.size, 16),
      creative: str(s.creative, 32), slider: str(s.slider, 32),
      rendered: int(s.rendered), impressions: int(s.impressions), viewable: int(s.viewable),
    };
  });

  // Bot verdict (stored, not acted on).
  const ua = req.headers.get("user-agent");
  const reasons = userAgentBotReasons(ua);
  if (/ACJ-LinkCheck/i.test(ua || "")) reasons.push("acj_linkcheck");
  if (b.wd === true) reasons.push("webdriver");
  const ip = getClientIp(req);
  if (ip) {
    const dc = datacenterProvider(ip);
    if (dc) reasons.push(`datacenter_ip:${dc}`);
    else {
      const net = hostingNetwork(ip);
      if (net) reasons.push(`hosting_asn:${net}`);
    }
  }
  const bot = reasons.length > 0;

  // Identity.
  const cookieName = `up_anon_${k}`;
  const optedOut = readConsentState(req) === "opt_out";
  const cookieRaw = req.cookies.get(cookieName)?.value ?? "";
  const cookieId = UUID_RE.test(cookieRaw) ? cookieRaw.toLowerCase() : null;
  const lsRaw = str(b.ls, 36);
  const lsId = UUID_RE.test(lsRaw) ? lsRaw.toLowerCase() : null;
  let visitorId: string | null = null;
  let setCookie = false;
  const links: { from: string; to: string; reason: string; meta: Record<string, string> }[] = [];
  if (!optedOut && !bot) {
    visitorId = cookieId ?? lsId ?? crypto.randomUUID();
    setCookie = !cookieId;
    if (cookieId && lsId && cookieId !== lsId) {
      links.push({ from: cookieId, to: lsId, reason: "impression_cookie_restore", meta: { paper } });
    }
    const x = (b.xref ?? null) as { id?: unknown; from?: unknown } | null;
    const xId = x ? str(x.id, 36).toLowerCase() : "";
    const xFrom = x ? bareHost(str(x.from, 100)) : "";
    if (UUID_RE.test(xId) && xId !== visitorId && cfg.papers.includes(xFrom) && xFrom !== paper) {
      links.push({ from: visitorId, to: xId, reason: "cross_paper_link", meta: { paper, from_paper: xFrom } });
    }
  }
  const identityKey = visitorId ? `anonymous_id:${visitorId}` : null;

  const device = classifyUA(ua).device_type;
  const geo = resolveGeo(req);
  let city: string | null = null;
  try { city = geo.city ? decodeURIComponent(geo.city) : null; } catch { city = geo.city ?? null; }

  try {
    await withClient(k, async (tx) => {
      await tx`
        INSERT INTO chapter_publisher.slide_pageviews
          (client_key, pv_date, pv_id, first_ts, last_ts, seq, host, path, device,
           country, region, city, identity_key, user_agent, bot, bot_reasons, slides)
        VALUES
          (${k}, ${pvDate}, ${pvId}, now(), now(), ${seq}, ${paper}, ${str(b.path, 500)}, ${device},
           ${geo.country ?? null}, ${geo.region ?? null}, ${city},
           ${identityKey}, ${(ua || "").slice(0, 400)}, ${bot}, ${reasons.length ? reasons : null},
           ${tx.json(slides)}::jsonb)
        ON CONFLICT (client_key, pv_date, pv_id) DO UPDATE SET
          seq = EXCLUDED.seq,
          last_ts = now(),
          slides = EXCLUDED.slides,
          identity_key = coalesce(slide_pageviews.identity_key, EXCLUDED.identity_key),
          bot = slide_pageviews.bot OR EXCLUDED.bot,
          bot_reasons = coalesce(slide_pageviews.bot_reasons, EXCLUDED.bot_reasons)
        WHERE EXCLUDED.seq > slide_pageviews.seq
      `;
      for (const l of links) {
        await tx`
          INSERT INTO chapter_identity.identity_aliases
            (client_key, ts, from_identity_key, to_identity_key, method, confidence, is_deterministic, reason, metadata)
          VALUES
            (${k}, now(), ${"anonymous_id:" + l.from}, ${"anonymous_id:" + l.to}, ${l.reason}, 100, true,
             ${l.reason}, ${tx.json(l.meta)}::jsonb)
          ON CONFLICT (client_key, from_identity_key) DO NOTHING
        `;
      }
    });
  } catch (err) {
    console.error("[impressions] write failed:", err instanceof Error ? err.message : err);
    return done({ ok: false }, 500);
  }

  const res = done({ ok: true, id: visitorId });
  if (setCookie && visitorId) {
    res.cookies.set(cookieName, visitorId, {
      domain: apexCookieDomain(req.nextUrl.hostname),
      path: "/",
      maxAge: 365 * 24 * 3600,
      sameSite: "none",
      secure: true,
      httpOnly: false, // the impression script and pixel.js read it
    });
  }
  return res;
}
