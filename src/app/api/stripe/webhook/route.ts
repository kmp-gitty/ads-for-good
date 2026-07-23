// Stripe webhook — the bridge that "flips entitlements". Verifies the signature,
// dedupes by event id (handlers are idempotent regardless), and syncs the
// tenant's subscription state → chapter_config.clients.{tools_enabled,billing_status}.
//
// After deploy: create a webhook endpoint in Stripe → this URL, subscribe to the
// events below, and put its signing secret in env as STRIPE_WEBHOOK_SECRET.

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/app/lib/stripe/client";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { syncSubscriptionRecord } from "@/app/lib/stripe/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "not configured" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const events = supabase.schema("chapter_config").from("stripe_events");

  // Already handled? (Dedupe. Handlers are idempotent, so this is an optimization
  // — we still record AFTER success so a failed+retried event reprocesses.)
  const { data: seen } = await events.select("event_id").eq("event_id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscriptionRecord(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
          await syncSubscriptionRecord(sub);
        }
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as unknown as { subscription?: string | null }).subscription;
        if (subId) {
          const sub = await getStripe().subscriptions.retrieve(subId);
          await syncSubscriptionRecord(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe-webhook] handler error", event.type, e);
    return NextResponse.json({ error: "handler failed" }, { status: 500 }); // Stripe retries
  }

  await events.insert({ event_id: event.id, type: event.type }); // best-effort dedupe record
  return NextResponse.json({ received: true });
}
