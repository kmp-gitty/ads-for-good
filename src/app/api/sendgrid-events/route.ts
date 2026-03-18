import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SendGridEvent = {
  email?: string;
  event?: string;
  url?: string;
  timestamp?: number;
  sg_message_id?: string;
  sg_event_id?: string;
  [key: string]: any;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // SendGrid sends an array of events
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const rows = body
      .filter((e: SendGridEvent) => e.email && e.event)
      .map((e: SendGridEvent) => ({
        email: e.email,
        event_type: e.event,
        url: e.url || null,
        category: e.category?.[0] || null,
        event_ts: e.timestamp
          ? new Date(e.timestamp * 1000).toISOString()
          : new Date().toISOString(),
        sg_message_id: e.sg_message_id || null,
        sg_event_id: e.sg_event_id || null,
        raw: e,
      }));

    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const { error } = await supabase
      .from("sendgrid_email_events")
      .insert(rows);

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: "Insert failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}