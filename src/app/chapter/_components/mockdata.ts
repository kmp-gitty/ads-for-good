// Mock data for Chapter Dashboard v1 (ported from Claude Design handoff/data.js).
// Mirrors the production data shapes. Each page-wiring session replaces a slice
// of this with a Supabase query — see /docs/chapter-reference.md for the schema.

// ---------- Types ----------

// Both styles coexist during the page-by-page wire-up:
//   - snake_case keys (direct, organic, paid_search, paid_social) are used by
//     still-mocked pages: attribution, journeys, overview, lift, channels.
//   - RPC-format keys ("(direct)", "organic search", "paid search",
//     "paid social", "organic social", "(unknown)") match the strings emitted
//     by chapter_reporting.channel_performance_overview and any future live
//     RPC. Single source of truth for display name + color.
// Each page swaps from snake_case to RPC-format when its loader goes live.
export type ChannelKey =
  | "direct"
  | "email"
  | "organic"
  | "paid_search"
  | "meta"
  | "paid_social"
  | "tiktok"
  | "referral"
  | "affiliate"
  | "sms"
  | "(direct)"
  | "organic search"
  | "paid search"
  | "paid social"
  | "organic social"
  | "(unknown)";

export type Channel = { name: string; color: string; short: string };

export type Client = {
  id: string;
  name: string;
  tier: "Starter" | "Mid" | "Top";
  color: string;
};

export type Kpi = {
  label: string;
  value: string;
  move: number;
  good: boolean | null;
  semantic: "up-good" | "down-bad" | "down-good" | "neutral";
};

export type LifecycleMetric = {
  label: string;
  value: string;
  unit: string;
  move: number;
  good: boolean | null;
  foot: string;
};

export type PathLengthPoint = { wk: string; median: number; p90: number };

export type TopCombo = {
  id: string;
  channels: ChannelKey[];
  chapters: number;
  revenue: number;
  aov: number;
  avgTouches: number;
  move: number;
  isNew?: boolean;
};

export type ChannelRole = {
  key: ChannelKey;
  dominant: "Closer" | "Opener" | "Middle" | "Generalist";
  role: { only: number; open: number; mid: number; close: number };
  sentence: string;
  presence: { value: string; move: number };
  revenue: { value: string; move: number };
  chapters: { value: string; move: number };
};

export type AttributionModel = "first" | "last" | "linear" | "custom";

export type AttributionChannel = {
  key: ChannelKey;
  first: number;
  last: number;
  linear: number;
  custom: number;
};

export type Observation = {
  id: string;
  severity: "high" | "med" | "low";
  state: "new" | "standing" | "changed";
  category: string;
  actionType: "mechanical" | "analytical" | "strategic_prompting";
  headline: string;
  data?: { label: string; value: string }[];
  action: string;
  timestamp: string;
  page: string;
  pageLabel: string;
};

export type Journey = {
  id: string;
  identity: string;
  chapters: number;
  touches: number;
  last: string;
  outcome: "converted" | "stalled" | "open";
  value: string;
};

export type JourneyEvent = {
  day: number;
  channel: ChannelKey;
  type: string;
  chapter: number;
  label: string;
  identify?: boolean;
  boundary?: boolean;
  value?: number;
};

export type JourneyDetail = {
  id: string;
  identity: string;
  customerId: string;
  firstSeen: string;
  resolved: string;
  totalEvents: number;
  chapters: number;
  outcome: string;
  stitched: string[];
  events: JourneyEvent[];
};

export type FunnelStep = { step: string; count: number; share: number; drop: number | null };

export type ChannelPerf = {
  key: ChannelKey;
  journeys: number;
  orders: number;
  revenue: number;
  cr: number;
};

export type LiftCorrelation = {
  id: string;
  channel: ChannelKey;
  metric: string;
  headline: string;
  with: { aov: number; conv: number; revPer: number; n: number };
  without: { aov: number; conv: number; revPer: number; n: number };
  lift: { aov: number; conv: number; revPer: number };
  caveat: string;
};

