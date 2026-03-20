// /src/app/demo/snapshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function channelFromUtm(utm: any) {
  const src = utm?.utm_source ? String(utm.utm_source) : "(direct)";
  const med = utm?.utm_medium ? String(utm.utm_medium) : null;
  const camp = utm?.utm_campaign ? String(utm.utm_campaign) : null;
  return { utm_source: src, utm_medium: med, utm_campaign: camp };
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const client_key = searchParams.get("client_key")?.trim();
  const lite = searchParams.get("lite") === "true";

  if (!client_key) {
    return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  }

  const journeyCookieName = `up_journey_${client_key}`;
  const anonCookieName = `up_anon_${client_key}`;
  const journey_id = req.cookies.get(journeyCookieName)?.value || null;
  const anon_id = req.cookies.get(anonCookieName)?.value || null;

  const since = daysAgoIso(7);

  let dashboard_json: any = {
    kpi_tiles: {
      revenue: null,
      purchases: null,
      leads: null,
      aov: null,
      currency: "USD",
    },
    journey_tiles: {
      journey_count: null,
      anon_journeys: null,
      idd_journeys: null,
      chapter_count: null,
      avg_chapter_seconds: null,
      avg_touchpoints: null,
      avg_unique_channels: null,
      recent_events_count: null,
    },
    first_touch: [],
    last_touch: [],
    linear_attribution: [],
    correlation_lift: [],
    top5_chapter_paths: [],
    top_event_names: [],
    top_page_paths: [],
  };

  let dashboard_error: string | null = null;

  if (!lite) {
    const { data: dash, error: dashErr } = await supabase
      .rpc("dashboard_snapshot_for_client", { p_client_key: client_key })
      .maybeSingle();

    if (dashErr) {
      dashboard_error = dashErr.message;
    } else {
      dashboard_json = (dash as any)?.dashboard_json ?? dashboard_json;
    }
  } else {
    const journeyApi = chapterSchemas.journey(supabase);
    const ingestApi = chapterSchemas.ingest(supabase);

    const [
      journeysTotalRes,
      anonJourneysRes,
      iddJourneysRes,
      recentEventsRes,
      topEventsRes,
      topPagesRes,
      topPixelRowsRes,
    ] = await Promise.all([
      journeyApi
        .from("journeys")
        .select("id", { count: "exact", head: true })
        .eq("client_key", client_key),

      journeyApi
        .from("journeys")
        .select("id", { count: "exact", head: true })
        .eq("client_key", client_key)
        .is("last_identity_key", null),

      journeyApi
        .from("journeys")
        .select("id", { count: "exact", head: true })
        .eq("client_key", client_key)
        .not("last_identity_key", "is", null),

      ingestApi
        .from("pixel_events")
        .select("id", { count: "exact", head: true })
        .eq("client_key", client_key)
        .gte("ts", since),

      ingestApi
        .from("pixel_events")
        .select("event_name")
        .eq("client_key", client_key)
        .gte("ts", since)
        .limit(5000),

      ingestApi
        .from("pixel_events")
        .select("page_path")
        .eq("client_key", client_key)
        .gte("ts", since)
        .not("page_path", "is", null)
        .limit(5000),

      ingestApi
        .from("pixel_events")
        .select("utm")
        .eq("client_key", client_key)
        .gte("ts", since)
        .limit(5000),
    ]);

    const liteErrors = [
      journeysTotalRes.error,
      anonJourneysRes.error,
      iddJourneysRes.error,
      recentEventsRes.error,
      topEventsRes.error,
      topPagesRes.error,
      topPixelRowsRes.error,
    ].filter(Boolean);

    if (liteErrors.length > 0) {
      dashboard_error = liteErrors.map((e: any) => e.message).join(" | ");
    }

    const topEventsMap = new Map<string, number>();
    for (const row of topEventsRes.data || []) {
      const key = row.event_name || "(unknown)";
      topEventsMap.set(key, (topEventsMap.get(key) || 0) + 1);
    }
    const topEventNames = [...topEventsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([event_name, count]) => ({ event_name, count }));

    const topPagesMap = new Map<string, number>();
    for (const row of topPagesRes.data || []) {
      const key = row.page_path || "(unknown)";
      topPagesMap.set(key, (topPagesMap.get(key) || 0) + 1);
    }
    const topPagePaths = [...topPagesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([page_path, count]) => ({ page_path, count }));

    const topSourcesMap = new Map<string, number>();
    for (const row of topPixelRowsRes.data || []) {
      const src = row?.utm?.utm_source ? String(row.utm.utm_source) : "(direct)";
      topSourcesMap.set(src, (topSourcesMap.get(src) || 0) + 1);
    }
    const topSources = [...topSourcesMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([channel, chapter_count]) => ({ channel, chapter_count }));

    dashboard_json = {
      ...dashboard_json,
      journey_tiles: {
        ...dashboard_json.journey_tiles,
        journey_count: journeysTotalRes.count ?? 0,
        anon_journeys: anonJourneysRes.count ?? 0,
        idd_journeys: iddJourneysRes.count ?? 0,
        recent_events_count: recentEventsRes.count ?? 0,
      },
      first_touch: topSources,
      last_touch: topEventNames.map((r) => ({
        channel: r.event_name,
        chapter_count: r.count,
      })),
      top_event_names: topEventNames,
      top_page_paths: topPagePaths,
    };

    dashboard_error = dashboard_error || "Lite mode enabled; attribution queries skipped.";
  }

  let session: any = {
    journey_id,
    anon_id,
    consent_status: null,
    consent_mode: null,
    consent_ts: null,
    last_identity_key: null,
  };

  if (journey_id) {
    const { data: j } = await chapterSchemas
      .journey(supabase)
      .from("journeys")
      .select("consent_status, consent_mode, consent_ts, last_identity_key")
      .eq("id", journey_id)
      .maybeSingle();

    if (j) {
      session = {
        ...session,
        consent_status: (j as any).consent_status ?? null,
        consent_mode: (j as any).consent_mode ?? null,
        consent_ts: (j as any).consent_ts ?? null,
        last_identity_key: (j as any).last_identity_key ?? null,
      };
    }
  }

  let events: any[] = [];

  if (journey_id) {
    const { data: rows, error: evErr } = await chapterSchemas
      .ingest(supabase)
      .from("pixel_events")
      .select("ts, event_name, page_path, page_url, referrer, utm, consent_status, consent_mode")
      .eq("client_key", client_key)
      .eq("journey_id", journey_id)
      .order("ts", { ascending: false })
      .limit(50);

    if (evErr) {
      console.error("snapshot events query error:", evErr);
    }

    events =
      (rows || []).map((r: any) => {
        const { utm_source, utm_medium, utm_campaign } = channelFromUtm(r.utm);
        return {
          ts: r.ts,
          event_name: r.event_name,
          page_path: r.page_path ?? null,
          page_url: r.page_url ?? null,
          referrer: r.referrer ?? null,
          utm: r.utm ?? null,
          utm_source,
          utm_medium,
          utm_campaign,
          consent_status: r.consent_status ?? null,
          consent_mode: r.consent_mode ?? null,
        };
      }) ?? [];
  }

  return NextResponse.json({
    ok: true,
    client_key,
    server_time: new Date().toISOString(),
    journey_id,
    anon_id,
    session,
    dashboard_json,
    dashboard_error,
    events,
  });
}