// Audit logger for dashboard PII detail views.
//
// Writes to chapter_audit.dashboard_pii_views — one row per opened detail
// panel. Forms the audit trail for SAR responses and access reviews.
//
// "viewer_session" today is a SHA-256 hash of the chapter_auth cookie value
// (everyone with dashboard access shares the same value). When per-user auth
// lands, swap to user_id for true per-operator attribution.

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type PiiViewEntry = {
  page: string;                     // e.g., "/chapter/journeys"
  client_key: string;
  viewed_identity: string;          // canonical_identity_key
  viewer_session?: string | null;   // SHA-256 of chapter_auth cookie
  ip_hash?: string | null;
  user_agent_snippet?: string | null;
  request_id?: string | null;
};

export async function logPiiView(entry: PiiViewEntry): Promise<void> {
  // Audit must never break a page render. Failures get console.error'd only.
  try {
    await supabase
      .schema("chapter_audit")
      .from("dashboard_pii_views")
      .insert({
        page: entry.page,
        client_key: entry.client_key,
        viewed_identity: entry.viewed_identity,
        viewer_session: entry.viewer_session ?? null,
        ip_hash: entry.ip_hash ?? null,
        user_agent_snippet: entry.user_agent_snippet?.slice(0, 200) ?? null,
        request_id: entry.request_id ?? null,
      });
  } catch (err) {
    console.error("[audit] pii-view log failed:", err);
  }
}

export function hashSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex");
}
