// /src/app/demo/snapshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const client_key = searchParams.get("client_key")?.trim();

  if (!client_key) {
    return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  }

  // Cookies (session scope)
  const journeyCookieName = `up_journey_${client_key}`;
  const anonCookieName = `up_anon_${client_key}`;
  const journey_id = req.cookies.get(journeyCookieName)?.value || null;
  const anon_id = req.cookies.get(anonCookieName)?.value || null;

  // Dashboard JSON (best-effort)
  let dashboard_json: any = null;
  let dashboard_error: string | null = null;

  const { data: dash, error: dashErr } = await supabase
    .rpc("dashboard_snapshot_for_client", { p_client_key: client_key })
    .maybeSingle();

  if (dashErr) dashboard_error = dashErr.message;
  dashboard_json = (dash as any)?.dashboard_json ?? null;

  // Session info (best-effort)
  let session: any = {
    journey_id,
    anon_id,
    consent_status: null,
    consent_mode: null,
    consent_ts: null,
    last_identity_key: null,
  };

  if (journey_id) {
    const { data: j } = await supabase
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

  // Latest events for this journey (most reliable: raw pixel_events)
  let events: any[] = [];

  if (journey_id) {
    const { data: rows, error: evErr } = await supabase
      .from("pixel_events")
      .select("ts, event_name, page_path, page_url, referrer, utm, consent_status, consent_mode")
      .eq("client_key", client_key)
      .eq("journey_id", journey_id)
      .order("ts", { ascending: false })
      .limit(25);

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