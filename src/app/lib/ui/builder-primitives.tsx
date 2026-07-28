"use client";

// Shared builder primitives for the operator + self-serve surfaces.
//
// This module is the single source of truth for the visual language used by
// every "form-heavy admin builder" in Chapter: the self-serve prompt/link
// editors under /chapter/(authed)/{prompts,links}, and the operator surfaces
// under /internal/{identity-prompts,redirect-rules}.
//
// Design tokens + a small handful of layout helpers (Section / NumRow / etc.)
// live here so restyling those surfaces stays a single-file change.

import React from "react";
import { useRouter } from "next/navigation";

// ─── color tokens ───────────────────────────────────────────────────────────

export const INK = "#1F2D43";
export const MUTED = "#5C6B82";
export const FAINT = "#8A98AD";
export const ORANGE = "#E36410";
export const LINE = "#E5E0D4";
export const PANEL = "#FBFAF6";
export const SUBTLE = "#FFF4EC"; // light orange tint for chip-active / hero bg
export const GREEN = "#2E7D5B";
export const DANGER = "#B3261E";
export const DANGER_LINE = "#E7C9C6";
export const DANGER_BG = "#FDECEA";

// ─── shared input style ─────────────────────────────────────────────────────

export const inp: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontSize: 14,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 8,
  padding: "9px 11px",
};

export const inpMono: React.CSSProperties = {
  ...inp,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

// ─── Section (label + optional hint + children) ────────────────────────────

export function Section({
  label,
  hint,
  children,
  right,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: hint ? 2 : 6,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{label}</div>
        {right}
      </div>
      {hint && (
        <div style={{ fontSize: 11.5, color: FAINT, marginBottom: 6, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── NumRow — labeled number input (used for delays, percents, days) ───────

export function NumRow({
  label,
  value,
  onChange,
  min,
  max,
  width = 110,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  width?: number;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 13,
        color: MUTED,
      }}
    >
      <span style={{ width: 60 }}>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...inp, width }}
      />
    </label>
  );
}

// ─── BackLink — the "← Back to X" link at the top of editor pages ──────────

export function BackLink({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      style={{
        background: "none",
        border: "none",
        color: MUTED,
        fontSize: 13,
        cursor: "pointer",
        padding: 0,
      }}
    >
      ← {label}
    </button>
  );
}

// ─── PillButton — chip-style toggle button used in preset pickers, chip
// strips like consent mode / device type. `on` = selected, `disabled` grays. ──

export function PillButton({
  on,
  disabled,
  onClick,
  children,
  block,
  title,
}: {
  on: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  block?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={() => !disabled && onClick && onClick()}
      style={{
        fontSize: 13,
        fontWeight: 600,
        padding: "7px 14px",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        border: `1px solid ${on ? ORANGE : LINE}`,
        background: on ? SUBTLE : "white",
        color: disabled ? FAINT : on ? ORANGE : INK,
        opacity: disabled ? 0.6 : 1,
        display: block ? "block" : "inline-block",
        width: block ? "100%" : undefined,
        textAlign: block ? "left" : "center",
      }}
    >
      {children}
    </button>
  );
}

// ─── PrimaryButton / SecondaryButton — the orange save + white cancel pair ──

export function PrimaryButton({
  onClick,
  disabled,
  type = "button",
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: ORANGE,
        color: "white",
        fontSize: 14,
        fontWeight: 600,
        border: "none",
        borderRadius: 10,
        padding: "11px 22px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "white",
        color: INK,
        fontSize: 14,
        fontWeight: 600,
        border: `1px solid ${LINE}`,
        borderRadius: 10,
        padding: "11px 22px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── ErrorBanner — the reddish inline error surface used by all forms ──────

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      style={{
        marginTop: 16,
        background: DANGER_BG,
        border: `1px solid ${DANGER_LINE}`,
        color: DANGER,
        borderRadius: 8,
        padding: "10px 12px",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

// ─── PageHeader — the "H1 + subtitle + optional right-side action" block ──

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 20,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, margin: "0 0 4px" }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: MUTED, margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

// ─── miniBtn — compact icon-style button for reorder / delete in lists ─────

export const miniBtn: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: INK,
  background: "white",
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  width: 26,
  height: 26,
  cursor: "pointer",
  lineHeight: 1,
};