export type LiftIncrementality = {
  id: string;
  channel: ChannelKey;
  metric: string;
  headline: string;
  test: { aov: number; n: number; unit?: string };
  ctrl: { aov: number; n: number; unit?: string };
  lift: number;
  ci: [number, number];
  pvalue: number;
  power: number;
  method: string;
  design: string;
  caveat: string;
  significant: boolean;
};

// ---------- Data ----------

export const CHANNELS: Record<ChannelKey, Channel> = {
  direct:       { name: "Direct",         color: "#1F2D43", short: "DR" },
  email:        { name: "Email",          color: "#E36410", short: "EM" },
  organic:      { name: "Organic Search", color: "#2E7D5B", short: "OS" },
  paid_search:  { name: "Paid Search",    color: "#3F6FB5", short: "PS" },
  meta:         { name: "Meta",           color: "#5868D6", short: "MT" },
  paid_social:  { name: "Paid Social",    color: "#8B5BC9", short: "SO" },
  tiktok:       { name: "TikTok",         color: "#0F1722", short: "TT" },
  referral:     { name: "Referral",       color: "#B26B2A", short: "RF" },
  affiliate:    { name: "Affiliate",      color: "#7A6720", short: "AF" },
  sms:          { name: "SMS",            color: "#C9550B", short: "SM" },
  // RPC-format aliases (same display semantics, just key shape differs).
  "(direct)":        { name: "Direct",          color: "#1F2D43", short: "DR" },
  "organic search":  { name: "Organic Search",  color: "#2E7D5B", short: "OS" },
  "paid search":     { name: "Paid Search",     color: "#3F6FB5", short: "PS" },
  "paid social":     { name: "Paid Social",     color: "#8B5BC9", short: "SO" },
  "organic social":  { name: "Organic Social",  color: "#5868D6", short: "SO" },
  "(unknown)":       { name: "Unknown",         color: "#9CA0A8", short: "UN" },
};

// IMPORTANT: `id` MUST match the client_key in chapter_config.client_secrets.
// This value flows into the dashboard URL (?client=<id>) and into every
// server-side query's WHERE clause. Onboarding a new client requires:
//   1. INSERT into chapter_config.client_secrets with this client_key
//   2. CREATE ROLE client_<client_key> + grants (per Fix #26 Part 2)
//   3. Add a row here with id = that same client_key
export const CLIENTS: Client[] = [
  { id: "eos_fabrics",        name: "Client A",           tier: "Mid",     color: "#E36410" },
  { id: "projectagram_reels", name: "Client B",           tier: "Mid",     color: "#5868D6" },
  { id: "adsforgood_prod",    name: "Client C",           tier: "Top",     color: "#2E7D5B" },
];

export const KPI: Kpi[] = [
  { label: "Orders",       value: "1,847",    move: -2.4,  good: false, semantic: "down-bad" },
  { label: "Revenue",      value: "$418,290", move: +8.6,  good: true,  semantic: "up-good" },
  { label: "AOV",          value: "$226.49",  move: +11.3, good: true,  semantic: "up-good" },
  { label: "Journeys",     value: "84,612",   move: +14.2, good: null,  semantic: "neutral" },
  { label: "% Identified", value: "31.4%",    move: +1.8,  good: true,  semantic: "up-good" },
];

export const LIFECYCLE_METRICS: LifecycleMetric[] = [
  { label: "Avg touches to close",  value: "7.4",  unit: "touches", move: +0.8, good: false, foot: "median across 1,847 closed chapters" },
  { label: "Avg time to close",     value: "12",   unit: "days",    move: -1.2, good: true,  foot: "median; p90 = 41 days" },
  { label: "Multi-touch share",     value: "78",   unit: "%",       move: +3.4, good: true,  foot: "of converting chapters" },
  { label: "Identification rate",   value: "31.4", unit: "%",       move: +1.8, good: true,  foot: "of non-bot journeys" },
  { label: "Returning purchasers",  value: "42",   unit: "%",       good: null, move: -2.1, foot: "vs. 58% first-time" },
];

