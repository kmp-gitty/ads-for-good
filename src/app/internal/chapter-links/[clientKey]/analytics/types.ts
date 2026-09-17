// Shapes returned by chapter_reporting.smart_links_overview + smart_link_stats.

export type OverviewLink = {
  slug: string;
  clicks: number;
  unique: number;
  scanner: number;
  all_time: number;
  top_destination: string | null;
  converted: number;
  purchased: number;
};

export type LinksOverview = {
  window_days: number;
  totals: { clicks: number; scanner: number; links: number };
  links: OverviewLink[];
};

export type Breakdown = { label: string; clicks: number };

export type DestinationRow = {
  rule_label: string;
  is_default: boolean;
  destination: string;
  clicks: number;
};

export type LinkStats = {
  window_days: number;
  totals: {
    clicks: number;
    unique: number;
    scanner: number;
    raw: number;
    ad_clicks: number;
    clicks_all_time: number;
  };
  timeseries: { day: string; clicks: number }[];
  by_destination: DestinationRow[];
  by_device: Breakdown[];
  by_os: Breakdown[];
  by_country: Breakdown[];
  by_region: Breakdown[];
  by_city: Breakdown[];
  by_source: Breakdown[];
  by_ad_platform: Breakdown[];
  new_returning: { new: number; returning: number };
  fulfillment: { visitors: number; converted: number; purchased: number };
};

// Reporting window. "all" = all-time (default). The RPCs take an integer p_days,
// so all-time maps to a very large day count.
export type DaysKey = "7" | "14" | "30" | "90" | "all";
export const DAYS_OPTIONS: DaysKey[] = ["7", "14", "30", "90", "all"];

export function resolveDays(v: string | undefined): { key: DaysKey; pDays: number; label: string } {
  const key: DaysKey = (DAYS_OPTIONS as string[]).includes(v ?? "") ? (v as DaysKey) : "all";
  const pDays = key === "all" ? 36500 : Number(key);
  const label = key === "all" ? "all-time" : `${key}d`;
  return { key, pDays, label };
}

// Vercel geo city/region come URL-encoded (e.g. "Bryn%20Mawr"). Decode for display.
export function decodeGeo(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
