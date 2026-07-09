"use server";

// MI v2 Phase 5.6 — Offer threshold CRUD.
// Writes chapter_config.offer_thresholds rows and busts the evaluator's cache
// so changes take effect on the next bid submission.

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentChapterUserOrLegacy } from "@/app/lib/auth/chapter-user";
import { clearThresholdCache } from "@/app/lib/offers/evaluator";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type CreateInput = {
  client_key: string;
  target_type: "product" | "collection" | "global";
  target_id: string | null;
  threshold_pct: number | null;
  threshold_absolute: number | null;
  notes: string | null;
};

type Result = { ok: true } | { ok: false; error: string };

export async function createThreshold(input: CreateInput): Promise<Result> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.role !== "chapter_staff") {
    return { ok: false, error: "unauthorized" };
  }
  if (input.target_type !== "global" && !input.target_id) {
    return { ok: false, error: "target_id required for non-global scope" };
  }
  if (input.threshold_pct == null && input.threshold_absolute == null) {
    return { ok: false, error: "at least one of threshold_pct/threshold_absolute required" };
  }

  const { error } = await supabase
    .schema("chapter_config")
    .from("offer_thresholds")
    .insert({
      client_key: input.client_key,
      target_type: input.target_type,
      target_id: input.target_id,
      threshold_pct: input.threshold_pct,
      threshold_absolute: input.threshold_absolute,
      active: true,
      notes: input.notes,
      updated_by: user.email,
    });

  if (error) return { ok: false, error: error.message };

  clearThresholdCache(input.client_key);
  revalidatePath(`/internal/identity-prompts/${input.client_key}/offer-thresholds`);
  return { ok: true };
}

export async function setThresholdActive(
  clientKey: string,
  id: string,
  active: boolean,
): Promise<Result> {
  const user = await getCurrentChapterUserOrLegacy();
  if (!user || user.role !== "chapter_staff") {
    return { ok: false, error: "unauthorized" };
  }

  const { error } = await supabase
    .schema("chapter_config")
    .from("offer_thresholds")
    .update({ active, updated_by: user.email })
    .eq("id", id)
    .eq("client_key", clientKey);
  if (error) return { ok: false, error: error.message };

  clearThresholdCache(clientKey);
  revalidatePath(`/internal/identity-prompts/${clientKey}/offer-thresholds`);
  return { ok: true };
}
