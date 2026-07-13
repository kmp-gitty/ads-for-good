"use server";

// Server actions for the Recommendations page. Operator-driven mutations on
// chapter_recommendations.findings that don't belong on the weekly engine's
// write path.

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentChapterUserOrLegacy } from "@/app/lib/auth/chapter-user";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type Result = { ok: true } | { ok: false; error: string };

// Set an operator override on a finding's displayed severity. null clears the
// override. Optionally attach a note explaining why.
export async function setFindingSeverityOverride(input: {
  finding_id: string;
  override: "high" | "medium" | "low" | null;
  note?: string | null;
}): Promise<Result> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, error: "unauthorized" };
  // chapter_staff + agency operator + client employee can all override on
  // findings they can see (RLS enforcement is agency-level via the middleware
  // gate; explicit role check is defensive).
  if (user.role !== "chapter_staff" && user.role !== "agency_operator" && user.role !== "client_employee") {
    return { ok: false, error: "unauthorized_role" };
  }

  const nowIso = new Date().toISOString();
  const payload: Record<string, unknown> =
    input.override === null
      ? {
          severity_override: null,
          severity_override_by: null,
          severity_override_at: null,
          severity_override_note: null,
        }
      : {
          severity_override: input.override,
          severity_override_by: user.email,
          severity_override_at: nowIso,
          severity_override_note: input.note?.trim() || null,
        };

  const { error } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .update(payload)
    .eq("id", input.finding_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/chapter/recommendations");
  return { ok: true };
}

// Dismiss a finding — sets dismissed_at + dismissed_by. Reversible via
// clearFindingDismissal.
export async function dismissFinding(input: {
  finding_id: string;
}): Promise<Result> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, error: "unauthorized" };

  const { error } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .update({
      dismissed_at: new Date().toISOString(),
      dismissed_by: user.email,
    })
    .eq("id", input.finding_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/chapter/recommendations");
  return { ok: true };
}

export async function clearFindingDismissal(input: {
  finding_id: string;
}): Promise<Result> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user) return { ok: false, error: "unauthorized" };

  const { error } = await supabase
    .schema("chapter_recommendations")
    .from("findings")
    .update({ dismissed_at: null, dismissed_by: null })
    .eq("id", input.finding_id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/chapter/recommendations");
  return { ok: true };
}
