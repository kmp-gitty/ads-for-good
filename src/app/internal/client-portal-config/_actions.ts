"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { VALID_PLANS, VALID_SERVICES, type PlanKey } from "./_constants";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const CLIENT_KEY_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;

export type ClientFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; clientKey: string };

function parseArrayField(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") return [];
  return value
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseJsonField(value: FormDataEntryValue | null, fallback: unknown): unknown {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("invalid_json");
  }
}

export async function saveClient(
  prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const isNew = formData.get("__is_new") === "1";
  const originalClientKey =
    typeof formData.get("__original_client_key") === "string"
      ? (formData.get("__original_client_key") as string)
      : null;

  const fieldErrors: Record<string, string> = {};

  // ── core required ────────────────────────────────────────────────
  const clientKey = String(formData.get("client_key") ?? "").trim();
  if (!CLIENT_KEY_PATTERN.test(clientKey)) {
    fieldErrors.client_key =
      "Must be snake_case, lowercase, start with a letter, max 63 chars (e.g. eos_fabrics)";
  }
  const businessName = String(formData.get("business_name") ?? "").trim();
  if (!businessName) fieldErrors.business_name = "Required";

  // ── enums ────────────────────────────────────────────────────────
  const status = String(formData.get("status") ?? "").trim() || null;
  const activePlanRaw = String(formData.get("active_plan") ?? "").trim();
  const activePlan: PlanKey | null = (VALID_PLANS as readonly string[]).includes(activePlanRaw)
    ? (activePlanRaw as PlanKey)
    : null;

  // ── arrays / multiselect ─────────────────────────────────────────
  const servicesEngaged = formData.getAll("services_engaged").map(String).filter((s) =>
    (VALID_SERVICES as readonly string[]).includes(s),
  );
  const primaryDomains = parseArrayField(formData.get("primary_domains"));
  const packsEnabled = parseArrayField(formData.get("packs_enabled"));
  const businessType = parseArrayField(formData.get("business_type"));

  // ── plain text ───────────────────────────────────────────────────
  const domain = String(formData.get("domain") ?? "").trim() || null;
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const phoneNumber = String(formData.get("phone_number") ?? "").trim() || null;
  const consentMode = String(formData.get("consent_mode") ?? "").trim() || null;
  const primaryBoundaryEvent = String(formData.get("primary_boundary_event") ?? "").trim() || null;
  const portalLogoPath = String(formData.get("portal_logo_path") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "") || null;

  // ── numbers / booleans ───────────────────────────────────────────
  const locationCountRaw = String(formData.get("location_count") ?? "").trim();
  const locationCount = locationCountRaw === "" ? null : Number(locationCountRaw);
  if (locationCount !== null && (!Number.isFinite(locationCount) || locationCount < 0)) {
    fieldErrors.location_count = "Must be a non-negative number";
  }
  const chapterEnabled = formData.get("chapter_enabled") === "on";

  // ── jsonb fields ─────────────────────────────────────────────────
  let projectSummaries: unknown;
  let reportingTiles: unknown;
  try {
    projectSummaries = parseJsonField(formData.get("project_summaries"), {});
  } catch {
    fieldErrors.project_summaries = "Invalid JSON";
  }
  try {
    reportingTiles = parseJsonField(formData.get("reporting_tiles"), []);
  } catch {
    fieldErrors.reporting_tiles = "Invalid JSON";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { status: "error", message: "Validation failed", fieldErrors };
  }

  const row = {
    client_key: clientKey,
    business_name: businessName,
    status,
    active_plan: activePlan,
    services_engaged: servicesEngaged,
    primary_domains: primaryDomains.length ? primaryDomains : null,
    packs_enabled: packsEnabled.length ? packsEnabled : null,
    business_type: businessType.length ? businessType : null,
    domain,
    contact_name: contactName,
    phone_number: phoneNumber,
    consent_mode: consentMode,
    primary_boundary_event: primaryBoundaryEvent,
    portal_logo_path: portalLogoPath,
    notes,
    location_count: locationCount,
    chapter_enabled: chapterEnabled,
    project_summaries: projectSummaries,
    reporting_tiles: reportingTiles,
    updated_at: new Date().toISOString(),
  };

  if (isNew) {
    const { error } = await supabase.schema("crm").from("clients").insert(row);
    if (error) {
      return {
        status: "error",
        message:
          error.code === "23505"
            ? `client_key "${clientKey}" already exists`
            : `Insert failed: ${error.message}`,
      };
    }
  } else {
    // If client_key changed during edit, that's a real rename — block for now.
    if (originalClientKey && originalClientKey !== clientKey) {
      return {
        status: "error",
        message: "Renaming client_key is not supported (it's the multi-tenant identity).",
      };
    }
    const { error } = await supabase
      .schema("crm")
      .from("clients")
      .update(row)
      .eq("client_key", clientKey);
    if (error) {
      return { status: "error", message: `Update failed: ${error.message}` };
    }
  }

  // updateTag is the Next 16 server-action-friendly tag invalidator —
  // provides read-your-own-writes (the redirect target sees fresh data).
  updateTag("portal-data");
  revalidatePath("/internal/client-portal-config");
  revalidatePath(`/internal/client-portal-config/${clientKey}`);

  redirect(`/internal/client-portal-config/${clientKey}?saved=1`);
}