export const PATH_LENGTH_TREND: PathLengthPoint[] = [
  { wk: "W1", median: 5.8, p90: 14 },
  { wk: "W2", median: 6.1, p90: 15 },
  { wk: "W3", median: 5.9, p90: 14 },
  { wk: "W4", median: 6.2, p90: 16 },
  { wk: "W5", median: 6.4, p90: 17 },
  { wk: "W6", median: 6.6, p90: 18 },
  { wk: "W7", median: 6.7, p90: 19 },
  { wk: "W8", median: 6.9, p90: 19 },
  { wk: "W9", median: 7.0, p90: 20 },
  { wk: "W10", median: 7.2, p90: 21 },
  { wk: "W11", median: 7.3, p90: 22 },
  { wk: "W12", median: 7.4, p90: 22 },
];

export const TOP_COMBINATIONS: TopCombo[] = [
  { id: "c1",  channels: ["email", "direct"],                  chapters: 412, revenue: 102840, aov: 249.61, avgTouches: 5.2, move: +12.4 },
  { id: "c2",  channels: ["paid_search", "direct"],            chapters: 318, revenue: 81920,  aov: 257.61, avgTouches: 4.8, move: -3.1 },
  { id: "c3",  channels: ["meta", "email", "direct"],          chapters: 246, revenue: 67410,  aov: 274.02, avgTouches: 8.1, move: +28.6, isNew: true },
  { id: "c4",  channels: ["organic", "direct"],                chapters: 198, revenue: 41040,  aov: 207.27, avgTouches: 3.4, move: +1.8 },
  { id: "c5",  channels: ["email", "paid_social", "direct"],   chapters: 142, revenue: 38690,  aov: 272.46, avgTouches: 7.6, move: +44.2, isNew: true },
  { id: "c6",  channels: ["paid_search", "email"],             chapters: 124, revenue: 26790,  aov: 216.05, avgTouches: 6.1, move: -8.4 },
  { id: "c7",  channels: ["referral", "email", "direct"],      chapters: 88,  revenue: 21320,  aov: 242.27, avgTouches: 5.9, move: +6.2 },
  { id: "c8",  channels: ["organic", "email", "direct"],       chapters: 76,  revenue: 18450,  aov: 242.76, avgTouches: 7.2, move: -1.4 },
  { id: "c9",  channels: ["affiliate", "direct"],              chapters: 64,  revenue: 14210,  aov: 222.03, avgTouches: 3.1, move: +2.8 },
  { id: "c10", channels: ["tiktok", "meta", "email", "direct"],chapters: 52,  revenue: 13980,  aov: 268.85, avgTouches: 9.4, move: +62.5, isNew: true },
  { id: "c11", channels: ["sms", "direct"],                    chapters: 48,  revenue: 11820,  aov: 246.25, avgTouches: 3.8, move: +18.9 },
  { id: "c12", channels: ["meta", "direct"],                   chapters: 44,  revenue: 9260,   aov: 210.45, avgTouches: 4.2, move: -22.4 },
];

