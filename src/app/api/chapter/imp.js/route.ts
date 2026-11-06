import { NextRequest, NextResponse } from "next/server";
import { IMPRESSION_SCRIPT } from "@/app/lib/publisher/impression-script";
import { getImpressionConfig, paperForHost } from "@/app/lib/publisher/config";
import { isKnownClient } from "@/app/lib/db/per-client";

// Serves the slide impression script from the paper's own Chapter host, e.g.
//   https://s.delco.today/api/chapter/imp.js?k=acj_today
// One snippet sits on every paper; this route returns a no-op on any paper not
// listed in chapter_config.clients.impression_hosts, so papers are switched on
// (and off, as a kill switch) from Chapter without touching the site.
export async function GET(req: NextRequest) {
  const k = req.nextUrl.searchParams.get("k") || "";
  const headers = {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=300",
  };
  if (!isKnownClient(k)) return new NextResponse("/* chapter impressions: unknown client */", { headers });

  const paper = paperForHost(req.nextUrl.hostname);
  const cfg = await getImpressionConfig(k);
  if (!cfg.liveHosts.includes(paper)) {
    return new NextResponse("/* chapter impressions: off for " + paper + " */", { headers });
  }

  const config = JSON.stringify({
    k,
    endpoint: `https://${req.nextUrl.hostname}/api/chapter/imp`,
    papers: cfg.papers,
  });
  return new NextResponse(IMPRESSION_SCRIPT.replace("__CHAPTER_IMP_CFG__", config), { headers });
}
