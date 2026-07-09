// MI v2 Phase 5 — Offer state machine.
//
// Encodes the valid state transitions for chapter_engagement.offers.status.
// Every user-triggered transition (visitor bid, operator approve/counter/
// decline, code redemption) must go through one of the transition helpers
// here — they enforce the DAG below and touch the audit fields consistently.
//
//   pending_review ──[operator approve]──→ manually_accepted
//                  └─[operator counter]──→ countered
//                  └─[operator decline]──→ declined
//                  └─[time]───────────────→ expired
//
//   auto_accepted ──[checkout redeemed]───→ redeemed
//   manually_accepted ──[checkout]────────→ redeemed
//   countered ──[visitor accepts]─────────→ manually_accepted
//              └─[visitor rejects]─────────→ declined
//
// Terminal states (no outgoing transitions): declined, expired, redeemed.
//
// The `chapter_engagement.offers` table has NO CHECK constraint enforcing
// these transitions server-side — that's intentional so backfill / repair
// operations don't need special privilege. This module is the enforcement.

import type { OfferStatus } from "./types";

// Which starting statuses can transition to a given target.
const VALID_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  pending_review: ["manually_accepted", "countered", "declined", "expired"],
  auto_accepted:  ["redeemed"],
  manually_accepted: ["redeemed"],
  countered:      ["manually_accepted", "declined", "expired"],
  declined:       [],
  expired:        [],
  redeemed:       [],
};

export function isValidTransition(from: OfferStatus, to: OfferStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: OfferStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}