export const CHANNEL_ROLES: ChannelRole[] = [
  {
    key: "email", dominant: "Closer",
    role: { only: 6, open: 14, mid: 26, close: 54 },
    sentence: "Email closes 54% of chapters it appears in, opens 14%, and assists 32%. It rarely appears as the sole touchpoint.",
    presence: { value: "62%",  move: +2.4  },
    revenue:  { value: "$214K", move: +11.8 },
    chapters: { value: "1,142", move: +6.1  },
  },
  {
    key: "meta", dominant: "Opener",
    role: { only: 2, open: 68, mid: 24, close: 6 },
    sentence: "Meta opens 68% of paths it appears in. It rarely closes alone — its credit under last-touch attribution likely under-reflects its contribution.",
    presence: { value: "44%",  move: +8.2  },
    revenue:  { value: "$162K", move: +14.4 },
    chapters: { value: "807",  move: +21.4 },
  },
  {
    key: "direct", dominant: "Closer",
    role: { only: 18, open: 4, mid: 22, close: 56 },
    sentence: "Direct closes 56% of paths it appears in. It is the sole touchpoint 18% of the time — typical of returning-customer and brand-search traffic.",
    presence: { value: "84%",   move: +1.2 },
    revenue:  { value: "$348K", move: +6.4 },
    chapters: { value: "1,552", move: +2.8 },
  },
  {
    key: "paid_search", dominant: "Generalist",
    role: { only: 4, open: 36, mid: 32, close: 28 },
    sentence: "Paid Search plays multiple roles — opening (36%), assisting (32%), and closing (28%) in roughly equal share. It is a generalist channel for this brand.",
    presence: { value: "38%",  move: -1.4 },
    revenue:  { value: "$108K", move: -4.2 },
    chapters: { value: "702",  move: -2.8 },
  },
  {
    key: "organic", dominant: "Opener",
    role: { only: 8, open: 58, mid: 24, close: 10 },
    sentence: "Organic Search opens 58% of paths it appears in. It is the most common entry point for new identified customers in your data.",
    presence: { value: "31%", move: +3.6 },
    revenue:  { value: "$74K", move: +9.2 },
    chapters: { value: "574", move: +6.4 },
  },
  {
    key: "paid_social", dominant: "Middle",
    role: { only: 1, open: 18, mid: 54, close: 27 },
    sentence: "Paid Social appears in middle positions 54% of the time. It assists more than it opens or closes, suggesting a retargeting-heavy footprint.",
    presence: { value: "22%", move: +1.8 },
    revenue:  { value: "$48K", move: +6.4 },
    chapters: { value: "402", move: +4.1 },
  },
  {
    key: "tiktok", dominant: "Opener",
    role: { only: 1, open: 71, mid: 22, close: 6 },
    sentence: "TikTok opens 71% of paths it appears in. Volume is still modest but growing 38% period-over-period.",
    presence: { value: "8%",   move: +12.6 },
    revenue:  { value: "$22K", move: +38.4 },
    chapters: { value: "146", move: +28.4 },
  },
  {
    key: "referral", dominant: "Closer",
    role: { only: 4, open: 12, mid: 28, close: 56 },
    sentence: "Referral closes 56% of paths it appears in. Most referral traffic arrives late in the lifecycle, typical of warm-introduction sources.",
    presence: { value: "14%",  move: +4.2 },
    revenue:  { value: "$36K", move: +8.4 },
    chapters: { value: "254", move: +5.6 },
  },
];

export const ATTRIBUTION_MODELS: AttributionModel[] = ["first", "last", "linear"];

export const ATTRIBUTION_MODEL_LABELS: Record<AttributionModel, string> = {
  first: "First Touch",
  last: "Last Touch",
  linear: "Linear",
  custom: "Custom (J-Shape)",
};

export const ATTRIBUTION_CHANNELS: AttributionChannel[] = [
  { key: "email",       first: 8,  last: 28, linear: 21, custom: 24 },
  { key: "direct",      first: 4,  last: 31, linear: 18, custom: 26 },
  { key: "meta",        first: 26, last: 4,  linear: 14, custom: 9  },
  { key: "paid_search", first: 18, last: 14, linear: 16, custom: 15 },
  { key: "organic",     first: 22, last: 6,  linear: 12, custom: 8  },
  { key: "paid_social", first: 9,  last: 6,  linear: 8,  custom: 7  },
  { key: "tiktok",      first: 7,  last: 1,  linear: 4,  custom: 2  },
  { key: "referral",    first: 4,  last: 8,  linear: 6,  custom: 8  },
  { key: "affiliate",   first: 2,  last: 2,  linear: 1,  custom: 1  },
];

