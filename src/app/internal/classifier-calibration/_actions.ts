"use server";

// Classifier calibration server actions.
// Sample unlabeled journeys + write operator labels.

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getCurrentChapterUserOrLegacy } from "@/app/lib/auth/chapter-user";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type LabelInput = {
  client_key: string;
  journey_id: string;
  journey_start_ts: string;
  mv_bot_class: string;
  mv_bot_score: number;
  operator_label: "human" | "suspect" | "bot" | "unsure";
  operator_notes?: string;
};

type Result = { ok: true } | { ok: false; error: string };

export async function submitLabel(input: LabelInput): Promise<Result> {
  const user = await getCurrentChapterUserOrLegacy();
  const labeled_by = user?.email || "system";

  const { error } = await supabase
    .schema("chapter_observations")
    .from("classifier_labels")
    .upsert(
      {
        client_key: input.client_key,
        journey_id: input.journey_id,
        journey_start_ts: input.journey_start_ts,
        mv_bot_class: input.mv_bot_class,
        mv_bot_score: input.mv_bot_score,
        operator_label: input.operator_label,
        operator_notes: input.operator_notes || null,
        labeled_by,
        labeled_at: new Date().toISOString(),
      },
      { onConflict: "client_key,journey_id" },
    );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/internal/classifier-calibration");
  return { ok: true };
}
