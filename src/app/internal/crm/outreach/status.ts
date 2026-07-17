// Outreach status derivation. Pure function + config constants — kept in
// isolation so a future scheduled edge function or n8n workflow can reuse
// the exact same status logic without going through the React component.
//
// See spec.md "Extensibility: Reminders" — this file is the single source
// of truth for what "Follow-up due" and "Stale" mean.

/** Days since last outbound before we call it "Follow-up due". */
export const FOLLOWUP_DUE_AFTER_DAYS = 7;

/** Days since last outbound before we call it "Stale". */
export const STALE_AFTER_DAYS = 14;

export type OutreachStatus =
  | "no_activity"
  | "meeting_booked"
  | "replied"
  | "awaiting_reply"
  | "followup_due"
  | "stale";

/**
 * Given aggregated communication signals for a prospect, return their status.
 *
 * Precedence (highest first — reflects funnel progression, not chronological
 * order of statuses):
 *   1. meeting_booked  — any channel='meeting' row exists
 *   2. replied         — at least one inbound communication
 *   3. no_activity     — zero communications
 *   4. awaiting_reply  — outbound only, last one < FOLLOWUP_DUE_AFTER_DAYS
 *   5. followup_due    — outbound only, between FOLLOWUP_DUE_AFTER_DAYS and STALE
 *   6. stale           — outbound only, ≥ STALE_AFTER_DAYS
 */
export function deriveOutreachStatus(input: {
  hasOutbound: boolean;
  hasInbound: boolean;
  hasMeeting: boolean;
  daysSinceLastOutbound: number | null;
}): OutreachStatus {
  if (input.hasMeeting) return "meeting_booked";
  if (input.hasInbound) return "replied";
  if (!input.hasOutbound) return "no_activity";
  const d = input.daysSinceLastOutbound ?? 0;
  if (d >= STALE_AFTER_DAYS) return "stale";
  if (d >= FOLLOWUP_DUE_AFTER_DAYS) return "followup_due";
  return "awaiting_reply";
}

export const OUTREACH_STATUS_LABEL: Record<OutreachStatus, string> = {
  no_activity: "No activity",
  meeting_booked: "Meeting booked",
  replied: "Replied",
  awaiting_reply: "Awaiting reply",
  followup_due: "Follow-up due",
  stale: "Stale",
};
