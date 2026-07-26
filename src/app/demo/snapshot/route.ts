// /src/app/demo/snapshot/route.ts
//
// Serves the live event feed + session context for /internal/demo and
// /internal/prompt-playground (both poll every 2s). Returns identity + consent +
// last N events for the current journey (from cookies).
//
// The `dashboard_json` field in the response is a legacy shape. The RPC that
// populated it (public.dashboard_snapshot_for_client) + its sibling view
// (public.dashboard_snapshot_v1) + supporting view (chapter_attribution.
// attribution_linear) were dropped 2026-07-26 — they were Fix #10 scaffolding
// for a planned dashboard that shipped in June using different RPCs, then went
// orphaned. Meanwhile the RPC had been throwing "relation does not exist" every
// 2s while /demo was open, since May 7 when Fix #10 dropped its dependencies.
//
// No consumer of this route reads dashboard_json — the demo page renders only
// anon_id / journey_id / session / events. Keeping the field in the response
// as empty defaults for API-shape compat.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";

const supabase = createClient(
  process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function channelFromUtm(utm: any) {
  const src = utm?.utm_source ? String(utm.utm_source) : "(direct)";
  const med = utm?.utm_medium ? String(utm.utm_medium) : null;
  const camp = utm?.utm_campaign ? String(utm.utm_campaign) : null;
  return { utm_source: src, utm_medium: med, utm_campaign: camp };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const client_key = searchParams.get("client_key")?.trim();

    if (!client_key) {
      return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
    }

    const journeyCookieName = `up_journey_${client_key}`;
    const anonCookieName = `up_anon_${client_key}`;
    const journey_id = req.cookies.get(journeyCookieName)?.value || null;
    const anon_id = req.cookies.get(anonCookieName)?.value || null;

    // dashboard_json kept as empty-defaults for response-shape compat. The
    // computation that used to fill it was Fix #10 scaffolding + is now dropped.
    const dashboard_json: any = {
      kpi_tiles: { revenue: null, purchases: null, leads: null, aov: null, currency: "USD" },
      journey_tiles: {
        journey_count: null, anon_journeys: null, idd_journeys: null,
        chapter_count: null, avg_chapter_seconds: null,
        avg_touchpoints: null, avg_unique_channels: null,
        recent_events_count: null,
      },
      first_touch: [], last_touch: [], linear_attribution: [],
      correlation_lift: [], top5_chapter_paths: [],
      top_event_names: [], top_page_paths: [],
    };
    const dashboard_error: string | null = null;

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
        .not("page_path", "ilike", "/account%")
        .not("page_path", "ilike", "/challenge%")
        .not("page_path", "ilike", "/register%")
        .not("page_path", "ilike", "/login%")
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
  } catch (err: any) {
    console.error("demo snapshot fatal error:", err);
    return NextResponse.json(
      {
        ok: false,
        fatal_error: err?.message || "unknown_error",
        stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
      },
      { status: 500 }
    );
  }
}