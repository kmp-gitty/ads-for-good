# Outreach Tracker

Read-only visualization of prospect touchpoint activity from `crm.communications`.
Rendered as a section on `/internal/crm` (matches the existing section pattern —
no tab UI exists on the page, just stacked sections).

## Files

- `status.ts` — pure status derivation + threshold constants. This is the
  single source of truth for what "Follow-up due" / "Stale" mean. A future
  scheduled reminder job (edge function or n8n workflow) should import
  `deriveOutreachStatus` from here so it never diverges from what the UI
  displays.
- `OutreachTracker.tsx` — client component. Filters, sort, table, activity
  feed. Read-only; no mutations.

## Status logic

```
if has any channel='meeting' row     → meeting_booked
else if has any inbound              → replied
else if no communications at all     → no_activity
else (outbound-only):
  daysSinceLastOutbound >= STALE_AFTER_DAYS       → stale         (default 14)
  daysSinceLastOutbound >= FOLLOWUP_DUE_AFTER_DAYS → followup_due (default 7)
  else                                             → awaiting_reply
```

## Tuning thresholds

Change the constants in `status.ts`:

- `FOLLOWUP_DUE_AFTER_DAYS` — currently 7
- `STALE_AFTER_DAYS` — currently 14

## Data fetch

Aggregation happens in the parent server component (`page.tsx`). Two queries:
1. All prospects (76 rows currently)
2. All communications (small — 20 rows currently)

The join + group-by is done in TypeScript. When the communication table grows
past a few thousand rows, migrate to a Postgres view (`crm.v_prospect_outreach_summary`)
per the spec's suggestion. The view SQL is in the spec doc.

## Adding a channel or status

- New `channel` values (e.g. `sms`, `whatsapp`) automatically appear in the
  filter dropdown because `distinctChannels` is derived from the data. No code
  changes needed.
- New status values require: (a) adding to `OutreachStatus` union, (b) adding
  to `OUTREACH_STATUS_LABEL`, (c) adding a color case in `statusPillClasses`,
  (d) updating `deriveOutreachStatus` precedence logic.
