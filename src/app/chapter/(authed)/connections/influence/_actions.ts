"use server";

// Server action: receive pasted emails, hash them, create a cohort row + the
// member hashes. RAW EMAILS NEVER PERSIST — they're hashed in-process and
// immediately discarded. Only the SHA-256 hex digest is stored.
//
// Hashing convention matches the rest of Chapter (identity ingest):
//   SHA-256(lowercase(trim(email)))
// → identifier_hash. The identity_canon join later prefixes with 'email_sha256:'.

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { hashSecret } from "../../../../lib/audit/pii-views";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashEmail(raw: string): string {
  return crypto.createHash("sha256").update(raw.trim().toLowerCase()).digest("hex");
}

export type CreateCohortResult =
  | { ok: true;  cohort_id: string; total_uploaded: number; total_matched: number }
  | { ok: false; error: string };

export async function createCohort(input: {
  clientKey: string;
  name:      string;
  pasted:    string;
}): Promise<CreateCohortResult> {
  const name = (input.name ?? "").trim();
  if (!name) return { ok: false, error: "Cohort name is required." };

  // Parse pasted block: one identifier per line, accept commas/tabs/semis too.
  // Trim and lowercase; filter to syntactically-valid emails. Dedupe.
  const tokens = (input.pasted ?? "")
    .split(/[\s,;]+/)
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  const validEmails = Array.from(new Set(tokens.filter(t => EMAIL_RE.test(t))));
  if (validEmails.length === 0) {
    return { ok: false, error: "No valid emails detected. Paste one email per line (or comma-separated)." };
  }
  if (validEmails.length > 50000) {
    return { ok: false, error: "Upload capped at 50,000 entries per cohort. Split into multiple cohorts if needed." };
  }

  const hashes = validEmails.map(hashEmail);

  // Hashed viewer_session for audit trail. No raw cookie value persists.
  const cookieStore = await cookies();
  const viewerSession = hashSecret(cookieStore.get("chapter_auth")?.value ?? null);

  // 1. INSERT the cohort row (totals filled in after match step).
  const insertCohort = await supabase
    .schema("chapter_config")
    .from("connections_cohorts")
    .insert({
      client_key:      input.clientKey,
      name,
      identifier_type: "email_sha256",
      total_uploaded:  hashes.length,
      total_matched:   0,
      created_by:      viewerSession,
    })
    .select("id")
    .single();

  if (insertCohort.error || !insertCohort.data) {
    console.error("[create-cohort] insert cohort failed:", insertCohort.error);
    return { ok: false, error: "Failed to create cohort. Please try again." };
  }
  const cohortId: string = insertCohort.data.id as string;

  // 2a. Pre-resolve which hashes map to a canonical identity NOW. The
  //     resolver+panel can still fall back to live canon resolution for
  //     unresolved hashes (so identities that join canon LATER are picked
  //     up), but pre-resolving the easy ones makes the panel join faster.
  const { data: canonRows } = await supabase
    .schema("chapter_identity")
    .from("identity_canon")
    .select("identity_key, canonical_identity_key")
    .eq("client_key", input.clientKey)
    .in("identity_key", hashes.map(h => `email_sha256:${h}`));

  const hashToCanonical = new Map<string, string>();
  for (const row of (canonRows ?? []) as { identity_key: string; canonical_identity_key: string }[]) {
    const bare = row.identity_key.replace(/^email_sha256:/, "");
    hashToCanonical.set(bare, row.canonical_identity_key);
  }

  // 2b. INSERT the member rows in batches of 1000 to keep statements small.
  //     identifier_hash is always set; canonical_identity_key is filled when
  //     we resolved it at upload time.
  const batchSize = 1000;
  for (let i = 0; i < hashes.length; i += batchSize) {
    const batch = hashes.slice(i, i + batchSize).map(h => ({
      cohort_id:              cohortId,
      identifier_hash:        h,
      canonical_identity_key: hashToCanonical.get(h) ?? null,
    }));
    const { error } = await supabase
      .schema("chapter_config")
      .from("connections_cohort_members")
      .insert(batch);
    if (error) {
      console.error("[create-cohort] insert members batch failed:", error);
      // Clean up the parent row so we don't leave a 0-member cohort.
      await supabase.schema("chapter_config").from("connections_cohorts").delete().eq("id", cohortId);
      return { ok: false, error: "Failed to save cohort members. Please try again." };
    }
  }

  // 3. Compute match count via direct SQL — identifier hashes that resolve in
  //    identity_canon for this client.
  const matchQuery = await supabase
    .schema("chapter_reporting")
    .rpc("connections_anchor_resolve", {
      p_client_key:     input.clientKey,
      p_anchor_type:    "cohort",
      p_anchor_payload: {
        cohort_id: cohortId,
        // start/end_ts unused for match counting but the resolver requires them.
        start_ts:  new Date(0).toISOString(),
        end_ts:    new Date(Date.now() + 86_400_000).toISOString(),
      },
    });

  let matched = 0;
  if (!matchQuery.error && Array.isArray(matchQuery.data) && matchQuery.data[0]) {
    matched = Number((matchQuery.data[0] as { n_identities: number }).n_identities) || 0;
  }

  // 4. Persist the match count for fast picker display.
  await supabase
    .schema("chapter_config")
    .from("connections_cohorts")
    .update({ total_matched: matched })
    .eq("id", cohortId);

  // 5. Bust the influence page's cache so the new cohort shows immediately.
  revalidatePath("/chapter/connections/influence");

  return { ok: true, cohort_id: cohortId, total_uploaded: hashes.length, total_matched: matched };
}
