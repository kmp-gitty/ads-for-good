-- Seed chapter_recommendations.rules with the 17 remaining v1 rules from
-- chapter_recommendations_spec_v1.md Part 8. R1.1 / R2.3 / R4.1 are already
-- seeded from Task 3 first push and are NOT re-inserted here.
--
-- Phrasing + action templates are lifted verbatim from the spec; Claude
-- renders these via render-card.ts at cron time, substituting {placeholder}
-- tokens from each evaluator's `data` payload.
--
-- Two rules are seeded with enabled = false (capability-gated, awaiting data
-- ingest): R1.4 (platform-vs-Chapter discrepancy) needs platform conversion
-- data; R5.1 (ROAS vs LTV mismatch) needs spend data. Both evaluators are
-- registered as no-op stubs in src/app/lib/recommendations/rules/index.ts so
-- re-enabling them later is purely a DB flip.
--
-- Apply via Supabase MCP `apply_migration` with name `task_3_seed_remaining_rules_v1`.

INSERT INTO chapter_recommendations.rules
  (rule_id, theme, name, severity_weight, phrasing_template, action_template, action_type, enabled)
VALUES
  -- ─────── THEME 1: Data Integrity & Trust ───────────────────────────────
  ('R1.2', 'data_integrity', 'Identification rate dropped meaningfully', 'high',
   jsonb_build_object(
     'headline', 'Identification rate dropped from {prior_rate}% to {current_rate}% — Chapter is losing track of more customers than usual.',
     'story',    'Over the last {N} weeks, the share of journeys reaching an identified state has dropped {pt_change}pt below the trailing average. This typically indicates a broken or moved identification touchpoint — newsletter signup, account creation, checkout email field — or a change in audience behavior. Lower identification rates reduce the reliability of every cross-session and lifecycle insight Chapter produces.'
   ),
   jsonb_build_object('action', 'Worth investigating: review recent changes to forms, signup flows, or pixel configuration. Compare identification rate by entry channel to isolate whether the drop is broad or concentrated in a specific source.'),
   'analytical', true),

  ('R1.3', 'data_integrity', 'Identity stitching coverage gap', 'high',
   jsonb_build_object(
     'headline', '{stitching_share}% of journeys are being stitched to a canonical identity — {floor_or_drop_clause}.',
     'story',    'Stitching coverage directly affects how much of your customer journey Chapter can see. Identity aliases that fail to link mean repeat customers look like new ones, multi-session journeys break into fragments, and attribution credits scatter across what should be single chapters. Strengthening stitching coverage is the most foundational data-quality lever available.'
   ),
   jsonb_build_object('action', 'Consider reviewing your identity capture points (email signup field, checkout email collection, account creation flow) to ensure they''re firing consistently across browsers and devices. Coordinate with your pixel implementation if any capture point has been recently changed.'),
   'mechanical', true),

  ('R1.4', 'data_integrity', 'Platform-reported vs Chapter-resolved conversion discrepancy', 'high',
   jsonb_build_object(
     'headline', '{platform} is {over_or_under}counting conversions by {discrepancy}% vs Chapter''s identity-resolved view.',
     'story',    '{platform} reports {platform_count} conversions from {channel} this {window}; Chapter resolves {chapter_count} unique identified customers where {channel} was the closing channel. Platform tools typically double-count across devices, sessions, and audiences. This gap is exactly the difference between session-based and identity-resolved attribution.'
   ),
   jsonb_build_object('action', 'Worth investigating: this is the most concrete signal available that platform-driven ROAS calculations are systematically biased. Consider adjusting platform-reported ROAS by Chapter''s discrepancy factor when communicating channel performance to stakeholders.'),
   'analytical', false),  -- capability-gated: needs platform conversion ingest

  -- ─────── THEME 2: Channel Value & Investment ───────────────────────────
  ('R2.1', 'channel_value', 'Channel over-credit risk under last-touch', 'high',
   jsonb_build_object(
     'headline', '{channel} may be over-credited under last-touch attribution.',
     'story',    '{channel} closes {last_touch_share}% of chapters and appears in {presence_share}% of converting paths — but it rarely opens paths ({opener_share}%) and shows weak causal lift ({lift_score}). This is the pattern of a channel benefiting from late-attribution rather than driving outcomes. The credit assigned to {channel} likely overstates its true incremental contribution.'
   ),
   jsonb_build_object('action', 'Consider a structured hold-out test: pause or reduce {channel} for a defined cohort (geo, audience segment, or time window) and measure whether downstream conversion or AOV changes meaningfully. This is the most reliable way to validate the channel''s actual contribution.'),
   'strategic_prompting', true),

  ('R2.2', 'channel_value', 'Channel under-credit risk under last-touch', 'high',
   jsonb_build_object(
     'headline', '{channel} is likely under-credited under last-touch attribution.',
     'story',    '{channel} opens {first_touch_share}% of paths and shows meaningful causal lift ({lift_score}), but only closes {last_touch_share}% under last-touch. Under that model, {channel} looks weak — but {presence_share}% of converting paths involve it, and the incrementality data confirms real contribution. Cutting {channel} based on last-touch ROAS alone would likely under-perform expectations.'
   ),
   jsonb_build_object('action', 'Consider evaluating {channel} under a first-touch or position-based model when making budget decisions. If decisions must be made under last-touch, weight {channel}''s contribution by its lift signal rather than its raw last-touch share.'),
   'strategic_prompting', true),

  ('R2.4', 'channel_value', 'Efficient channel with low spend share', 'medium',
   jsonb_build_object(
     'headline', '{channel} produces efficient outcomes but appears in a small share of paths — possible under-investment.',
     'story',    '{channel}''s lift score ({lift_score}) and revenue-per-touchpoint ({rev_per_touch}) are both top-tier, but it only appears in {presence_share}% of converting chapters. This pattern is consistent with either limited audience size or limited investment. If the constraint is investment, scaling {channel} would likely produce above-average returns.'
   ),
   jsonb_build_object('action', 'Worth investigating: what''s limiting {channel}''s reach? If it''s audience size or partner availability, scaling is harder. If it''s investment, this is a strong candidate for incremental budget allocation tested against current channels.'),
   'analytical', true),

  -- ─────── THEME 3: Channel Synergy & Combinations ───────────────────────
  ('R3.1', 'channel_synergy', 'High-performing channel combination identified', 'medium',
   jsonb_build_object(
     'headline', 'The combination of {channel_a} + {channel_b} converts at {combo_lift}x baseline.',
     'story',    'Customers who interact with both {channel_a} and {channel_b} convert at {combo_rate}%, compared to {a_alone_rate}% for {channel_a} alone and {b_alone_rate}% for {channel_b} alone. This combination has appeared in {combo_count} converting chapters across the last {N} periods. The pattern suggests these channels are working together better than either is working independently.'
   ),
   jsonb_build_object('action', 'Worth investigating: are your campaigns coordinating across {channel_a} and {channel_b}, or are they running in isolation? Combinations that convert together often benefit from intentional sequencing — for example, awareness on one channel feeding retargeting on the other.'),
   'analytical', true),

  ('R3.2', 'channel_synergy', 'Lagged channel influence detected', 'medium',
   jsonb_build_object(
     'headline', '{channel_a} activity precedes {channel_b} conversions by {lag_days} days — pausing {channel_a} would likely reduce {channel_b}''s apparent performance.',
     'story',    'Chapter''s lagged-impact analysis shows a {correlation} correlation between {channel_a} activity and {channel_b} conversions {lag_days} days later. This is the pattern of {channel_a} doing upstream work — driving awareness, consideration, or initial interest — that materializes as conversions through {channel_b}. The two channels appear independent in same-day reporting, but the data shows real cross-influence.'
   ),
   jsonb_build_object('action', 'Worth investigating: when budget decisions are made about {channel_a}, account for its lagged effect on {channel_b}. If {channel_a} is paused or reduced, expect {channel_b}''s performance to decline {lag_days}+ days later. This is critical for accurate ROAS calculations across the pair.'),
   'analytical', true),

  ('R3.3', 'channel_synergy', 'New emerging combination', 'low',
   jsonb_build_object(
     'headline', 'A new combination is emerging: {channel_set} produced {N} converting chapters this {window}, up from {prior_N} in prior periods.',
     'story',    'The combination {channel_set} was nearly absent from your converting paths until this period. It''s now appearing at {current_count} chapters with conversion rate {conv_rate}% — above the dashboard baseline. Emerging combinations often signal something changed: a new partner relationship, a campaign launch, or a shift in audience behavior. Identifying what''s driving the change while it''s fresh is easier than retroactively reconstructing it.'
   ),
   jsonb_build_object('action', 'Worth investigating: what changed in your campaigns, partnerships, or audience in the last {window} that could explain the emergence of this combination? Confirming the driver lets you reinforce intentional shifts or correct accidental ones.'),
   'analytical', true),

  -- ─────── THEME 4: Customer Lifecycle Health ────────────────────────────
  ('R4.2', 'lifecycle_health', 'Time-to-close growing meaningfully', 'medium',
   jsonb_build_object(
     'headline', 'Median time from first visit to purchase has grown to {current_days} days, up from {prior_days}.',
     'story',    'Time-to-close has lengthened by {pct_change}% over the last {N} weeks. Longer consideration cycles often warrant different channel strategies — more nurture, less direct response. They can also indicate that recent audience acquisition is colder than usual, that pricing or product positioning is being re-evaluated by customers, or that competitive dynamics have shifted.'
   ),
   jsonb_build_object('action', 'Worth investigating: compare time-to-close by entry channel. If colder channels are growing as a share of acquisition, the lengthening is mix-driven. If the lengthening is uniform across channels, audience or market dynamics are likely the cause.'),
   'analytical', true),

  ('R4.3', 'lifecycle_health', 'Single-touch close rate shifting', 'medium',
   jsonb_build_object(
     'headline', 'Single-touch closes shifted from {prior_share}% to {current_share}% — {direction_clause}',
     'story',    'Single-touch closes are the cleanest signal of warm-audience conversions. A material shift in either direction reframes how attribution should be read. {direction_specific_context_paragraph}.'
   ),
   jsonb_build_object('action', 'Worth investigating: which channels are producing the additional single-touch closes? If it''s returning customers via direct or email, the change is healthy. If it''s new sources gaming a single touchpoint, attribution may be hiding other contributions.'),
   'analytical', true),

  -- ─────── THEME 5: Customer Quality & LTV ───────────────────────────────
  ('R5.1', 'customer_quality', 'Channel ROAS vs customer quality mismatch', 'high',
   jsonb_build_object(
     'headline', '{channel} shows weak day-1 ROAS but acquires customers with {quality_multiplier}x higher long-term value.',
     'story',    '{channel}''s immediate ROAS is in the bottom tertile of your channel mix, but customers acquired through it show {quality_signal} at {quality_multiplier}x the baseline. Day-1 ROAS understates {channel}''s contribution because the customers it produces are higher-value over time. Evaluating {channel} only on first-purchase economics likely undersells it.'
   ),
   jsonb_build_object('action', 'Consider evaluating {channel} on cohort LTV (3-month, 6-month, or annual) rather than first-purchase ROAS alone. If the LTV multiplier holds, {channel} is producing premium customers at a lower acquisition cost than the headline ROAS suggests.'),
   'strategic_prompting', false),  -- capability-gated: needs spend ingest

  ('R5.2', 'customer_quality', 'Acquisition channel quality differs', 'medium',
   jsonb_build_object(
     'headline', 'Customers acquired through {high_quality_channel} produce {quality_multiplier}x more long-term value than those acquired through {low_quality_channel}.',
     'story',    'Across {n} customers acquired through {high_quality_channel}, average {quality_metric} is {high_value}; for {n2} customers acquired through {low_quality_channel}, the same metric is {low_value}. This is a {quality_multiplier}x difference in customer value by acquisition source — a signal that the two channels are producing fundamentally different customer types, not just different conversion volumes.'
   ),
   jsonb_build_object('action', 'Worth investigating: when comparing channel performance, weight by customer quality rather than acquisition cost alone. The channel with weaker first-purchase economics may be producing the better long-term customer.'),
   'analytical', true),

  ('R5.3', 'customer_quality', 'Repeat-purchaser source concentration', 'medium',
   jsonb_build_object(
     'headline', '{channel} drives repeat customers at {multiplier}x its acquisition share — it''s a retention engine, not just an acquisition channel.',
     'story',    '{channel} appears in {first_purchase_share}% of first-purchase chapters but {repeat_share}% of repeat-purchase chapters. This is a {multiplier}x concentration in returning-customer activity, suggesting {channel} is what brings customers back rather than what brings them in. Evaluating it only on first-purchase metrics misses the retention contribution.'
   ),
   jsonb_build_object('action', 'Worth investigating: how is {channel} being measured today? If it''s evaluated only on first-purchase ROAS, the retention work it does is invisible. Consider segmenting {channel}''s performance into acquisition vs retention cohorts for a clearer picture of its value.'),
   'analytical', true),

  -- ─────── THEME 6: Emerging Patterns ────────────────────────────────────
  ('R6.1', 'emerging_patterns', 'New channel newly material to conversions', 'low',
   jsonb_build_object(
     'headline', '{channel} has gone from {prior_share}% to {current_share}% of converting chapters this {window} — new presence worth investigating.',
     'story',    '{channel} was nearly absent from your converting paths in prior periods. This {window}, it''s involved in {current_count} converting chapters and {current_share}% of all conversions. New channel emergence often signals a deliberate change — a partnership launch, a campaign extension, or a new audience source — or an organic shift like a viral mention. Confirming the cause makes it easier to reinforce or reproduce.'
   ),
   jsonb_build_object('action', 'Worth investigating: what changed in the last {window} that could explain {channel}''s emergence? Partnerships, ad placements, organic mentions, or new audience targeting are the usual candidates. Understanding the driver is the difference between a one-time spike and a repeatable lever.'),
   'analytical', true),

  ('R6.2', 'emerging_patterns', 'Sustained directional trend across the lifecycle', 'low',
   jsonb_build_object(
     'headline', '{metric_name} has moved {direction} for {N} consecutive periods, a cumulative {pct_change}% shift.',
     'story',    'Week-to-week movement in {metric_name} has been small, but {N} consecutive periods of {direction_word} change is now material — a cumulative {pct_change}% shift from {trend_start_value} to {current_value}. Sustained directional trends in core lifecycle metrics often outpace single-channel changes in business impact. Worth interpreting now while the trend is still legible.'
   ),
   jsonb_build_object('action', 'Worth investigating: what changed at the start of the trend? Cross-reference the trend''s start date against campaign launches, channel shifts, audience changes, or product/UX updates. Understanding the driver matters more here than reacting to the metric itself.'),
   'analytical', true),

  ('R6.3', 'emerging_patterns', 'Outlier behavior detected', 'medium',
   jsonb_build_object(
     'headline', '{metric_name} hit {current_value} this {window} — outside the normal range of {expected_low}-{expected_high}.',
     'story',    '{metric_name} has moved {n_sigma} standard deviations from its 8-week trailing distribution. Outliers like this can indicate: (a) a real business event worth understanding (campaign success, viral moment, competitor change), (b) a data quality issue not yet flagged, or (c) a one-time anomaly that will revert. Quickly distinguishing between these is high-leverage.'
   ),
   jsonb_build_object('action', 'Worth investigating: cross-reference the outlier period against campaign launches, news events, technical changes (deploy logs, pixel changes), and competitor activity. If no business cause is identifiable, treat as a data integrity concern.'),
   'analytical', true)

ON CONFLICT (rule_id) DO NOTHING;
