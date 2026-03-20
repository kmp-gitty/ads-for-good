import type { DashboardConfig } from "../types";

export const eosDashboardConfig: DashboardConfig = {
  eyebrow: "Chapter • EOS Fabrics",
  title: "Pre-V1 Marketing & Journey Dashboard",
  subtitle: "Directional only — visualizing live Chapter data before full filtering and bot suppression.",
  banner:
    "Pre-V1 view. Includes raw Chapter data before final internal-traffic and bot filtering. Treat directional insights as exploratory.",
  kpiSection: {
    title: "Marketing KPIs",
    tiles: [
      { key: "revenue", label: "Revenue", type: "currency", source: "kpi_tiles", valueKey: "revenue" },
      { key: "purchases", label: "Purchases", type: "number", source: "kpi_tiles", valueKey: "purchases" },
      { key: "aov", label: "AOV", type: "currency", source: "kpi_tiles", valueKey: "aov" },
    ],
  },
  journeySection: {
    title: "Journeys & Chapters",
    tiles: [
      { key: "journey_count", label: "Journey Count", type: "number", source: "journey_tiles", valueKey: "journey_count" },
      { key: "anon_journeys", label: "Anon Journeys", type: "number", source: "journey_tiles", valueKey: "anon_journeys" },
      { key: "idd_journeys", label: "Known-Identity Journeys", type: "number", source: "journey_tiles", valueKey: "idd_journeys" },
      { key: "chapter_count", label: "Conversion Chapters", type: "number", source: "journey_tiles", valueKey: "chapter_count" },
      { key: "recent_events_count", label: "Recent Events (7d)", type: "number", source: "journey_tiles", valueKey: "recent_events_count" },
      { key: "avg_chapter_seconds", label: "Avg Chapter Length", type: "duration", source: "journey_tiles", valueKey: "avg_chapter_seconds" },
      { key: "avg_touchpoints", label: "Avg Touchpoints / Chapter", type: "number", source: "journey_tiles", valueKey: "avg_touchpoints", digits: 2 },
      { key: "avg_unique_channels", label: "Avg Unique Channels / Chapter", type: "number", source: "journey_tiles", valueKey: "avg_unique_channels", digits: 2 },
    ],
  },
  sectionTitles: {
    firstTouch: "Top 5 Chapter Start Channels (First Touch)",
    lastTouch: "Top 5 Chapter End Channels (Last Touch)",
    linearAttribution: "Revenue by Channel (Linear Attribution)",
    correlation: "Correlation / Lift (V1)",
    topPaths: "Top Conversion Paths",
  },
  showFirstTouch: true,
  showLastTouch: true,
  showLinearAttribution: false,
  showCorrelation: false,
  showTopPaths: false,
};