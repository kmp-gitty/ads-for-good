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

// Reserved slugs that would collide with static routes under /links.
export const RESERVED_SLUGS = new Set(["new", "domain"]);
