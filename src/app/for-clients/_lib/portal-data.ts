// Shared data loader for the for-clients portal pages.
//
// Reads a single row from crm.clients keyed by client_key, with 5-min Next
// caching so multiple page loads in the same window don't hit the DB more
// than once.
//
// The Gchat / admin-form update flow writes back to crm.clients directly;
// the cache TTL means changes propagate within 5 minutes. If we ever need
// instant propagation we can add tag-based revalidation on the write path.

import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const REVALIDATE_SEC = 300;

export type ProjectKey =
  | "Digital Profile Management"
  | "SEO"
  | "Paid Ads"
  | "Website Updates"
  | "Email Marketing"
  | "Marketing Operations";

export type ProjectSummary = {
  headline: string;
  body: string;
  updated_at: string;
};

export type ReportingTile = {
  title: string;
  project: ProjectKey;
  description: string;
};

export type PortalData = {
  clientKey: string;
  businessName: string;
  activePlan: "Support" | "Partner" | "Team" | null;
  activeProjects: ProjectKey[];
  projectSummaries: Partial<Record<ProjectKey, ProjectSummary>>;
  reportingTiles: ReportingTile[];
  portalLogoPath: string | null;
};

// DB stores services + summaries keyed by PascalCase_with_Underscores.
// Convert to the human display labels used in the UI.
function dbServiceToDisplay(s: string): ProjectKey | null {
  switch (s) {
    case "Digital_Profile_Management": return "Digital Profile Management";
    case "SEO":                        return "SEO";
    case "Paid_Ads":                   return "Paid Ads";
    case "Website_Updates":            return "Website Updates";
    case "Email_Marketing":            return "Email Marketing";
    case "Marketing_Operations":       return "Marketing Operations";
    default:                           return null;
  }
}

type CrmRow = {
  client_key: string;
  business_name: string;
  active_plan: "Support" | "Partner" | "Team" | null;
  services_engaged: string[] | null;
  project_summaries: Record<string, ProjectSummary> | null;
  reporting_tiles: Array<{ title: string; project: string; description: string }> | null;
  portal_logo_path: string | null;
};

const fetchPortalData = unstable_cache(
  async (clientKey: string): Promise<PortalData | null> => {
    const { data, error } = await supabase
      .schema("crm")
      .from("clients")
      .select(
        "client_key, business_name, active_plan, services_engaged, project_summaries, reporting_tiles, portal_logo_path",
      )
      .eq("client_key", clientKey)
      .maybeSingle<CrmRow>();

    if (error) {
      console.error(`[portal-data] fetch for ${clientKey} failed:`, error);
      return null;
    }
    if (!data) return null;

    const activeProjects = (data.services_engaged ?? [])
      .map(dbServiceToDisplay)
      .filter((p): p is ProjectKey => p !== null);

    // Project summaries: DB keys are PascalCase, convert to display labels.
    const projectSummaries: Partial<Record<ProjectKey, ProjectSummary>> = {};
    for (const [dbKey, summary] of Object.entries(data.project_summaries ?? {})) {
      const displayKey = dbServiceToDisplay(dbKey);
      if (displayKey) {
        projectSummaries[displayKey] = summary;
      } else {
        console.warn(
          `[portal-data] ${clientKey}: project_summaries key "${dbKey}" is not a canonical service ` +
          `(SEO, Paid_Ads, Email_Marketing, Website_Updates, Digital_Profile_Management, Marketing_Operations). Skipped.`,
        );
      }
    }

    // Reporting tiles: same conversion on the embedded `project` field.
    const reportingTiles: ReportingTile[] = (data.reporting_tiles ?? [])
      .map((t) => {
        const project = dbServiceToDisplay(t.project);
        if (!project) {
          console.warn(
            `[portal-data] ${clientKey}: reporting_tiles entry has invalid project "${t.project}" ` +
            `(must be a canonical service key). Skipped.`,
          );
          return null;
        }
        return { title: t.title, project, description: t.description };
      })
      .filter((t): t is ReportingTile => t !== null);

    return {
      clientKey: data.client_key,
      businessName: data.business_name,
      activePlan: data.active_plan,
      activeProjects,
      projectSummaries,
      reportingTiles,
      portalLogoPath: data.portal_logo_path,
    };
  },
  ["portal-data:crm-clients"],
  { revalidate: REVALIDATE_SEC, tags: ["portal-data"] },
);

export async function getPortalData(clientKey: string): Promise<PortalData | null> {
  return fetchPortalData(clientKey);
}
