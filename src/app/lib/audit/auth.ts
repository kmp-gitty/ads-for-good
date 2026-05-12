import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AuthAttempt = {
  endpoint: string;
  client_key: string | null;
  success: boolean;
  failure_reason?: string;
  ip_hash?: string | null;
  user_agent_snippet?: string | null;
  request_id?: string | null;
};

export async function logAuthAttempt(attempt: AuthAttempt): Promise<void> {
  // Audit logging must never block the actual request flow.
  // Errors here are non-fatal — the auth decision still stands.
  try {
    await supabase
      .schema("chapter_audit")
      .from("api_auth_attempts")
      .insert({
        endpoint: attempt.endpoint,
        client_key: attempt.client_key,
        success: attempt.success,
        failure_reason: attempt.failure_reason ?? null,
        ip_hash: attempt.ip_hash ?? null,
        user_agent_snippet: attempt.user_agent_snippet?.slice(0, 200) ?? null,
        request_id: attempt.request_id ?? null,
      });
  } catch (err) {
    console.error("[audit] auth log failed:", err);
  }
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export function getClientIp(req: {
  headers: { get(name: string): string | null };
}): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