export const OBSERVATIONS: Observation[] = [
  {
    id: "ob1",
    severity: "high",
    state: "new",
    category: "Channel Behavior",
    actionType: "strategic_prompting",
    headline: "Meta appears in 92% of converting paths but doesn't show measurable lift on AOV or conversion rate.",
    data: [
      { label: "Presence", value: "92% of chapters" },
      { label: "AOV gap",  value: "+0.4%" },
      { label: "Conv. rate gap", value: "-0.8%" },
      { label: "Chapters w/o Meta", value: "162" },
    ],
    action: "Consider a structured hold-out test: pause or reduce Meta for a defined cohort (geo, audience segment, or time window) and measure whether downstream conversion, AOV, or repeat rate changes meaningfully. This is the most reliable way to validate whether the spend is producing lift.",
    timestamp: "Generated Mon, Nov 17",
    page: "channels",
    pageLabel: "Channel Roles",
  },
  {
    id: "ob2",
    severity: "high",
    state: "changed",
    category: "Lifecycle Health",
    actionType: "analytical",
    headline: "Median path length grew from 5.8 to 7.4 touches over the last 4 weeks — the steepest increase in 90 days.",
    data: [
      { label: "Current median", value: "7.4 touches" },
      { label: "4 weeks ago",    value: "5.8 touches" },
      { label: "Direction",      value: "Lengthening" },
    ],
    action: "Worth investigating: paths getting longer can indicate audience friction, mix shift, or a longer consideration cycle. Compare path length across entry channels to see which sources produce shorter paths.",
    timestamp: "Generated Mon, Nov 17",
    page: "overview",
    pageLabel: "Lifecycle Overview",
  },
  {
    id: "ob3",
    severity: "high",
    state: "new",
    category: "Path Patterns",
    actionType: "analytical",
    headline: "Three new converting combinations appeared this week, including Meta → Email → Direct (+28.6% in chapter count).",
    data: [
      { label: "New combinations", value: "3" },
      { label: "Top emerging",     value: "Meta + Email + Direct" },
      { label: "Growth",           value: "+28.6%" },
    ],
    action: "Worth investigating: what changed in your campaigns, partnerships, or audience that might explain these emerging paths? Growing combinations are worth understanding before they become invisible defaults.",
    timestamp: "Generated Mon, Nov 17",
    page: "paths",
    pageLabel: "Path Patterns",
  },
  {
    id: "ob4",
    severity: "high",
    state: "standing",
    category: "Attribution Trust",
    actionType: "analytical",
    headline: "Email's credit ranges from 8% (first-touch) to 28% (last-touch) — a 3.5x spread depending on attribution model.",
    data: [
      { label: "First-touch", value: "8%" },
      { label: "Last-touch",  value: "28%" },
      { label: "Linear",      value: "21%" },
    ],
    action: "Worth investigating: channels with wide attribution-model spread are typically either openers being credited late or closers being credited early. Compare email's role distribution to understand which model best reflects its actual contribution.",
    timestamp: "Generated Mon, Nov 17",
    page: "attribution",
    pageLabel: "Attribution Models",
  },
  {
    id: "ob5",
    severity: "med",
    state: "new",
    category: "Conversion Efficiency",
    actionType: "strategic_prompting",
    headline: "284 chapters reached add-to-cart but didn't close this period — $62,300 of estimated revenue at risk.",
    data: [
      { label: "Stalled chapters", value: "284" },
      { label: "Revenue at risk", value: "$62,300" },
      { label: "Dominant stall channel", value: "Paid Social" },
    ],
    action: "Consider building re-engagement flows targeting stalled high-intent customers — most are still reachable via email or paid retargeting. The most efficient near-miss recoveries usually happen within 7–14 days of the stall.",
    timestamp: "Generated Mon, Nov 17",
    page: "journeys",
    pageLabel: "Customer Journeys",
  },
  {
    id: "ob6",
    severity: "med",
    state: "standing",
    category: "Identity",
    actionType: "analytical",
    headline: "Identified users typically had 3 prior anonymous journeys before being recognized — the top 10% had 11.",
    data: [
      { label: "Median prior journeys", value: "3" },
      { label: "P90", value: "11" },
      { label: "Anonymous phase", value: "Long" },
    ],
    action: "Worth investigating: a long anonymous phase means most of your marketing is reaching people you can't yet measure. Consider whether earlier identification touchpoints (gated content, email capture, account incentives) could compress this.",
    timestamp: "Generated Mon, Nov 17",
    page: "overview",
    pageLabel: "Lifecycle Overview",
  },
  {
    id: "ob7",
    severity: "med",
    state: "changed",
    category: "Conversion Efficiency",
    actionType: "analytical",
    headline: "After landing, visitors most often click \"Fabrics by Project\" (32%) — your top navigation is organized by fabric type.",
    data: [
      { label: "Top first action", value: "Fabrics by Project" },
      { label: "Share", value: "32%" },
      { label: "Nav structure", value: "By type" },
    ],
    action: "Worth investigating: is your top first action well-supported by your site structure? If visitors are consistently choosing one path over your intended primary navigation, that's a signal about what they actually care about.",
    timestamp: "Generated Mon, Nov 17",
    page: "raw",
    pageLabel: "Raw Performance",
  },
  {
    id: "ob8",
    severity: "low",
    state: "standing",
    category: "Traffic Quality",
    actionType: "mechanical",
    headline: "6.4% of journeys in the last 30 days were classified as bots — within normal range and stable vs. prior period.",
    data: [
      { label: "Bot share", value: "6.4%" },
      { label: "Suspect",   value: "2.1%" },
      { label: "Change",    value: "-0.2pt" },
    ],
    action: "No action required. Your bot mitigation appears to be working within expected range. Continue monitoring weekly.",
    timestamp: "Generated Mon, Nov 17",
    page: "raw",
    pageLabel: "Raw Performance",
  },
];

