"use client";

import { useState } from "react";
import { PRESET_LABELS, type ExistingPrompt, type PromptResponse, type SelfServePresetType } from "../types";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
const ORANGE = "#E36410";
const GREEN = "#2E7D5B";
const LINE = "#E5E0D4";
const PANEL = "#FBFAF6";

function truncIdentity(k: string | null): string {
  if (!k) return "anonymous";
  const [prefix, val] = k.split(":");
  if (!val) return k.length > 14 ? k.slice(0, 14) + "…" : k;
  return `${prefix}:${val.slice(0, 8)}…`;
}

function summarize(obj: Record<string, unknown> | null): string {
  if (!obj || typeof obj !== "object") return "—";
  const parts = Object.entries(obj).map(([k, v]) => {
    const val = Array.isArray(v) ? v.join(", ") : String(v ?? "");
    return `${k}: ${val.length > 44 ? val.slice(0, 44) + "…" : val}`;
  });
  return parts.length ? parts.join(" · ") : "—";
}

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ResponsesClient({
  prompts,
  responses,
}: {
  prompts: ExistingPrompt[];
  responses: PromptResponse[];
}) {
  const totalShown = prompts.reduce((a, p) => a + (p.hit_count || 0), 0);
  const totalSubmitted = prompts.reduce((a, p) => a + (p.submit_count || 0), 0);
  const conv = totalShown > 0 ? Math.round((totalSubmitted / totalShown) * 100) : 0;
  const live = prompts.filter((p) => p.enabled).length;

  // Default the picker to the prompt with the most submissions.
  const sorted = [...prompts].sort((a, b) => (b.submit_count || 0) - (a.submit_count || 0));
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id || "");
  const selected = prompts.find((p) => p.id === selectedId) || null;

  const selectedResponses = selected
    ? responses.filter((r) => r.prompt_slug === selected.slug)
    : [];

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 1040, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Responses</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 22px" }}>
        How your prompts are performing, and what visitors submitted.
      </p>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* LEFT — summary */}
        <div style={{ flex: "1 1 340px", minWidth: 0, maxWidth: 400 }}>
          {/* Headline pair */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: "#FFF4EC", border: `1px solid ${ORANGE}33`, borderRadius: 12, padding: "16px 16px" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: ORANGE, lineHeight: 1 }}>{totalSubmitted.toLocaleString()}</div>
              <div style={{ fontSize: 11.5, color: "#9A5B2E", fontWeight: 600, marginTop: 6, lineHeight: 1.3 }}>Would-be-lost customers converted</div>
            </div>
            <div style={{ flex: 1, background: "white", border: `1px solid ${LINE}`, borderRadius: 12, padding: "16px 16px" }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: INK, lineHeight: 1 }}>{conv}%</div>
              <div style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, marginTop: 6 }}>Show → submit</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: FAINT, margin: "8px 2px 0", lineHeight: 1.4 }}>
            Every submission is a visitor who acted on a prompt instead of leaving.
          </div>

          {/* Secondary tiles */}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <SmallStat label="Times shown" value={totalShown.toLocaleString()} />
            <SmallStat label="Live prompts" value={String(live)} />
          </div>
        </div>

        {/* RIGHT — by prompt */}
        <div style={{ flex: "1 1 480px", minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>By prompt</div>

          {prompts.length === 0 ? (
            <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "28px 20px", textAlign: "center", background: PANEL, color: MUTED, fontSize: 13.5 }}>
              Create a prompt first — its responses will show up here.
            </div>
          ) : (
            <>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", fontSize: 14, color: INK, background: "white", border: `1px solid ${LINE}`, borderRadius: 8, padding: "10px 11px" }}
              >
                {sorted.map((p) => (
                  <option key={p.id} value={p.id}>
                    {(p.headline || p.slug)} — {p.submit_count} submitted
                  </option>
                ))}
              </select>

              {selected && (
                <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, marginTop: 12, overflow: "hidden" }}>
                  {/* Selected prompt stat bar */}
                  <div style={{ background: PANEL, padding: "12px 16px", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 12, color: FAINT }}>
                      <span style={{ fontSize: 10.5, color: ORANGE, background: "#FFF4EC", border: `1px solid ${ORANGE}33`, borderRadius: 999, padding: "2px 8px", marginRight: 8 }}>
                        {PRESET_LABELS[selected.preset_type as SelfServePresetType] || selected.preset_type}
                      </span>
                      {selected.enabled ? <span style={{ color: GREEN, fontWeight: 600 }}>● Live</span> : <span>○ Off</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: MUTED, whiteSpace: "nowrap" }}>
                      {selected.hit_count} shown · {selected.submit_count} submitted
                      {selected.hit_count > 0 ? ` · ${Math.round((selected.submit_count / selected.hit_count) * 100)}%` : ""}
                    </div>
                  </div>

                  {/* Individual submissions for this prompt */}
                  {selectedResponses.length > 0 ? (
                    <div style={{ maxHeight: 420, overflowY: "auto" }}>
                      {selectedResponses.map((r) => (
                        <div key={r.id} style={{ padding: "11px 16px", borderBottom: `1px solid ${LINE}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 3 }}>
                            <span style={{ fontSize: 12, color: INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                              {truncIdentity(r.identity_key || (r.anonymous_id ? `anonymous_id:${r.anonymous_id}` : null))}
                            </span>
                            <span style={{ fontSize: 11.5, color: FAINT, whiteSpace: "nowrap" }}>{fmtWhen(r.submitted_at)}{r.ip_country ? ` · ${r.ip_country}` : ""}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.4 }}>{summarize(r.responses_jsonb)}</div>
                        </div>
                      ))}
                    </div>
                  ) : selected.submit_count > 0 ? (
                    <div style={{ padding: "20px 16px", fontSize: 13, color: MUTED, lineHeight: 1.5 }}>
                      This prompt captured <strong style={{ color: INK }}>{selected.submit_count}</strong>{" "}
                      {selected.preset_type === "phone_call" ? "call taps" : "contacts"}. Individual details are hashed for
                      privacy — you&rsquo;ll see typed answers here for Custom Form prompts.
                    </div>
                  ) : (
                    <div style={{ padding: "20px 16px", fontSize: 13, color: FAINT }}>No submissions yet for this prompt.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, background: "white", border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: INK }}>{value}</div>
      <div style={{ fontSize: 11, color: FAINT, textTransform: "uppercase", letterSpacing: ".08em", marginTop: 3 }}>{label}</div>
    </div>
  );
}
