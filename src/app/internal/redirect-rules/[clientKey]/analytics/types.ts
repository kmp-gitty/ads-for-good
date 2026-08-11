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

// Vercel geo city/region come URL-encoded (e.g. "Bryn%20Mawr"). Decode for display.
export function decodeGeo(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
