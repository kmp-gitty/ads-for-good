# NSC Google Ads — server-side conversion rollout runbook

Order of operations for finishing the Not So Cavalier "Booking Start (server)"
migration. Each phase has a **gate** (what "good" means, measurably), the
**action**, how to **verify**, and the **guardrail** (what "bad" looks like +
fallback). Advance one phase at a time — never skip a gate.

Client: `not_so_cavalier` · customer_id `1924553260` · conversion action
"Booking Start (server)" (import) · bid strategy: Maximize Conversions, tCPA $13.

---

## Phase 0 — Shipped (Aug 19, 2026)

- Client-side gclid capture in `pixel.js` (`d15eb7a`): landing reads the click id
  from the URL → writes the first-party `chapter_entry` cookie on
  `.notsocavalier.com` → book-now redirect reads it → records the conversion.
- **Tracking template still in place** (double-bounce), by design — prove the fix
  with one variable changed at a time.
- **Bidding is safe:** "Booking Start – Click to Square" (the client-side tag,
  307 conv) is **Primary**; "Booking Start (server)" is **Secondary + Inactive**.
  Smart Bidding runs on the tag throughout Phases 1–2.

---

## Phase 1 — Watch conversions roll in  ← CURRENT

- **Gate (good):** `chapter_engagement.gads_click_conversions` for NSC starts
  filling, the Google Ads "Booking Start (server)" action flips **Inactive →
  Active**, and the rows look legitimate (real paid book-now flows). Target a
  small but real cluster — say **≥3–5 conversions over ~1–2 weeks**. Volume is
  inherently low (~4 paid clicks/day, and only same-browser ad→book-now within
  the window qualifies), so give it time.
- **Action:** none — just watch. It works with the template still in place
  because the gclid already lands on `/services` via auto-tagging.
- **Verify:** ledger count + freshness (query below); Google Ads shows the action
  Active with conversions.
- **Guardrail (bad):** if after ~2 weeks the ledger is **still 0** despite paid
  clicks + book-now clicks, the capture or cookie isn't surviving even
  same-session → diagnose before advancing. Re-check `/services` landings carry
  gclid, and confirm same-browser ad→book-now is actually happening.

---

## Phase 2 — Remove the tracking template

- **Precondition:** Phase 1 gate met (conversions flowing).
- **Action (Google Ads, your side):** remove the tracking template so ads land
  directly on `notsocavalier.com/services` — kills the `chapter → google.com →
  site` double-bounce. (Alternative: switch to **parallel tracking** if you want
  to keep the server-side `redirect_click` log without the user-facing bounce.)
  Removing it does **not** break capture — auto-tagging still puts gclid on the
  landing URL.
- **Gate (good):** conversions **keep flowing** after removal; `/services`
  landings still carry gclid; auto-tagging confirmed still ON.
- **Verify:** `/services` landings still show gclid in `partner_ids`; ledger keeps
  filling; ideally crossover/volume ticks up (less bounce = better persistence).
- **Guardrail (bad):** conversions drop to 0 after removal → re-add the template
  (unlikely; auto-tagging is independent of the template).

---

## Phase 3 — Swap Primary to the server conversion

- **Precondition:** Phase 2 gate met; server action has **~1–2 weeks of data**;
  in a like-for-like compare the **server count ≥ the tag count, especially on
  mobile** (the whole point — recovering the mobile beacon-race under-count).
- **Action (Google Ads):** in the "Book appointment" goal, promote **Booking
  Start (server) → Primary** and demote **Booking Start – Click to Square →
  Secondary**. (This is the flip we deferred; it hands bidding to the accurate
  signal.) Never run both Primary — same-visit paid bookings would double-count.
- **Gate (good):** after the swap, tCPA stays healthy — CPA doesn't spike vs the
  **July 6 baseline ($12.02 CPA / 28.2% CVR)**, and conversion volume is adequate
  for Smart Bidding.
- **⚠ Real tension to weigh here:** the server action captures **fewer**
  conversions than the tag (only paid-attributed, connected ones). Max
  Conversions / tCPA optimizes best with volume (~15–30+ conv/mo is a healthy
  band). If server volume is much lower than the tag, bidding can get noisy — in
  that case the *more accurate* signal may still be the *worse bidding* signal.
  Only swap if server volume is sufficient, or accept the accuracy-vs-volume
  trade-off deliberately. Otherwise keep the tag Primary and use the server
  action as an observed Secondary.
- **Minimize flips** — each Primary change nudges Smart Bidding into a short
  re-learning. Plan: this one flip, then leave it.
- **Verify:** watch CPA + conversion volume ~2 weeks post-swap vs the July 6
  baseline and the pre-swap period.
- **Guardrail (bad):** CPA climbs materially or volume too thin for stable
  bidding → revert to tag Primary, keep server Secondary, revisit after Phase 4.

---

## Phase 4 — Durable upgrade (past Safari's 7-day cap)

- **Precondition:** Phase 3 gate met **AND** evidence the 7-day cap is actually
  costing conversions — i.e. real bookings landing **1–4 weeks after the ad
  click on Safari** that we're missing. Don't build speculatively.
- **Why:** the shipped capture writes the cookie via `document.cookie`
  (JavaScript), which Safari ITP caps at ~7 days regardless of the 90-day
  Max-Age or the A-record. The durable path rides the **server-set, A-record
  identity** instead (not 7-day-capped — the reason NSC moved to the A-record
  Aug 11).
- **Action (two options, either works):**
  - **(A) Server-set the cookie:** move the `chapter_entry` write from `pixel.js`
    `document.cookie` to a `Set-Cookie` header on the collect endpoint's response
    (already on `chapter.notsocavalier.com`, the A-record host) when the incoming
    page_view carries a click id.
  - **(B) up_anon + DB lookup:** at book-now, resolve the durable server-set
    `up_anon` identity and look up that identity's landing gclid from the DB —
    no gclid cookie needed at all.
- **Gate (good):** server conversion volume rises (capturing the longer-tail
  Safari bookings) with **no double-counting** (ledger dedup per
  (client, click id, action) still holds).
- **Verify:** conversion volume increase; the added conversions correspond to
  longer ad→book gaps.

---

## Signals cheat-sheet (queries to run)

**Ledger fill + freshness (Phase 1/2 gate):**
```sql
select count(*) as total, max(conversion_ts) as latest,
       count(*) filter (where conversion_ts >= now() - interval '7 days') as last_7d
from chapter_engagement.gads_click_conversions where client_key='not_so_cavalier';
```

**Landing still carries gclid (Phase 2 verify):**
```sql
select count(*) as services_pv,
  count(*) filter (where (partner_ids->>'gclid') is not null
                     or (partner_ids->>'gbraid') is not null
                     or (partner_ids->>'wbraid') is not null) as with_clickid
from chapter_ingest.pixel_events
where client_key='not_so_cavalier' and event_name='page_view'
  and page_path ilike '%/services%' and ts >= now() - interval '7 days';
```

## Related calendar items (separate but overlapping)

- **NSC 1P durability re-measure ~early Sept** (baseline: 263 gads clickers →
  1–2 book-now crossovers). Rising crossover = the A-record + capture working.
- **Re-baseline vs July 6** ($12.02 CPA / 28.2% CVR) — the reference for Phase 3.
- **tCPA revisit** — only after re-baseline, and only if CPA has settled < $13.
