export type TouchRow = {
    channel: string;
    chapter_count: number;
  };
  
  export type DashboardJSON = {
    kpi_tiles: {
      revenue: number | null;
      purchases: number | null;
      leads: number | null;
      aov: number | null;
      currency: string | null;
    };
    journey_tiles: {
      journey_count: number | null;
      anon_journeys: number | null;
      idd_journeys: number | null;
      chapter_count: number | null;
      avg_chapter_seconds: number | null;
      avg_touchpoints: number | null;
      avg_unique_channels: number | null;
      recent_events_count?: number | null;
    };
    first_touch?: TouchRow[];
    last_touch?: TouchRow[];
    linear_attribution?: Array<{
      channel: string;
      contributing_chapters: number;
      attributed_revenue: number;
      all_chapter_revenue: number;
      attributed_pct_of_all: number;
      channel_chapter_revenue: number;
      attributed_pct_of_channel_chapters: number;
      avg_other_channels_per_chapter: number;
      currency: string | null;
    }>;
    correlation_lift?: Array<{
      channel: string;
      chapters_with_channel: number;
      chapters_without_channel: number;
      total_purchase_chapters: number;
      avg_revenue_with: number | null;
      avg_revenue_without: number | null;
      lift_pct_vs_without: number | null;
      z_score: number | null;
      confidence_flag: string | null;
      sd_with: number | null;
      sd_without: number | null;
      total_revenue: number | null;
      avg_revenue_overall: number | null;
      sd_revenue_overall: number | null;
    }>;
    top5_chapter_paths?: Array<{
      boundary_event_name: string;
      path: string;
      chapter_count: number;
      avg_touches: number;
      avg_time_to_boundary: string;
      total_value: number;
      currency: string | null;
    }>;
    top_event_names?: Array<{
      event_name: string;
      count: number;
    }>;
    top_page_paths?: Array<{
      page_path: string;
      count: number;
    }>;
  };
  
  export type SnapshotResponse = {
    dashboard_json?: DashboardJSON;
  };
  
  export type MetricType = "currency" | "number" | "percent" | "duration";
  
  export type MetricTileConfig = {
    key: string;
    label: string;
    type: MetricType;
    source: "kpi_tiles" | "journey_tiles";
    valueKey: string;
    digits?: number;
    sub?: string;
  };
  
  export type DashboardConfig = {
    eyebrow: string;
    title: string;
    subtitle?: string;
    banner?: string;
    kpiSection?: {
      title: string;
      tiles: MetricTileConfig[];
    };
    journeySection?: {
      title: string;
      tiles: MetricTileConfig[];
    };
    sectionTitles?: {
      firstTouch?: string;
      lastTouch?: string;
      linearAttribution?: string;
      correlation?: string;
      topPaths?: string;
    };
    showFirstTouch?: boolean;
    showLastTouch?: boolean;
    showLinearAttribution?: boolean;
    showCorrelation?: boolean;
    showTopPaths?: boolean;
  };