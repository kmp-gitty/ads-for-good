// Billable self-serve tools ↔ Stripe Price IDs. Separate subscription per tool.
//
// Defaults are the TEST-mode price IDs; override per env for live
// (STRIPE_PRICE_SMART_PROMPTS / STRIPE_PRICE_SMART_LINKS) when you swap to the
// rk_live_ key so test/live stay clean.

export type BillableTool = "smart_prompts" | "smart_links";

export const BILLABLE_TOOLS: BillableTool[] = ["smart_prompts", "smart_links"];

export const TOOL_LABEL: Record<BillableTool, string> = {
  smart_prompts: "Smart Prompts",
  smart_links: "Smart Links",
};

export const PRICE_ID: Record<BillableTool, string> = {
  smart_prompts: process.env.STRIPE_PRICE_SMART_PROMPTS || "price_1TwMPgBUFVgXbJPZdDpdMdeI",
  smart_links: process.env.STRIPE_PRICE_SMART_LINKS || "price_1TwMWvBUFVgXbJPZsZjrSvFh",
};

export function isBillableTool(t: string): t is BillableTool {
  return (BILLABLE_TOOLS as string[]).includes(t);
}

export function toolForPriceId(priceId: string | null | undefined): BillableTool | null {
  if (!priceId) return null;
  for (const t of BILLABLE_TOOLS) if (PRICE_ID[t] === priceId) return t;
  return null;
}

// Subscription statuses that grant access to the tool.
export const ACTIVE_SUB_STATUSES = new Set(["trialing", "active", "past_due"]);