export const JOURNEYS: Journey[] = [
  { id: "j1", identity: "a1f3…b2e7", chapters: 3, touches: 14, last: "2 days ago",  outcome: "converted", value: "$284.50" },
  { id: "j2", identity: "c84d…9af2", chapters: 1, touches: 7,  last: "Yesterday",   outcome: "converted", value: "$199.00" },
  { id: "j3", identity: "5e2b…7c11", chapters: 2, touches: 21, last: "4 days ago",  outcome: "stalled",   value: "—" },
  { id: "j4", identity: "f009…42ab", chapters: 1, touches: 4,  last: "1 hour ago",  outcome: "open",      value: "—" },
  { id: "j5", identity: "11ee…bcd4", chapters: 5, touches: 38, last: "Today",       outcome: "converted", value: "$1,420.00" },
  { id: "j6", identity: "9a7f…0d2e", chapters: 2, touches: 9,  last: "3 days ago",  outcome: "converted", value: "$315.40" },
  { id: "j7", identity: "78c1…6e80", chapters: 1, touches: 2,  last: "6 hours ago", outcome: "open",      value: "—" },
  { id: "j8", identity: "2f44…ee19", chapters: 4, touches: 22, last: "1 week ago",  outcome: "stalled",   value: "—" },
];

export const JOURNEY_DETAIL: JourneyDetail = {
  id: "j1",
  identity: "a1f3…b2e7",
  customerId: "cust_8042",
  firstSeen: "Sep 14, 2025",
  resolved: "Oct 2, 2025",
  totalEvents: 14,
  chapters: 3,
  outcome: "Converted",
  stitched: ["device_a", "device_b", "email_a1f3"],
  events: [
    { day: 0,  channel: "meta",        type: "ad_click",     chapter: 1, label: "Meta ad" },
    { day: 0,  channel: "direct",      type: "page_view",    chapter: 1, label: "Home" },
    { day: 1,  channel: "organic",     type: "page_view",    chapter: 1, label: "Search return" },
    { day: 3,  channel: "email",       type: "email_signup", chapter: 1, label: "Newsletter signup", identify: true },
    { day: 4,  channel: "email",       type: "email_click",  chapter: 1, label: "Welcome email" },
    { day: 5,  channel: "direct",      type: "purchase",     chapter: 1, label: "Purchase $124",     boundary: true, value: 124 },
    { day: 22, channel: "email",       type: "email_click",  chapter: 2, label: "Re-engagement" },
    { day: 26, channel: "paid_social", type: "ad_click",     chapter: 2, label: "Retargeting" },
    { day: 28, channel: "direct",      type: "page_view",    chapter: 2, label: "Product page" },
    { day: 38, channel: "email",       type: "email_click",  chapter: 2, label: "Promo" },
    { day: 40, channel: "direct",      type: "purchase",     chapter: 2, label: "Purchase $86",      boundary: true, value: 86 },
    { day: 62, channel: "email",       type: "email_click",  chapter: 3, label: "New collection" },
    { day: 66, channel: "direct",      type: "page_view",    chapter: 3, label: "Collection page" },
    { day: 68, channel: "direct",      type: "purchase",     chapter: 3, label: "Purchase $284.50",  boundary: true, value: 284.5 },
  ],
};

