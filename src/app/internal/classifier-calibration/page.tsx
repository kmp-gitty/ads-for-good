// Classifier calibration admin page.
//
// Two halves:
//   1. Sample of unlabeled journeys (random pick, 20 at a time) showing every
//      signal v1 uses. Operator picks human / suspect / bot / unsure for each.
//   2. Stats panel — once enough labels exist, shows confusion matrix +
//      false-positive on 'suspect' (real humans excluded) and false-negative
//      on 'human_likely' (sophisticated bots billed as human).

import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import CalibrationBoard from "./CalibrationBoard";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const dynamic = "force-dynamic";

export type SampleJourney = {
  client_key: string;
  journey_id: string;
  journey_start_ts: string;
  journey_duration_seconds: number;
  event_count: number;
  distinct_event_types: number;
  page_view_count: number;
  scroll_depth_count: number;
  hover_intent_count: number;
  time_on_page_count: number;
  identify_count: number;
  has_identity: number;
  avg_gap_seconds: number | null;
  min_gap_seconds: number | null;
  events_per_minute: number | null;
  bot_score: number;
  bot_class: string;
};

export type LabelStats = {
  total_labels: number;
  by_class: Array<{ mv_bot_class: string; operator_label: string; n: number }>;
};

export default async function ClassifierCalibrationPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const sp = await searchParams;
  const clientKey = sp.client || "eos_fabrics";

  // Random sample of 20 unlabeled journeys for this client.
  // Stratified ~ish by class to give the operator a mix.
  const { data: sampleRaw } = await supabase.rpc("sample_unlabeled_journeys", {
    p_client_key: clientKey,
    p_limit: 20,
  });

  // Fall back to a direct read if the RPC isn't defined yet — first-time
  // setup case before we materialise the sampling helper.
  let sample: SampleJourney[] = (sampleRaw as SampleJourney[] | null) ?? [];
  if (!sample.length) {
    const { data } = await supabase
      .schema("chapter_reporting")
      .from("journey_bot_classification_v1")
      .select(
        "client_key, journey_id, journey_start_ts, journey_duration_seconds, event_count, distinct_event_types, page_view_count, scroll_depth_count, hover_intent_count, time_on_page_count, identify_count, has_identity, avg_gap_seconds, min_gap_seconds, events_per_minute, bot_score, bot_class",
      )
      .eq("client_key", clientKey)
      .gte("journey_start_ts", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order("journey_start_ts", { ascending: false })
      .limit(200);

    if (data) {
      // Random sample of 20 from the 200 most recent
      const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 20);

      // Filter out already-labeled
      const { data: alreadyLabeled } = await supabase
        .schema("chapter_observations")
        .from("classifier_labels")
        .select("journey_id")
        .eq("client_key", clientKey)
        .in("journey_id", shuffled.map(j => j.journey_id));

      const labelSet = new Set((alreadyLabeled ?? []).map(l => l.journey_id));
      sample = (shuffled as SampleJourney[]).filter(j => !labelSet.has(j.journey_id));
    }
  }

  // Stats — confusion matrix data
  const { data: statsRaw } = await supabase
    .schema("chapter_observations")
    .from("classifier_labels")
    .select("mv_bot_class, operator_label")
    .eq("client_key", clientKey);

  const total = (statsRaw ?? []).length;
  const grouped = new Map<string, number>();
  for (const r of statsRaw ?? []) {
    const k = `${r.mv_bot_class}|${r.operator_label}`;
    grouped.set(k, (grouped.get(k) ?? 0) + 1);
  }
  const byClass: LabelStats["by_class"] = Array.from(grouped.entries()).map(([k, n]) => {
    const [mv_bot_class, operator_label] = k.split("|");
    return { mv_bot_class, operator_label, n };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Classifier calibration</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Label real journeys to measure v1&apos;s false-positive rate on <code>suspect</code> + false-negative rate
            on <code>human_likely</code>. See <Link href="/docs/bot-classifier-v1.md" className="text-orange-600 hover:underline">v1 definition</Link>.
          </p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Client:</span>
          <select name="client" defaultValue={clientKey} className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm">
            <option value="eos_fabrics">eos_fabrics</option>
            <option value="adsforgood_prod">adsforgood_prod</option>
            <option value="projectagram_reels">projectagram_reels</option>
            <option value="not_so_cavalier">not_so_cavalier</option>
          </select>
          <button type="submit" className="rounded bg-neutral-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700">
            Switch
          </button>
        </form>
      </div>

      <CalibrationBoard
        client_key={clientKey}
        sample={sample}
        stats={{ total_labels: total, by_class: byClass }}
      />
    </div>
  );
}
