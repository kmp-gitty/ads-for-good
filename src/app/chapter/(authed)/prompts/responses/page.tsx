// Responses + analytics (Phase 3c). Show→submit summary across all prompts,
// plus the captured non-identity form responses. Reads are RLS-scoped to the
// session's tenant (listResponses / listPrompts both go through
// withSelfServeClient). Rendered inside (authed) chrome.

import { listResponses, listPrompts } from "../_actions";
import { PRESET_LABELS, type SelfServePresetType } from "../types";

export const metadata = { title: "Responses" };
export const dynamic = "force-dynamic";

const INK = "#1F2D43";
const MUTED = "#5C6B82";
const FAINT = "#8A98AD";
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
    return `${k}: ${val.length > 40 ? val.slice(0, 40) + "…" : val}`;
  });
  return parts.length ? parts.join(" · ") : "—";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: "1 1 120px", background: "white", border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: FAINT, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: INK }}>{value}</div>
    </div>
  );
}

export default async function ResponsesPage() {
  const [responses, prompts] = await Promise.all([listResponses(200), listPrompts()]);

  const totalShown = prompts.reduce((a, p) => a + (p.hit_count || 0), 0);
  const totalSubmitted = prompts.reduce((a, p) => a + (p.submit_count || 0), 0);
  const conv = totalShown > 0 ? Math.round((totalSubmitted / totalShown) * 100) : 0;
  const live = prompts.filter((p) => p.enabled).length;

  return (
    <div style={{ padding: "28px 30px 60px", maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Responses</h1>
      <p style={{ fontSize: 14, color: MUTED, margin: "0 0 20px" }}>
        How your prompts are performing, and what visitors submitted.
      </p>

      {/* Analytics strip */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <Stat label="Live prompts" value={String(live)} />
        <Stat label="Shown" value={totalShown.toLocaleString()} />
        <Stat label="Submitted" value={totalSubmitted.toLocaleString()} />
        <Stat label="Show → submit" value={`${conv}%`} />
      </div>

      {/* Per-prompt breakdown */}
      {prompts.length > 0 && (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          <div style={{ background: PANEL, padding: "10px 16px", fontSize: 12, fontWeight: 700, color: INK, borderBottom: `1px solid ${LINE}` }}>
            By prompt
          </div>
          {prompts.map((p) => {
            const rate = p.hit_count > 0 ? Math.round((p.submit_count / p.hit_count) * 100) : null;
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "11px 16px", borderTop: `1px solid ${LINE}` }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{p.headline || p.slug}</span>
                  <span style={{ fontSize: 11, color: FAINT, marginLeft: 8 }}>
                    {PRESET_LABELS[p.preset_type as SelfServePresetType] || p.preset_type}{p.enabled ? "" : " · off"}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: MUTED, whiteSpace: "nowrap" }}>
                  {p.hit_count} shown · {p.submit_count} submitted{rate !== null ? ` · ${rate}%` : ""}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Captured responses */}
      <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 10 }}>
        Recent submissions {responses.length >= 200 ? "(latest 200)" : `(${responses.length})`}
      </div>
      {responses.length === 0 ? (
        <div style={{ border: `1px dashed ${LINE}`, borderRadius: 12, padding: "32px 24px", textAlign: "center", background: PANEL, color: MUTED, fontSize: 13.5 }}>
          No submissions yet. Once visitors submit a prompt, they’ll show up here.
        </div>
      ) : (
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: PANEL, textAlign: "left", color: FAINT }}>
                  <Th>When</Th><Th>Prompt</Th><Th>Identity</Th><Th>Response</Th><Th>Page</Th><Th>Country</Th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${LINE}` }}>
                    <Td>{new Date(r.submitted_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Td>
                    <Td mono>{r.prompt_slug}</Td>
                    <Td mono>{truncIdentity(r.identity_key || (r.anonymous_id ? `anonymous_id:${r.anonymous_id}` : null))}</Td>
                    <Td>{summarize(r.responses_jsonb)}</Td>
                    <Td>{r.page_url ? (r.page_url.length > 36 ? r.page_url.slice(0, 36) + "…" : r.page_url) : "—"}</Td>
                    <Td>{r.ip_country || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ padding: "9px 14px", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", fontSize: 10.5, whiteSpace: "nowrap" }}>{children}</th>;
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ padding: "9px 14px", color: INK, verticalAlign: "top", fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined, whiteSpace: "nowrap" }}>{children}</td>;
}
