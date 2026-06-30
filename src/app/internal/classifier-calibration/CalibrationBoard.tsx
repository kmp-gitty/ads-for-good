"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitLabel } from "./_actions";
import type { SampleJourney, LabelStats } from "./page";

type OperatorLabel = "human" | "suspect" | "bot" | "unsure";

const LABEL_COLORS: Record<OperatorLabel, string> = {
  human: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
  suspect: "bg-amber-100 text-amber-800 hover:bg-amber-200",
  bot: "bg-rose-100 text-rose-800 hover:bg-rose-200",
  unsure: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200",
};

function formatSeconds(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return s.toFixed(1) + "s";
  if (s < 3600) return (s / 60).toFixed(1) + "m";
  return (s / 3600).toFixed(1) + "h";
}

function classChip(cls: string) {
  const color =
    cls === "human_likely" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    cls === "suspect"      ? "bg-amber-50 text-amber-700 border-amber-200" :
                              "bg-rose-50 text-rose-700 border-rose-200";
  return <span className={"rounded border px-2 py-0.5 text-xs font-semibold " + color}>{cls}</span>;
}

export default function CalibrationBoard({
  client_key,
  sample,
  stats,
}: {
  client_key: string;
  sample: SampleJourney[];
  stats: LabelStats;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  function onLabel(j: SampleJourney, label: OperatorLabel) {
    if (submitted.has(j.journey_id)) return;
    setSubmitted(prev => new Set(prev).add(j.journey_id));
    startTransition(async () => {
      const res = await submitLabel({
        client_key: j.client_key,
        journey_id: j.journey_id,
        journey_start_ts: j.journey_start_ts,
        mv_bot_class: j.bot_class,
        mv_bot_score: j.bot_score,
        operator_label: label,
      });
      if (!res.ok) {
        // Rollback the optimistic mark so they can retry
        setSubmitted(prev => {
          const next = new Set(prev);
          next.delete(j.journey_id);
          return next;
        });
        alert(`Label failed: ${res.error}`);
      }
    });
  }

  // ---- Stats computation ----
  const cmap: Record<string, Record<string, number>> = {
    human_likely: { human: 0, suspect: 0, bot: 0, unsure: 0 },
    suspect:      { human: 0, suspect: 0, bot: 0, unsure: 0 },
    bot_likely:   { human: 0, suspect: 0, bot: 0, unsure: 0 },
  };
  for (const row of stats.by_class) {
    if (cmap[row.mv_bot_class]) cmap[row.mv_bot_class][row.operator_label] = row.n;
  }
  const sumHuman = Object.values(cmap.human_likely).reduce((a, b) => a + b, 0);
  const sumSuspect = Object.values(cmap.suspect).reduce((a, b) => a + b, 0);
  const fp_suspect = sumSuspect > 0 ? (cmap.suspect.human / sumSuspect) * 100 : null;
  const fn_human = sumHuman > 0 ? ((cmap.human_likely.bot + cmap.human_likely.suspect) / sumHuman) * 100 : null;

  return (
    <div className="space-y-8">
      {/* Stats panel */}
      <section className="rounded-md border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
          Calibration stats ({stats.total_labels} labels for {client_key})
        </h2>

        {stats.total_labels < 20 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Need at least 20 labels per client for meaningful precision/recall. Currently {stats.total_labels}.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded border border-amber-200 bg-amber-50/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                False positive on &lsquo;suspect&rsquo;
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {fp_suspect != null ? fp_suspect.toFixed(1) + "%" : "—"}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Real humans excluded from billing as &lsquo;suspect&rsquo;. Lower is better — we&apos;re under-billing
                clients by this much.
              </p>
            </div>
            <div className="rounded border border-rose-200 bg-rose-50/30 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">
                False negative on &lsquo;human_likely&rsquo;
              </p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                {fn_human != null ? fn_human.toFixed(1) + "%" : "—"}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                Bots/suspect billed as human. Lower is better — we&apos;re over-billing clients by this much.
              </p>
            </div>
          </div>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Confusion matrix (raw counts)
          </summary>
          <table className="mt-2 w-full text-xs">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-3 py-2 text-left">v1 says ↓ / operator says →</th>
                <th className="px-3 py-2 text-right">human</th>
                <th className="px-3 py-2 text-right">suspect</th>
                <th className="px-3 py-2 text-right">bot</th>
                <th className="px-3 py-2 text-right">unsure</th>
              </tr>
            </thead>
            <tbody>
              {(["human_likely", "suspect", "bot_likely"] as const).map(mv => (
                <tr key={mv} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-mono">{mv}</td>
                  <td className="px-3 py-2 text-right">{cmap[mv].human}</td>
                  <td className="px-3 py-2 text-right">{cmap[mv].suspect}</td>
                  <td className="px-3 py-2 text-right">{cmap[mv].bot}</td>
                  <td className="px-3 py-2 text-right">{cmap[mv].unsure}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      {/* Sample to label */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-700">
            Sample to label ({sample.length} journeys)
          </h2>
          <button
            type="button"
            onClick={() => router.refresh()}
            disabled={pending}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            New sample
          </button>
        </div>

        {sample.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">
            All recent journeys for this client are labelled, or no journeys available. Click &ldquo;New sample&rdquo;.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sample.map(j => {
              const isDone = submitted.has(j.journey_id);
              return (
                <div
                  key={j.journey_id}
                  className={"rounded border p-3 " + (isDone ? "border-neutral-200 bg-neutral-50 opacity-60" : "border-neutral-200 bg-white")}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-baseline gap-2">
                      {classChip(j.bot_class)}
                      <span className="text-xs font-mono text-neutral-500">score {j.bot_score}</span>
                      <span className="text-xs text-neutral-400">
                        {new Date(j.journey_start_ts).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {(["human", "suspect", "bot", "unsure"] as OperatorLabel[]).map(L => (
                        <button
                          key={L}
                          type="button"
                          onClick={() => onLabel(j, L)}
                          disabled={isDone || pending}
                          className={"rounded px-3 py-1 text-xs font-semibold transition " + LABEL_COLORS[L] + (isDone ? " opacity-40 cursor-default" : "")}
                        >
                          {L}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <Metric label="Events" value={j.event_count} />
                    <Metric label="Types" value={j.distinct_event_types} />
                    <Metric label="Duration" value={formatSeconds(j.journey_duration_seconds)} />
                    <Metric label="Events/min" value={j.events_per_minute != null ? j.events_per_minute.toFixed(1) : "—"} />
                    <Metric label="page_view" value={j.page_view_count} />
                    <Metric label="scroll" value={j.scroll_depth_count} />
                    <Metric label="hover" value={j.hover_intent_count} />
                    <Metric label="time_on" value={j.time_on_page_count} />
                    <Metric label="identify" value={j.identify_count} />
                    <Metric label="has_id" value={j.has_identity ? "yes" : "no"} />
                    <Metric label="min gap" value={formatSeconds(j.min_gap_seconds)} />
                    <Metric label="avg gap" value={formatSeconds(j.avg_gap_seconds)} />
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-neutral-400">{j.journey_id}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded bg-neutral-50 px-2 py-1">
      <span className="block text-[10px] uppercase tracking-wider text-neutral-500">{label}</span>
      <span className="font-mono text-xs text-neutral-900">{value}</span>
    </div>
  );
}
