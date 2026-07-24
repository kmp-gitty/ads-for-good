// Fire-and-forget alias-edge writer for the Tier 1 redirect's solution-2
// stitching paths. Inserts a row into chapter_identity.identity_aliases so
// the canon trigger (trg_sync_canon_from_alias) propagates the link into
// identity_canon. Same shape as /api/alias's INSERT, but called server-side
// from the redirect — no HMAC because this is process-internal.
//
// Upsert semantic (2026-07-24 fix): last-wins on the 2-col unique constraint
// (client_key, from_identity_key). Was previously an INSERT with a 23505
// catch that silently dropped any second alias attempt from the same anon —
// e.g. a household member re-clicking a redirect with a different recipient
// token would have been lost. Now the newer stitch wins; trg_log_alias_conflict
// captures the overwrite for post-hoc review.

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
      .upsert(
        {
          ts: new Date().toISOString(),
          client_key,
          from_identity_key,
          to_identity_key,
          method: "redirect_handoff",
          reason,
          metadata: metadata ?? null,
        },
        {
          // Target the 2-col unique index (client_key, from_identity_key). The
          // 3-col unique was dropped 2026-07-24 as strictly subsumed. Default
          // ignoreDuplicates=false → last-wins UPDATE on conflict.
          onConflict: "client_key,from_identity_key",
        },
      );
    if (error) {
      console.warn(`[identity-stitch] upsert failed (${reason}):`, error.message);
    }
  } catch (err) {
    console.warn(`[identity-stitch] upsert threw (${reason}):`, err);
  }
}
