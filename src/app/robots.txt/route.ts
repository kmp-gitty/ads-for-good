// robots.txt, by host.
//
// This app answers on the agency site AND on clients' 1P link/collect hosts
// (go.<paper>.today, go./s.eosfabrics.com, chapter.notsocavalier.com). Those
// hosts used to 307 /robots.txt to the client's homepage, so a crawler asking
// for the rules got an HTML page, found none, and crawled /r/ freely. Every
// crawled wrapped link logs a click.
//
// On the 1P hosts we disallow /r/ — the wrapped links — and nothing else, so a
// client's pixel and collect paths under /api/ are untouched.
//
// ⚠️ Trade-off, decided 2026-10-26: a search engine that obeys this will not
//    follow a wrapped link, so the link passes no ranking credit to the
//    partner. For paid placements that is what Google asks for anyway (paid
//    links should not pass credit; rel="sponsored" is its own mechanism for
//    the same thing). A link that MUST pass credit should not be wrapped. To
//    reverse, drop the Disallow line below — nothing else depends on it.
//
// This only stops crawlers that read robots.txt (Googlebot, bingbot, most
// commercial monitors). Crawlers that ignore it are caught, or not, by the
// click classifier in lib/redirect/scanner-detection.ts.
//
// Keep LINK_HOSTS in step with CLIENT_1P_HOSTS in next.config.ts.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const LINK_HOSTS = new Set([
  "go.philadelphia.today",
  "go.bucksco.today",
  "go.montco.today",
  "go.vista.today",
  "go.delco.today",
  "go.eosfabrics.com",
  "s.eosfabrics.com",
  "chapter.notsocavalier.com",
]);

export function GET(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase().split(":")[0];
  const body = LINK_HOSTS.has(host)
    ? "User-agent: *\nDisallow: /r/\n"
    : "User-agent: *\nAllow: /\n\nSitemap: https://www.ads4good.com/sitemap.xml\n";
  return new NextResponse(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
      vary: "host",
    },
  });
}
