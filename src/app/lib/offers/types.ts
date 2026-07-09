// MI v2 Phase 5 — Make an Offer types.
//
// One row per visitor bid in chapter_engagement.offers. Every row transitions
// through a state machine; the terminal states are captured for audit.

// Matches the CHECK constraint on chapter_engagement.offers.status.
export type OfferStatus =
  | "pending_review"      // Bid submitted but below auto-accept, needs operator review
  | "auto_accepted"       // Bid >= auto-accept threshold; code generated + emailed
  | "manually_accepted"   // Operator approved a pending_review offer
  | "countered"           // Operator sent a counter-offer to the visitor
  | "declined"            // Bid rejected (auto or manual)
  | "expired"             // Time-boxed; no action taken
  | "redeemed";           // Marked when the discount code is used (post-checkout hook)

// Shape of the `target_resource_jsonb` column. Describes what the offer is for:
// a specific product, a collection, or the whole store (rare).
export type OfferTargetResource =
  | { type: "product"; product_id: string; product_name?: string; list_price?: number }
  | { type: "collection"; collection_id: string; collection_name?: string }
  | { type: "cart"; cart_snapshot?: unknown }
  | { type: "storewide" };

export type OfferRow = {
  id: bigint;
  client_key: string;
  identity_key: string;      // Visitor's canonical identity (email_sha256 usually)
  prompt_id: string | null;  // FK to chapter_config.identity_prompts.id
  target_resource_jsonb: OfferTargetResource;
  bid_amount: number;
  status: OfferStatus;
  generated_code: string | null;
  counter_amount: number | null;
  expires_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
};

// Evaluator output: decision + rationale + optional counter amount.
export type OfferDecision =
  | {
      action: "auto_accept";
      threshold_applied: {
        target_type: string;
        target_id: string | null;
        threshold_pct: number | null;
        threshold_absolute: number | null;
      };
    }
  | {
      action: "counter";
      counter_amount: number;
      threshold_applied: {
        target_type: string;
        target_id: string | null;
        threshold_pct: number | null;
      };
    }
  | { action: "decline"; reason: string }
  | { action: "review"; reason: string };
