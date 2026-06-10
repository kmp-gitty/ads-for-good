// Fire-and-forget alias-edge writer for the Tier 1 redirect's solution-2
// stitching paths. Inserts a row into chapter_identity.identity_aliases so
// the canon trigger (trg_sync_canon_from_alias) propagates the link into
// identity_canon. Same shape as /api/alias's INSERT, but called server-side
// from the redirect — no HMAC because this is process-internal.
//
// We always insert ON CONFLICT DO NOTHING so repeat clicks for the same
// recipient are idempotent. The canon trigger handles transitive closure
// (R -> email -> any future E_device).

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type StitchReason =
  | "redirect_email_prehashed"   // flavor #1: ?rh=<sha256> already-hashed email in URL
  | "redirect_email_plaintext"   // flavor #2: ?re=<plaintext> hashed server-side
  | "redirect_recipient_token";  // flavor #3: ?rid=<opaque> resolved via email_engagement_events

export async function stitchIdentity(
  client_key: string,
  from_identity_key: string,
  to_identity_key: string,
  reason: StitchReason,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (from_identity_key === to_identity_key) return;

  try {
    const { error } = await supabase
      .schema("chapter_identity")
      .from("identity_aliases")
      .insert({
        ts: new Date().toISOString(),
        client_key,
        from_identity_key,
        to_identity_key,
        method: "redirect_handoff",
        reason,
        metadata: metadata ?? null,
      });
    // 23505 = unique_violation = row already exists; ignore (idempotent semantic).
    if (error && (error as any).code !== "23505") {
      console.warn(`[identity-stitch] insert failed (${reason}):`, error.message);
    }
  } catch (err) {
    console.warn(`[identity-stitch] insert threw (${reason}):`, err);
  }
}