export const FUNNEL: FunnelStep[] = [
  { step: "Page view",      count: 84612, share: 100,  drop: null },
  { step: "Product view",   count: 41284, share: 48.8, drop: 51.2 },
  { step: "Add to cart",    count: 6428,  share: 7.6,  drop: 84.4 },
  { step: "Checkout start", count: 3142,  share: 3.7,  drop: 51.1 },
  { step: "Checkout info",  count: 2418,  share: 2.9,  drop: 23.0 },
  { step: "Purchase",       count: 1847,  share: 2.2,  drop: 23.6 },
];

export const CHANNEL_PERF: ChannelPerf[] = [
  { key: "direct",      journeys: 24820, orders: 642, revenue: 156820, cr: 2.59 },
  { key: "email",       journeys: 8410,  orders: 421, revenue: 102420, cr: 5.01 },
  { key: "paid_search", journeys: 14620, orders: 268, revenue: 58420,  cr: 1.83 },
  { key: "meta",        journeys: 12140, orders: 178, revenue: 41080,  cr: 1.47 },
  { key: "organic",     journeys: 11820, orders: 168, revenue: 36240,  cr: 1.42 },
  { key: "paid_social", journeys: 6240,  orders: 88,  revenue: 20840,  cr: 1.41 },
  { key: "tiktok",      journeys: 4280,  orders: 42,  revenue: 9620,   cr: 0.98 },
  { key: "referral",    journeys: 1840,  orders: 28,  revenue: 7240,   cr: 1.52 },
  { key: "affiliate",   journeys: 442,   orders: 12,  revenue: 3610,   cr: 2.71 },
];

export const DATE_RANGES = [
  "Last 7 days", "Last 14 days", "Last 30 days", "Last 90 days",
  "This month", "Last month", "This quarter", "Last quarter", "Year to date",
  "All time", "Custom…",
];

export const COMPARISONS = [
  "Compare to prior period",
  "Compare to same period last year",
  "No comparison",
];

