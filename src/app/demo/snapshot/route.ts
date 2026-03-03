import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const client_key = (url.searchParams.get("client_key") || "").trim();

  if (!client_key) {
    return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  }

  const journeyCookie = `up_journey_${client_key}`;
  const anonCookie = `up_anon_${client_key}`;

  const journey_id = req.cookies.get(journeyCookie)?.value || null;
  const anon_id = req.cookies.get(anonCookie)?.value || null;

  if (!journey_id) {
    return NextResponse.json({
      ok: true,
      client_key,
      journey_id: null,
      anon_id,
      journey: null,
      events: [],
      server_time: new Date().toISOString(),
    });
  }

  const { data: journey } = await supabase
    .from("journeys")
    .select("*")
    .eq("id", journey_id)
    .eq("client_key", client_key)
    .maybeSingle();

  const { data: events } = await supabase
    .from("pixel_events")
    .select("ts,event_name,page_path,utm,consent_status,consent_mode,consent_ts")
    .eq("journey_id", journey_id)
    .eq("client_key", client_key)
    .order("ts", { ascending: false })
    .limit(20);

  return NextResponse.json({
    ok: true,
    client_key,
    journey_id,
    anon_id,
    journey: journey ?? null,
    events: events ?? [],
    server_time: new Date().toISOString(),
  });
}