// /src/app/demo/snapshot/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const client_key = searchParams.get("client_key")?.trim();

  if (!client_key) {
    return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  }

  // Read cookies (what /demo uses for “Session” + event scoping)
  const journeyCookieName = `up_journey_${client_key}`;
  const anonCookieName = `up_anon_${client_key}`;
  const journey_id = req.cookies.get(journeyCookieName)?.value || null;
  const anon_id = req.cookies.get(anonCookieName)?.value || null;

  // 1) Dashboard JSON (used by /demo/dashboard)
  const { data: dash, error: dashErr } = await supabase
    .rpc("dashboard_snapshot_for_client", { p_client_key: client_key })
    .maybeSingle();

    let dashboard_error: string | null = null;

    if (dashErr) {
      // Don’t break /demo just because the dashboard aggregate query timed out.
      dashboard_error = dashErr.message;
    }

  const dashboard_json = (dash as any)?.dashboard_json ?? null;

  // 2) Session info (used by /demo “Live Debug”)
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

  // 3) Latest events (used by /demo “Latest Events” list)
  // Prefer resolved view if you have it; fall back to pixel_events.
  let latest_events: any[] = [];
// Latest events for this journey (raw pixel_events is the most reliable)
let events: any[] = [];

if (journey_id) {
  const { data: rows, error: evErr } = await supabase
    .from("pixel_events")
    .select("ts, event_name, utm, consent_status, consent_mode")
    .eq("client_key", client_key)
    .eq("journey_id", journey_id)
    .order("ts", { ascending: false })
    .limit(25);

  if (evErr) {
    console.error("snapshot events query error:", evErr);
  }

  events =
    (rows || []).map((r: any) => ({
      ts: r.ts,
      event_name: r.event_name,
      utm: r.utm,
      consent_status: r.consent_status,
      consent_mode: r.consent_mode,
    })) ?? [];
}

return NextResponse.json({
    ok: true,
    client_key,
    journey_id,
    anon_id,

    // keep dashboard stuff if you want it available
    dashboard_json,
    dashboard_error,

    // match what /demo/page.tsx reads:
    journey: session,
    events, // ✅ this is the array you actually built

    server_time: new Date().toISOString(),
  });
}