export const LIFT_CORRELATION: LiftCorrelation[] = [
  {
    id: "corr-email", channel: "email", metric: "AOV",
    headline: "Paths containing Email show 18.4% higher AOV than paths without.",
    with:    { aov: 248.32, conv: 4.2, revPer: 1042, n: 1142 },
    without: { aov: 209.68, conv: 3.6, revPer: 754,  n: 705  },
    lift: { aov: +18.4, conv: +16.7, revPer: +38.2 },
    caveat: "Observational. Customers who subscribe to email are more engaged than those who don't — this is correlation, not a causal estimate.",
  },
  {
    id: "corr-meta", channel: "meta", metric: "Conversion rate",
    headline: "Paths with Meta show similar AOV but 11% higher conversion rate.",
    with:    { aov: 226.84, conv: 4.1, revPer: 930, n: 807 },
    without: { aov: 226.12, conv: 3.7, revPer: 836, n: 1040 },
    lift: { aov: +0.3, conv: +10.8, revPer: +11.2 },
    caveat: "Meta presence overlaps heavily with mobile + paid traffic. Treat this as a directional signal, not a clean lift estimate.",
  },
  {
    id: "corr-sms", channel: "sms", metric: "Repeat rate",
    headline: "Paths with SMS show 24% higher repeat-purchase rate within 90 days.",
    with:    { aov: 238.40, conv: 5.8, revPer: 1383, n: 254  },
    without: { aov: 224.91, conv: 4.7, revPer: 1057, n: 1593 },
    lift: { aov: +6.0, conv: +23.4, revPer: +30.8 },
    caveat: "SMS subscribers are a self-selected cohort — typically your highest-intent customers to begin with.",
  },
  {
    id: "corr-organic", channel: "organic", metric: "AOV",
    headline: "Paths with Organic Search show 4.2% higher AOV but slightly lower conversion.",
    with:    { aov: 235.18, conv: 3.5, revPer: 823, n: 574 },
    without: { aov: 225.71, conv: 4.0, revPer: 903, n: 1273 },
    lift: { aov: +4.2, conv: -12.5, revPer: -8.9 },
    caveat: "Organic opens longer paths, which tends to correlate with higher cart sizes but lower close rates.",
  },
];

export const LIFT_INCREMENTALITY: LiftIncrementality[] = [
  {
    id: "inc-email", channel: "email", metric: "AOV",
    headline: "Email shows +12.3% AOV lift in 14-day holdout (p = 0.018).",
    test: { aov: 246.50, n: 2412 },
    ctrl: { aov: 219.41, n: 2398 },
    lift: +12.3, ci: [+6.8, +17.4], pvalue: 0.018, power: 0.92,
    method: "Regression-adjusted holdout, 14 days",
    design: "Randomized within active engagement cohort. Holdout suppressed from all Email sends during window.",
    caveat: "Statistically significant. Estimate is for the active-engagement population — may not generalize to dormant subscribers.",
    significant: true,
  },
  {
    id: "inc-meta", channel: "meta", metric: "Conversion rate",
    headline: "Meta shows +6.1% conversion lift on prospecting audiences (p = 0.041).",
    test: { aov: 4.3,  n: 8410, unit: "%" },
    ctrl: { aov: 4.05, n: 8392, unit: "%" },
    lift: +6.1, ci: [+0.4, +11.6], pvalue: 0.041, power: 0.81,
    method: "Ghost-bid geo holdout, 28 days",
    design: "Top-10 DMAs by Meta spend split into matched test/control pairs. Spend zeroed in control geos.",
    caveat: "Wide confidence interval — significant but imprecise. Re-run with longer window for tighter estimate.",
    significant: true,
  },
  {
    id: "inc-sms", channel: "sms", metric: "AOV",
    headline: "SMS shows +3.2% AOV lift in holdout — not statistically significant (p = 0.21).",
    test: { aov: 240.18, n: 1204 },
    ctrl: { aov: 232.61, n: 1198 },
    lift: +3.2, ci: [-1.8, +8.1], pvalue: 0.21, power: 0.64,
    method: "Regression-adjusted holdout, 21 days",
    design: "Randomized within SMS-opted cohort. Holdout suppressed from all SMS sends.",
    caveat: "Underpowered. Direction is positive but cannot rule out zero effect at the current sample size.",
    significant: false,
  },
  {
    id: "inc-paid-search", channel: "paid_search", metric: "Incremental revenue",
    headline: "Paid Search brand terms show +1.4% incremental revenue (p = 0.38, not significant).",
    test: { aov: 226.82, n: 4204 },
    ctrl: { aov: 223.62, n: 4198 },
    lift: +1.4, ci: [-1.9, +4.6], pvalue: 0.38, power: 0.71,
    method: "Geo holdout on brand keywords, 14 days",
    design: "Brand-term bidding paused in matched holdout geos. Generic-term bidding unchanged.",
    caveat: "Brand-term cannibalization of organic remains plausible. Test does not detect a significant incremental effect.",
    significant: false,
  },
];

