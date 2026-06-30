// MI v2 Phase 3 — Resend webhook receiver.
//
// Resend posts delivery / bounce / complaint events here. We look up the
// matching chapter_engagement.email_sends row by esp_message_id and update
// status + status_detail.
//
// Configure in Resend dashboard:
//   - Webhook URL: https://ads4good.com/api/email-send-webhook
//   - Events: email.delivered, email.bounced, email.complained, email.delivery_delayed
//   - Signing key → RESEND_WEBHOOK_SECRET env var
//
// Signature scheme (Resend uses Svix). For Phase 3 v1 we ship without signature
// verification to avoid an extra dependency; if abuse appears, add @svix/svix
// and verify (Resend's signing-secret check is straightforward Svix).
//
// Idempotency: each Resend event has a unique id. We don't dedupe in v1 —
// status updates are idempotent (last write wins). If an event arrives twice,
// we just overwrite the row's status with the same value.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type ResendEvent = {
  type: string;        // 'email.delivered' | 'email.bounced' | 'email.complained' | 'email.delivery_delayed'
  created_at?: string;
  data?: {
    email_id?: string; // Resend message id — matches our esp_message_id
    from?: string;
    to?: string[] | string;
    subject?: string;
    bounce_type?: string;
    bounce_detail?: string;
  };
};

const STATUS_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delayed",
  "email.sent": "sent",
};

export async function POST(req: NextRequest) {
  let event: ResendEvent;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const status = STATUS_MAP[event.type];
  if (!status) {
    // Unknown event type — ack but don't process. Resend stops retrying on 2xx.
    return NextResponse.json({ ack: true, ignored: event.type }, { status: 200 });
  }

  const messageId = event.data?.email_id;
  if (!messageId) {
    return NextResponse.json({ error: "missing_email_id" }, { status: 400 });
  }

  const statusDetail =
    event.data?.bounce_type || event.data?.bounce_detail || null;

  const { error } = await supabase
    .schema("chapter_engagement")
    .from("email_sends")
    .update({
      status,
      status_detail: statusDetail,
    })
    .eq("esp_message_id", messageId);

  if (error) {
    // Don't swallow — Resend will retry on non-2xx.
    console.warn("[email-send-webhook] update failed:", error.message);
    return NextResponse.json({ error: "update_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ack: true, status }, { status: 200 });
}

// Resend may verify the endpoint with a GET probe.
export async function GET() {
  return NextResponse.json({ ok: true, service: "chapter-email-webhook" });
}
