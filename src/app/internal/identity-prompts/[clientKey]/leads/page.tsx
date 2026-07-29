// Leads admin view.
//
// Read-only table of chapter_engagement.captured_leads for the client.
// Includes cart context (cart_token + cart_items_jsonb) from cart-recovery
// submits — expandable per row to show the abandoned cart. Filters by prompt
// slug + "carts only" toggle so operators can zoom into cart-abandon leads.
//
// Identity hashes shown truncated (8-char prefix) — same privacy convention
// as /responses. Raw email + phone shown in full (they're the client's own
// captured contacts; the whole point of this view is operator follow-up).

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import LeadsClient, { type LeadRow, type CartItem } from "./LeadsClient";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

type LeadRowFromDb = {
  id: string;
  captured_at: string;
  prompt_slug: string | null;
  email: string | null;
  phone: string | null;
  identity_key: string | null;
  anonymous_id: string | null;
  journey_id: string | null;
  responses_jsonb: Record<string, unknown> | null;
  consent_mode: string | null;
  consent_declined: boolean;
  page_url: string | null;
  ip_country: string | null;
  cart_token: string | null;
  cart_items_jsonb: CartItem[] | null;
};

export default async function LeadsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string }>;
  searchParams: Promise<{ slug?: string; cart_only?: string; days?: string }>;
}) {
  const { clientKey } = await params;
  const sp = await searchParams;
  const slugFilter = sp.slug || "";
  const cartOnly = sp.cart_only === "1";
  const daysFilter = sp.days || "30";
  const daysNum = Math.max(1, Math.min(365, parseInt(daysFilter, 10) || 30));

  // Fetch prompt list for the filter dropdown + client's storefront_domain for
  // building cart-recovery URLs in the row-expand view.
  const [{ data: promptList }, { data: client }] = await Promise.all([
    supabase
      .schema("chapter_config")
      .from("identity_prompts")
      .select("id, slug, preset_type")
      .eq("client_key", clientKey)
      .order("created_at", { ascending: false }),
    supabase
      .schema("chapter_config")
      .from("clients")
      .select("storefront_domain")
      .eq("client_key", clientKey)
      .maybeSingle(),
  ]);

  const storefrontDomain = (client as { storefront_domain: string | null } | null)?.storefront_domain ?? null;

  const sinceIso = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .schema("chapter_engagement")
    .from("captured_leads")
    .select(
      "id, captured_at, prompt_slug, email, phone, identity_key, anonymous_id, journey_id, responses_jsonb, consent_mode, consent_declined, page_url, ip_country, cart_token, cart_items_jsonb",
    )
    .eq("client_key", clientKey)
    .gte("captured_at", sinceIso)
    .order("captured_at", { ascending: false })
    .limit(500);

  if (slugFilter) query = query.eq("prompt_slug", slugFilter);
  if (cartOnly) query = query.not("cart_items_jsonb", "is", null);

  const { data: rows, error } = await query;
  if (error) {
    console.error("[leads] fetch failed:", error);
  }
  const leads = ((rows ?? []) as LeadRowFromDb[]).map<LeadRow>((r) => ({
    ...r,
    cart_items_jsonb: r.cart_items_jsonb,
  }));

  // Summary stats — shown in the header alongside the filters
  const withCartCount = leads.filter((l) => Array.isArray(l.cart_items_jsonb) && l.cart_items_jsonb.length > 0).length;
  const totalCartValueCents = leads.reduce((sum, l) => {
    if (!Array.isArray(l.cart_items_jsonb)) return sum;
    return sum + l.cart_items_jsonb.reduce((s: number, it: CartItem) => s + (Number(it.line_price_cents) || 0), 0);
  }, 0);

  return (
    <div className="space-y-8">
      <p className="text-sm text-neutral-500">
        <Link href={`/internal/identity-prompts/${clientKey}`} className="hover:text-orange-700">
          ← Back to {clientKey}
        </Link>
      </p>

      <section>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Captured leads</h2>
            <p className="mt-1 text-sm text-neutral-500 max-w-2xl">
              Email + phone submits captured to <code className="rounded bg-neutral-100 px-1">chapter_engagement.captured_leads</code>.
              Rows with abandoned-cart context (Shopify only) show the cart items + recovery link on expand.
            </p>
          </div>
          <form method="get" className="flex items-center gap-2 flex-wrap">
            <select
              name="slug"
              defaultValue={slugFilter}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="">All prompts</option>
              {(promptList ?? []).map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.slug} ({p.preset_type})
                </option>
              ))}
            </select>
            <select
              name="days"
              defaultValue={daysFilter}
              className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="7">Last 7d</option>
              <option value="30">Last 30d</option>
              <option value="90">Last 90d</option>
              <option value="365">Last year</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm text-neutral-700">
              <input type="checkbox" name="cart_only" value="1" defaultChecked={cartOnly} />
              Carts only
            </label>
            <button
              type="submit"
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Filter
            </button>
            {(slugFilter || cartOnly || daysFilter !== "30") && (
              <Link
                href={`/internal/identity-prompts/${clientKey}/leads`}
                className="text-xs text-neutral-500 hover:text-orange-700"
              >
                Clear
              </Link>
            )}
          </form>
        </div>

        {/* Summary strip */}
        <div className="mt-4 flex gap-6 text-sm text-neutral-700">
          <div>
            <span className="font-semibold">{leads.length}</span>{" "}
            <span className="text-neutral-500">leads</span>
          </div>
          <div>
            <span className="font-semibold">{withCartCount}</span>{" "}
            <span className="text-neutral-500">with abandoned cart</span>
          </div>
          {withCartCount > 0 && (
            <div>
              <span className="font-semibold">
                ${(totalCartValueCents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>{" "}
              <span className="text-neutral-500">total cart value</span>
            </div>
          )}
        </div>
      </section>

      <section>
        {leads.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-300 bg-neutral-50 p-10 text-center">
            <p className="text-sm font-semibold text-neutral-700">No leads yet</p>
            <p className="mt-2 text-xs text-neutral-500">
              {cartOnly
                ? "No leads with abandoned-cart context in this window. Try clearing the Carts-only filter."
                : slugFilter
                  ? `No leads captured for the "${slugFilter}" prompt in this window.`
                  : "Once an Email Exchange or Custom Form is fired and submitted, rows will land here."}
            </p>
          </div>
        ) : (
          <LeadsClient leads={leads} storefrontDomain={storefrontDomain} />
        )}
      </section>
    </div>
  );
}
