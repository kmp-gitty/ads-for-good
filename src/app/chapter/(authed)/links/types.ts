// Shared types for self-serve Smart Links (Phase 4a). Kept out of the
// "use server" _actions.ts so the client editor can import them.
//
// Model: a "link" is one slug with a required default destination + an ordered
// list of "smart rules" (context conditions → destination). This maps onto
// chapter_config.redirect_rules as N rows sharing a slug: smart rules at
// ascending priorities (first match wins), then the default as a catch-all
// (empty conditions) at the highest priority number.

export type LinkCondition = Record<string, unknown>;

export type SmartRule = {
  // client-only id for list keying; not persisted
  key: string;
  conditions: LinkCondition;
  destination: string;
};

export type LinkInput = {
  slug: string;
  description: string;
  default_destination: string;
  smart_rules: { conditions: LinkCondition; destination: string }[];
  enabled: boolean;
};

export type LinkSummary = {
  slug: string;
  description: string | null;
  default_destination: string;
  smart_rule_count: number;
  enabled: boolean;
  total_hits: number;
};

export type LinkDetail = {
  slug: string;
  description: string;
  default_destination: string;
  smart_rules: SmartRule[];
  enabled: boolean;
};

export type StatBar = { label: string; clicks: number };

export type LinkStats = {
  window_days: number;
  totals: { clicks: number; unique: number; scanner: number; raw: number; clicks_all_time: number };
  timeseries: { day: string; clicks: number }[];
  by_destination: { rule_label: string; is_default: boolean; destination: string; clicks: number }[];
  by_device: StatBar[];
  by_os: StatBar[];
  by_country: StatBar[];
  by_source: StatBar[];
  fulfillment: { visitors: number; converted: number };
};

export type LinkOverviewRow = {
  slug: string;
  clicks: number;
  unique: number;
  scanner: number;
  all_time: number;
  top_destination: string | null;
};

export type LinksOverview = {
  window_days: number;
  totals: { clicks: number; scanner: number; links: number };
  links: LinkOverviewRow[];
};

// Reserved slugs that would collide with static routes under /links.
export const RESERVED_SLUGS = new Set(["new", "domain", "analytics"]);
