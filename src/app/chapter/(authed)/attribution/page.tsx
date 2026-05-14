"use client";

import React, { useState } from "react";
import { TopBar } from "../../_components/TopBar";
import { Icon } from "../../_components/Icon";
import { Dropdown } from "../../_components/Dropdown";
import { useChapter } from "../../_components/ChapterContext";
import { fmtMoneyK } from "../../_components/format";
import {
  CHANNELS, ATTRIBUTION_CHANNELS, ATTRIBUTION_MODEL_LABELS, AttributionModel,
} from "../../_components/mockdata";

function BumpChart({ models }: { models: AttributionModel[] }) {
  const channels = ATTRIBUTION_CHANNELS;
  const ranks: Record<string, Record<AttributionModel, number>> = {};
  models.forEach(m => {
    const sorted = [...channels].sort((a, b) => (b[m] as number) - (a[m] as number));
    sorted.forEach((c, i) => {
      if (!ranks[c.key]) ranks[c.key] = {} as Record<AttributionModel, number>;
      ranks[c.key][m] = i + 1;
    });
  });

  const w = 720, h = 320;
  const rowH = 30, padTop = 20, padBot = 20;
  const colCount = models.length;
  const xs = (mi: number) => 80 + mi * ((w - 80 - 80) / (colCount - 1));
  const ys = (rank: number) => padTop + (rank - 1) * rowH;
  const maxRank = channels.length;

  return (
    <div className="bump-wrap">
      <div className="bump-row" style={{ gridTemplateColumns: `repeat(${models.length}, 1fr)`, paddingLeft: 80, paddingRight: 80 }}>
        {models.map(m => <div key={m}>{ATTRIBUTION_MODEL_LABELS[m]}</div>)}
      </div>
      <svg className="bump-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {models.map((m, mi) => (
          <line key={m} x1={xs(mi)} x2={xs(mi)} y1={padTop - 8} y2={padTop + rowH * (maxRank - 1) + 8}
                stroke="var(--line-2)" strokeWidth="1" />
        ))}
        {channels.map(c => {
          const ch = CHANNELS[c.key];
          const pts = models.map((m, mi) => [xs(mi), ys(ranks[c.key][m])] as [number, number]);
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
          const rArr = models.map(m => ranks[c.key][m]);
          const swing = Math.max(...rArr) - Math.min(...rArr);
          const hot = swing >= 3;
          return (
            <g key={c.key}>
              <path d={d} stroke={ch.color} strokeWidth={hot ? 2.5 : 1.5} fill="none" opacity={hot ? 1 : 0.55} />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={hot ? 6 : 4.5} fill={ch.color} stroke="white" strokeWidth="1.5" />
              ))}
              <text x={xs(0) - 12} y={ys(ranks[c.key][models[0]]) + 4} textAnchor="end"
                    style={{ fontSize: 11, fill: hot ? "var(--ink)" : "var(--ink-2)", fontWeight: hot ? 600 : 500 }}>
                {ch.name}
              </text>
              <text x={xs(models.length - 1) + 12} y={ys(ranks[c.key][models[models.length - 1]]) + 4}
                    style={{ fontSize: 11, fill: hot ? "var(--ink)" : "var(--ink-2)", fontWeight: hot ? 600 : 500 }}>
                #{ranks[c.key][models[models.length - 1]]} · {c[models[models.length - 1]]}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AllocTable({ models }: { models: AttributionModel[] }) {
  const channels = ATTRIBUTION_CHANNELS;
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Channel</th>
          {models.map(m => <th key={m} className="num">{ATTRIBUTION_MODEL_LABELS[m]}</th>)}
          <th className="num">Spread</th>
        </tr>
      </thead>
      <tbody>
        {channels.map(c => {
          const ch = CHANNELS[c.key];
          const vals = models.map(m => c[m] as number);
          const spread = Math.max(...vals) - Math.min(...vals);
          const isWide = spread >= 10;
          return (
            <tr key={c.key}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 18, height: 18, background: ch.color, borderRadius: 4 }}></span>
                  <span style={{ fontWeight: 500 }}>{ch.name}</span>
                </div>
              </td>
              {models.map(m => {
                const v = c[m] as number;
                const max = Math.max(...vals);
                const isMax = v === max && vals.filter(x => x === max).length === 1;
                return (
                  <td key={m} className="num">
                    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                      <div style={{ width: 60, height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: (v / 35) * 100 + "%", height: "100%", background: ch.color, opacity: 0.7 }}></div>
                      </div>
                      <span style={{ fontWeight: isMax ? 700 : 500, minWidth: 36 }}>{v}%</span>
                    </div>
                  </td>
                );
              })}
              <td className="num">
                <span className={`shift-badge ${isWide ? "up" : ""}`}>{spread}pt</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function AttributionPage() {
  const { client, model, setModel } = useChapter();
  const [mode, setMode] = useState<"compare" | "single">("compare");
  const [selectedModels, setSelectedModels] = useState<AttributionModel[]>(["first", "linear", "last"]);

  const toggleModel = (m: AttributionModel) => {
    setSelectedModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const allModels: AttributionModel[] = ["first", "last", "linear", "custom"];
  const bumpModels = (selectedModels.length >= 2
    ? selectedModels.filter(m => m !== "custom")
    : ["first", "linear", "last"]) as AttributionModel[];
  const tableModels = (selectedModels.length >= 2 ? selectedModels : ["first", "linear", "last"]) as AttributionModel[];

  return (
    <>
      <TopBar
        title="Attribution Models"
        subtitle={`How channel credit shifts across modeling choices · ${client.name}`}
      />
      <div className="content">
        <div className="card" style={{ padding: "18px 22px" }}>
          <div className="filter-bar" style={{ justifyContent: "space-between" }}>
            <div className="filter-bar">
              <div className="toggle-group">
                <button className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>Compare models</button>
                <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>Single model</button>
              </div>
              {mode === "compare" ? (
                <div className="filter-bar">
                  <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".1em", marginRight: 4 }}>Showing</span>
                  {allModels.map(m => (
                    <button key={m} className={`btn-ghost ${selectedModels.includes(m) ? "active" : ""}`} onClick={() => toggleModel(m)}>
                      {ATTRIBUTION_MODEL_LABELS[m]}
                      {m === "custom" && <span className="dim" style={{ marginLeft: 6, fontSize: 9, textTransform: "uppercase", letterSpacing: ".1em" }}>custom</span>}
                    </button>
                  ))}
                </div>
              ) : (
                <Dropdown align="left" width={240} trigger={
                  <button className="toolbar-btn">
                    <span style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".1em" }}>Model</span>
                    <span style={{ fontWeight: 600 }}>{ATTRIBUTION_MODEL_LABELS[model]}</span>
                    <span className="chev"><Icon name="chev" size={12}/></span>
                  </button>
                }>
                  {(close) => (
                    <>
                      {allModels.map(m => (
                        <button key={m} className={`dd-item ${model === m ? "active" : ""}`} onClick={() => { setModel(m); close(); }}>
                          <span>{ATTRIBUTION_MODEL_LABELS[m]}</span>
                          {model === m && <span className="check"><Icon name="check" size={14}/></span>}
                        </button>
                      ))}
                    </>
                  )}
                </Dropdown>
              )}
            </div>
            <div className="filter-bar">
              <button className="toolbar-btn"><Icon name="plus" size={12}/> New custom model</button>
            </div>
          </div>
        </div>

        {mode === "compare" ? (
          <>
            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Channel rank shifts across attribution models</h3>
                  <div className="card-sub">The biggest swings — Meta, Email, Direct — are where the choice of model matters most.</div>
                </div>
                <div className="fresh">Recomputed 12 minutes ago</div>
              </div>
              <BumpChart models={bumpModels} />
            </div>

            <div className="card flush">
              <AllocTable models={tableModels} />
            </div>

            <div className="grid-3">
              {[
                { ch: "email"  as const, text: "Email's credit nearly quadruples from First (8%) to Last (28%) — it is being credited for closing, not opening.", spread: "8% → 28%" },
                { ch: "meta"   as const, text: "Meta drops from #1 (First, 26%) to #8 (Last, 4%) — a strong opener under-credited by last-touch.", spread: "26% → 4%" },
                { ch: "direct" as const, text: "Direct's credit ranges from 4% (First) to 31% (Last) — typical of branded/return traffic concentrated at close.", spread: "4% → 31%" },
              ].map((s, i) => {
                const c = CHANNELS[s.ch];
                return (
                  <div key={i} className="card" style={{ padding: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ width: 24, height: 24, background: c.color, color: "white", display: "grid", placeItems: "center", borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{c.short}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                        <div className="mono" style={{ color: "var(--ink-3)" }}>{s.spread}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.text}</div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <SingleModelView />
        )}
      </div>
    </>
  );
}

function SingleModelView() {
  const { model } = useChapter();
  const channels = ATTRIBUTION_CHANNELS;
  const sorted = [...channels].sort((a, b) => (b[model] as number) - (a[model] as number));
  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3 className="card-title">Channel allocation under {ATTRIBUTION_MODEL_LABELS[model]}</h3>
          <div className="card-sub">Share of attributed revenue · $418,290 attributed across {channels.length} channels</div>
        </div>
        {model === "custom" && <span className="role-pill closer">Custom model</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sorted.map(c => {
          const ch = CHANNELS[c.key];
          const pct = c[model] as number;
          return (
            <div key={c.key} style={{ display: "grid", gridTemplateColumns: "140px 1fr 80px 80px", gap: 14, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 18, height: 18, background: ch.color, borderRadius: 4 }}></span>
                <span style={{ fontWeight: 500, fontSize: 13 }}>{ch.name}</span>
              </div>
              <div style={{ background: "var(--bg-2)", borderRadius: 8, height: 24, overflow: "hidden" }}>
                <div style={{ width: (pct / 35) * 100 + "%", height: "100%", background: ch.color, opacity: 0.85 }}></div>
              </div>
              <div className="lrow-num" style={{ textAlign: "right", fontWeight: 600 }}>{pct}%</div>
              <div className="lrow-num muted" style={{ textAlign: "right" }}>{fmtMoneyK(418290 * pct / 100)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
