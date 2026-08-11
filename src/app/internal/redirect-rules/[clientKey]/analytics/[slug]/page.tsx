import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import DaysToggle from "../DaysToggle";
import LinkStatsPanel from "../LinkStatsPanel";
import type { LinkStats } from "../types";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";

function parseDays(v: string | undefined): number {
  const n = Number(v);
  return [7, 30, 90].includes(n) ? n : 30;
}

export default async function LinkStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientKey: string; slug: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { clientKey, slug } = await params;
  const days = parseDays((await searchParams).days);

  const { data, error } = await supabase
    .schema("chapter_reporting")
    .rpc("smart_link_stats", { p_client_key: clientKey, p_slug: slug, p_days: days });
  const stats = (data ?? null) as LinkStats | null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <Link
            href={`/internal/redirect-rules/${clientKey}/analytics?days=${days}`}
            style={{ fontSize: 13, color: MUTED, textDecoration: "none" }}
          >
            ← All links
          </Link>
          <h2 style={{ margin: "8px 0 4px", fontSize: 20, fontWeight: 700, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {slug}
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, color: MUTED, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            {clientKey}
          </p>
        </div>
        <DaysToggle days={days} />
      </div>

      {error ? (
        <div style={{ border: "1px solid #E7C9C6", background: "#FDECEA", color: "#B3261E", borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
          Failed to load stats: {error.message}
        </div>
      ) : !stats || stats.totals.clicks === 0 ? (
        <div style={{ border: "1px dashed #E5E0D4", background: "#FBFAF6", borderRadius: 12, padding: "40px 24px", textAlign: "center", color: MUTED, fontSize: 13.5 }}>
          No clicks for this link in the last {days} days.
        </div>
      ) : (
        <LinkStatsPanel stats={stats} />
      )}
    </div>
  );
}
