"use server";

// Self-serve billing actions: start Checkout to subscribe to a tool, open the
// Customer Portal to manage/cancel, and read current per-tool subscription state
// for the Billing UI. client_key always from session; Stripe writes via the
// restricted key server-side.

import { getCurrentChapterUser, getClientEntitlement } from "@/app/lib/auth/chapter-user";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { getStripe, stripeConfigured } from "@/app/lib/stripe/client";
import { PRICE_ID, TOOL_LABEL, isBillableTool, ACTIVE_SUB_STATUSES, type BillableTool } from "@/app/lib/stripe/config";

const BASE = "https://www.ads4good.com";

type UrlResult = { ok: true; url: string } | { ok: false; error: string };

type Tenant = { clientKey: string; email: string; businessName: string | null; trialEndsAt: string | null; customerId: string | null };

async function requireTenant(): Promise<Tenant | { error: string }> {
  const user = await getCurrentChapterUser();
  if (!user || !user.client_key) return { error: "Not authorized." };
  const ent = await getClientEntitlement(user.client_key);
  if (!ent || !(ent.self_serve || !ent.tools_enabled.includes("chapter"))) {
    return { error: "Billing isn’t available on this workspace." };
  }
  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .schema("chapter_config")
    .from("clients")
    .select("business_name, trial_ends_at, stripe_customer_id")
    .eq("client_key", user.client_key)
    .maybeSingle();
  return {
    clientKey: user.client_key,
    email: user.email,
    businessName: (data?.business_name as string) ?? null,
    trialEndsAt: (data?.trial_ends_at as string) ?? null,
    customerId: (data?.stripe_customer_id as string) ?? null,
  };
}

async function ensureCustomer(t: Tenant): Promise<string> {
  if (t.customerId) return t.customerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: t.email,
    name: t.businessName || undefined,
    metadata: { client_key: t.clientKey },
  });
  const supabase = createSupabaseServiceRoleClient();
  await supabase.schema("chapter_config").from("clients").update({ stripe_customer_id: customer.id }).eq("client_key", t.clientKey);
  return customer.id;
}

export type InvoiceRow = {
  id: string;
  created: string;
  amount: number;
  currency: string;
  status: string;
  hostedUrl: string | null;
  number: string | null;
};

export type TenantBilling = {
  hasCustomer: boolean;
  subs: Partial<Record<BillableTool, { status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }>>;
  invoices: InvoiceRow[];
};

export async function getTenantBilling(): Promise<TenantBilling> {
  const t = await requireTenant();
  if ("error" in t) return { hasCustomer: false, subs: {}, invoices: [] };
  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .schema("chapter_config")
    .from("tenant_subscriptions")
    .select("tool, status, cancel_at_period_end, current_period_end")
    .eq("client_key", t.clientKey);
  const subs: TenantBilling["subs"] = {};
  for (const r of data ?? []) {
    const tool = r.tool as BillableTool;
    if (!isBillableTool(tool)) continue;
    subs[tool] = {
      status: r.status as string,
      cancelAtPeriodEnd: !!r.cancel_at_period_end,
      currentPeriodEnd: (r.current_period_end as string) ?? null,
    };
  }

  // Recent invoices straight from Stripe (each links to its hosted page).
  let invoices: InvoiceRow[] = [];
  if (t.customerId && stripeConfigured()) {
    try {
      const list = await getStripe().invoices.list({ customer: t.customerId, limit: 12 });
      invoices = list.data.map((inv) => ({
        id: inv.id ?? inv.number ?? String(inv.created),
        created: new Date(inv.created * 1000).toISOString(),
        amount: (inv.total ?? inv.amount_paid ?? 0) / 100,
        currency: (inv.currency || "usd").toUpperCase(),
        status: inv.status ?? "—",
        hostedUrl: inv.hosted_invoice_url ?? null,
        number: inv.number ?? null,
      }));
    } catch { /* leave empty on any Stripe error */ }
  }

  return { hasCustomer: !!t.customerId, subs, invoices };
}

export async function startCheckout(tool: string): Promise<UrlResult> {
  if (!stripeConfigured()) return { ok: false, error: "Billing isn’t set up yet." };
  if (!isBillableTool(tool)) return { ok: false, error: "Unknown tool." };
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };

  // Already subscribed to this tool? Send them to the portal instead.
  const supabase = createSupabaseServiceRoleClient();
  const { data: existing } = await supabase
    .schema("chapter_config")
    .from("tenant_subscriptions")
    .select("status")
    .eq("client_key", t.clientKey)
    .eq("tool", tool)
    .maybeSingle();
  if (existing && ACTIVE_SUB_STATUSES.has(existing.status as string)) {
    return openBillingPortal();
  }

  try {
    const stripe = getStripe();
    const customerId = await ensureCustomer(t);
    const trialDays = t.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(t.trialEndsAt).getTime() - Date.now()) / 86_400_000))
      : 0;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: PRICE_ID[tool], quantity: 1 }],
      subscription_data: {
        metadata: { client_key: t.clientKey, tool },
        ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      },
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      client_reference_id: t.clientKey,
      metadata: { client_key: t.clientKey, tool },
      allow_promotion_codes: true,
      success_url: `${BASE}/chapter/${t.clientKey}/billing?checkout=success`,
      cancel_url: `${BASE}/chapter/${t.clientKey}/billing?checkout=cancel`,
    });
    if (!session.url) return { ok: false, error: "Couldn’t start checkout. Please try again." };
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : `Couldn’t start checkout for ${TOOL_LABEL[tool]}.` };
  }
}

export async function openBillingPortal(): Promise<UrlResult> {
  if (!stripeConfigured()) return { ok: false, error: "Billing isn’t set up yet." };
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  if (!t.customerId) return { ok: false, error: "Subscribe to a plan first." };
  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: t.customerId,
      return_url: `${BASE}/chapter/${t.clientKey}/billing`,
    });
    return { ok: true, url: session.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Couldn’t open the billing portal." };
  }
}
