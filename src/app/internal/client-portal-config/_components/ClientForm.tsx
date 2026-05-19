"use client";

import { useActionState } from "react";
import { saveClient, type ClientFormState } from "../_actions";
import { VALID_PLANS, VALID_SERVICES } from "../_constants";

type ClientRow = {
  client_key: string;
  business_name: string | null;
  status: string | null;
  active_plan: string | null;
  services_engaged: string[] | null;
  domain: string | null;
  contact_name: string | null;
  phone_number: string | null;
  location_count: number | null;
  primary_domains: string[] | null;
  packs_enabled: string[] | null;
  business_type: string[] | null;
  consent_mode: string | null;
  primary_boundary_event: string | null;
  portal_logo_path: string | null;
  notes: string | null;
  chapter_enabled: boolean | null;
  project_summaries: unknown;
  reporting_tiles: unknown;
};

const initialState: ClientFormState = { status: "idle" };

export default function ClientForm({
  initial,
  isNew,
}: {
  initial?: ClientRow;
  isNew: boolean;
}) {
  const [state, formAction, pending] = useActionState(saveClient, initialState);

  const v = (k: keyof ClientRow): string => {
    const x = initial?.[k];
    if (x == null) return "";
    if (typeof x === "string") return x;
    if (typeof x === "number") return String(x);
    return "";
  };
  const vArr = (k: keyof ClientRow): string => {
    const x = initial?.[k];
    return Array.isArray(x) ? x.join("\n") : "";
  };
  const vJson = (k: keyof ClientRow, fallback: string): string => {
    const x = initial?.[k];
    if (x == null) return fallback;
    return JSON.stringify(x, null, 2);
  };

  const activeServices = new Set(initial?.services_engaged ?? []);
  const fieldErr = (k: string) =>
    state.status === "error" && state.fieldErrors?.[k] ? state.fieldErrors[k] : null;

  return (
    <form action={formAction} className="space-y-8">
      {/* Hidden flags */}
      <input type="hidden" name="__is_new" value={isNew ? "1" : "0"} />
      {!isNew && initial && (
        <input type="hidden" name="__original_client_key" value={initial.client_key} />
      )}

      {/* Top-level error */}
      {state.status === "error" && !state.fieldErrors && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </div>
      )}

      {/* ─── Identity ────────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-neutral-200 bg-white p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700">
          Identity
        </legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field name="client_key" label="Client Key (slug)" required hint="snake_case, immutable" error={fieldErr("client_key")}>
            <input
              name="client_key"
              defaultValue={v("client_key")}
              placeholder="e.g. eos_fabrics"
              readOnly={!isNew}
              className={input(!isNew ? "bg-neutral-100" : "")}
            />
          </Field>
          <Field name="business_name" label="Business Name" required error={fieldErr("business_name")}>
            <input name="business_name" defaultValue={v("business_name")} className={input()} />
          </Field>
          <Field name="status" label="Status">
            <select name="status" defaultValue={v("status") || "current"} className={input()}>
              <option value="current">current</option>
              <option value="prospect">prospect</option>
              <option value="paused">paused</option>
              <option value="churned">churned</option>
            </select>
          </Field>
          <Field name="domain" label="Primary Domain">
            <input name="domain" defaultValue={v("domain")} placeholder="example.com" className={input()} />
          </Field>
          <Field name="contact_name" label="Contact Name">
            <input name="contact_name" defaultValue={v("contact_name")} className={input()} />
          </Field>
          <Field name="phone_number" label="Phone Number">
            <input name="phone_number" defaultValue={v("phone_number")} className={input()} />
          </Field>
          <Field name="location_count" label="Location Count" error={fieldErr("location_count")}>
            <input name="location_count" type="number" min={0} defaultValue={v("location_count")} className={input()} />
          </Field>
          <Field name="business_type" label="Business Type(s)" hint="comma or newline separated">
            <textarea name="business_type" defaultValue={vArr("business_type")} rows={2} className={input()} />
          </Field>
        </div>
      </fieldset>

      {/* ─── Engagement ─────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-neutral-200 bg-white p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700">
          Engagement
        </legend>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field name="active_plan" label="Active Plan">
            <select name="active_plan" defaultValue={v("active_plan")} className={input()}>
              <option value="">— none —</option>
              {VALID_PLANS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field name="chapter_enabled" label="Chapter Enabled">
            <label className="inline-flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                name="chapter_enabled"
                defaultChecked={initial?.chapter_enabled ?? false}
              />
              <span className="text-sm text-neutral-700">Yes</span>
            </label>
          </Field>
          <Field name="services_engaged" label="Active Projects (services_engaged)" hint="check all that apply">
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {VALID_SERVICES.map((s) => (
                <label key={s} className="inline-flex items-center gap-2 text-sm text-neutral-800">
                  <input
                    type="checkbox"
                    name="services_engaged"
                    value={s}
                    defaultChecked={activeServices.has(s)}
                  />
                  {s.replace(/_/g, " ")}
                </label>
              ))}
            </div>
          </Field>
          <Field name="primary_domains" label="Primary Domains" hint="one per line or comma-separated">
            <textarea name="primary_domains" defaultValue={vArr("primary_domains")} rows={2} className={input()} />
          </Field>
          <Field name="packs_enabled" label="Packs Enabled" hint="one per line or comma-separated">
            <textarea name="packs_enabled" defaultValue={vArr("packs_enabled")} rows={2} className={input()} />
          </Field>
          <Field name="consent_mode" label="Consent Mode">
            <input name="consent_mode" defaultValue={v("consent_mode")} className={input()} />
          </Field>
          <Field name="primary_boundary_event" label="Primary Boundary Event">
            <input name="primary_boundary_event" defaultValue={v("primary_boundary_event")} className={input()} />
          </Field>
        </div>
      </fieldset>

      {/* ─── Portal Display ─────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-neutral-200 bg-white p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700">
          Portal Display
        </legend>
        <div className="mt-3 grid gap-4">
          <Field name="portal_logo_path" label="Portal Logo Path" hint="e.g. /images/AcmeLogo.avif">
            <input name="portal_logo_path" defaultValue={v("portal_logo_path")} className={input()} />
          </Field>
          <Field
            name="project_summaries"
            label="Project Summaries (JSON)"
            hint='{"SEO": {"headline": "...", "body": "...", "updated_at": "2026-05-19"}}'
            error={fieldErr("project_summaries")}
          >
            <textarea
              name="project_summaries"
              defaultValue={vJson("project_summaries", "{}")}
              rows={8}
              className={input("font-mono text-xs")}
            />
          </Field>
          <Field
            name="reporting_tiles"
            label="Reporting Tiles (JSON array)"
            hint='[{"title": "...", "project": "SEO", "description": "..."}]'
            error={fieldErr("reporting_tiles")}
          >
            <textarea
              name="reporting_tiles"
              defaultValue={vJson("reporting_tiles", "[]")}
              rows={6}
              className={input("font-mono text-xs")}
            />
          </Field>
        </div>
      </fieldset>

      {/* ─── Notes ──────────────────────────────────────────── */}
      <fieldset className="rounded-2xl border border-neutral-200 bg-white p-5">
        <legend className="px-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-700">
          Notes
        </legend>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={3}
          className={input("mt-3 w-full")}
        />
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {pending ? "Saving…" : isNew ? "Create Client" : "Save Changes"}
        </button>
        <a
          href="/internal/client-portal-config"
          className="text-sm text-neutral-700 hover:text-neutral-900"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

function input(extra = "") {
  return `w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${extra}`;
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-neutral-900">
        {label}
        {required && <span className="text-orange-600"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </label>
  );
}
