// MI v2 Phase 5 — Offer evaluator.
//
// Given a visitor bid + target resource + client config, decide whether to
// auto-accept, counter, decline, or route to manual review. Deterministic —
// no randomness so behavior is reproducible in tests.
//
// Threshold hierarchy (first match wins):
//   1. Product-specific threshold  (target_type = 'product', target_id = product_id)
//   2. Collection threshold        (target_type = 'collection', target_id = collection_id)
//   3. Global default              (target_type = 'global', target_id = null)
//   4. Hardcoded fallback          (auto-accept at 90% of list_price; no counter)
//
// Threshold row shape (from chapter_config.offer_thresholds):
//   threshold_pct       — bid must be >= list_price * (threshold_pct / 100) to auto-accept
//   threshold_absolute  — bid must be >= threshold_absolute to auto-accept
//   Both nullable; at least one is used per row. If both are set the effective
//   threshold is the MAX of the two (whichever is stricter — more protective).
//
// Counter logic:
//   If bid is between COUNTER_FLOOR_PCT (default 60%) and threshold, offer a
//   counter halfway between bid and threshold. Below floor → decline. Route
//   to manual review only when the platform + threshold config is missing.

import { createClient } from "@supabase/supabase-js";
import type { OfferDecision, OfferTargetResource } from "./types";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COUNTER_FLOOR_PCT = 60;         // Below this we decline outright
const FALLBACK_AUTO_ACCEPT_PCT = 90;  // Used when no threshold row is configured
const CACHE_TTL_MS = 60 * 1000;       // Thresholds change rarely; 60s cache OK

type ThresholdRow = {
  target_type: string;
  target_id: string | null;
  threshold_pct: number | null;
  threshold_absolute: number | null;
  active: boolean;
};

const cache = new Map<string, { rows: ThresholdRow[]; fetchedAt: number }>();

async function loadThresholds(client_key: string): Promise<ThresholdRow[]> {
  const now = Date.now();
  const cached = cache.get(client_key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.rows;

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("offer_thresholds")
    .select("target_type, target_id, threshold_pct, threshold_absolute, active")
    .eq("client_key", client_key)
    .eq("active", true);

  if (error || !data) {
    console.error("[offer-evaluator] threshold load failed:", error);
    return [];
  }

  const rows = data as ThresholdRow[];
  cache.set(client_key, { rows, fetchedAt: now });
  return rows;
}

export function clearThresholdCache(client_key?: string): void {
  if (client_key) cache.delete(client_key);
  else cache.clear();
}

// Pick the most specific active threshold for a target. Returns null when the
// hierarchy exhausts without a match — caller falls back to the hardcoded rule.
function pickThreshold(
  rows: ThresholdRow[],
  target: OfferTargetResource,
): ThresholdRow | null {
  if (target.type === "product") {
    const product = rows.find(
      (r) => r.target_type === "product" && r.target_id === target.product_id,
    );
    if (product) return product;
  }
  if (target.type === "collection") {
    const collection = rows.find(
      (r) => r.target_type === "collection" && r.target_id === target.collection_id,
    );
    if (collection) return collection;
  }
  const global = rows.find((r) => r.target_type === "global" && r.target_id === null);
  return global ?? null;
}

// Compute the effective absolute-price threshold. Combines threshold_pct
// (against list_price) and threshold_absolute — takes the max so both floors
// are honored when both are set.
function computeAbsoluteThreshold(
  row: ThresholdRow,
  list_price: number | null,
): number | null {
  const fromPct = row.threshold_pct != null && list_price != null
    ? list_price * (row.threshold_pct / 100)
    : null;
  const fromAbs = row.threshold_absolute;
  if (fromPct != null && fromAbs != null) return Math.max(fromPct, fromAbs);
  return fromPct ?? fromAbs;
}

// Round counter amounts to 2 decimals so emails don't render like $34.66667.
function money(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function evaluateOffer(input: {
  client_key: string;
  target: OfferTargetResource;
  bid_amount: number;
  list_price?: number | null;
}): Promise<OfferDecision> {
  const { client_key, target, bid_amount } = input;
  const list_price = input.list_price ?? null;

  // Sanity-guard: negative or zero bids are rejected outright, no threshold
  // math needed. Empty modal submissions land here.
  if (bid_amount <= 0) {
    return { action: "decline", reason: "invalid_bid_amount" };
  }

  const rows = await loadThresholds(client_key);
  const threshold_row = pickThreshold(rows, target);

  // Without a threshold row AND without a list_price, we can't compare — route
  // to manual review so the operator can decide.
  if (!threshold_row && list_price == null) {
    return { action: "review", reason: "no_threshold_configured_and_no_list_price" };
  }

  const auto_accept_at = threshold_row
    ? computeAbsoluteThreshold(threshold_row, list_price)
    : list_price != null
      ? list_price * (FALLBACK_AUTO_ACCEPT_PCT / 100)
      : null;

  if (auto_accept_at == null) {
    return { action: "review", reason: "cannot_compute_threshold" };
  }

  if (bid_amount >= auto_accept_at) {
    return {
      action: "auto_accept",
      threshold_applied: {
        target_type: threshold_row?.target_type ?? "fallback",
        target_id: threshold_row?.target_id ?? null,
        threshold_pct: threshold_row?.threshold_pct ?? FALLBACK_AUTO_ACCEPT_PCT,
        threshold_absolute: auto_accept_at,
      },
    };
  }

  // Counter zone: bid below auto-accept but above floor.
  const counter_floor = list_price != null
    ? list_price * (COUNTER_FLOOR_PCT / 100)
    : auto_accept_at * (COUNTER_FLOOR_PCT / FALLBACK_AUTO_ACCEPT_PCT);

  if (bid_amount >= counter_floor) {
    // Counter halfway between the bid and auto-accept threshold. Feels fair
    // and shows the visitor we noticed their number.
    const counter_amount = money((bid_amount + auto_accept_at) / 2);
    return {
      action: "counter",
      counter_amount,
      threshold_applied: {
        target_type: threshold_row?.target_type ?? "fallback",
        target_id: threshold_row?.target_id ?? null,
        threshold_pct: threshold_row?.threshold_pct ?? FALLBACK_AUTO_ACCEPT_PCT,
      },
    };
  }

  return { action: "decline", reason: "bid_below_counter_floor" };
}
