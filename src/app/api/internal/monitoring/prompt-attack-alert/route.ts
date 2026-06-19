import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { postToGChatUrl } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Attack-alert cron for the identity-prompt-email endpoint.
//
// Queries chapter_audit.api_auth_attempts for the last 15 minutes of
// rejections on /api/chapter/identity-prompt-email. Filters to attack-shaped
// failure reasons (honeypot / session / rate-limited) — skips legit user
// errors (invalid_email, missing_required_fields) so typo-prone humans
// don't trigger the alarm.
//
// Fires when count crosses CHAPTER_ATTACK_ALERT_THRESHOLD (default 10).
// Posts to CHAPTER_SECURITY_GCHAT_WEBHOOK_URL with a breakdown by reason
// + top targeted clients + top offending IP hashes.
//
// Schedule: every 15 min, matching the stuck-runs cadence.
export const maxDuration = 60;

const supabase = createClient(
  process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Webhook routing: dedicated security space first, fall back to operational
// channel if not configured. Mirrors the inquiries-webhook fallback pattern.
const SECURITY_WEBHOOK_URL =
  process.env.CHAPTER_SECURITY_GCHAT_WEBHOOK_URL ||
  process.env.CHAPTER_GCHAT_WEBHOOK_URL ||
  "";

const WINDOW_MINUTES = 15;
const DEFAULT_THRESHOLD = 10;

// Attack-shaped failure reasons. Everything else (invalid_email,
// missing_required_fields, prompt_not_found, etc.) is normal user-error
// noise and isn't counted toward the alert threshold.
const ATTACK_REASONS = new Set([
  "honeypot_filled",
  "session_malformed",
  "session_bad_signature",
  "session_expired",
  "session_wrong_client_key",
  "session_missing_secret",
  "rate_limited",
  "invalid_json",
]);

type AuditRow = {
  failure_reason: string | null;
  client_key: string | null;
  ip_hash: string | null;
  ts: string;
};

export async function GET(req: NextRequest) {
  const unauthorized = unauthorizedIfNotCron(req);
  if (unauthorized) return unauthorized;

  if (!SECURITY_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "no_webhook_configured" },
      { status: 500 },
    );
  }

  const threshold = Number(process.env.CHAPTER_ATTACK_ALERT_THRESHOLD) || DEFAULT_THRESHOLD;
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { data, error } = await supabase
    .schema("chapter_audit")
    .from("api_auth_attempts")
    .select("failure_reason, client_key, ip_hash, ts")
    .eq("endpoint", "/api/chapter/identity-prompt-email")
    .eq("success", false)
    .gte("ts", cutoff);

  if (error) {
    console.error("[prompt-attack-alert] query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = (data ?? []) as AuditRow[];
  const attacks = all.filter((r) => r.failure_reason && ATTACK_REASONS.has(r.failure_reason));

  // Below threshold → no alert. Endpoint is silent so a healthy state
  // doesn't spam the channel.
  if (attacks.length < threshold) {
    return NextResponse.json({
      ok: true,
      window_minutes: WINDOW_MINUTES,
      attack_count: attacks.length,
      total_rejections: all.length,
      threshold,
      alerted: false,
    });
  }

  // Breakdown by failure_reason, client_key, ip_hash
  const reasonCounts = countBy(attacks, (r) => r.failure_reason || "unknown");
  const clientCounts = countBy(attacks, (r) => r.client_key || "unknown");
  const ipCounts = countBy(attacks, (r) => r.ip_hash || "no_ip");

  const reasonLines = sortDesc(reasonCounts).map(
    ([reason, n]) => `• \`${reason}\` — ${n}`,
  );
  const clientLines = sortDesc(clientCounts).slice(0, 5).map(
    ([client, n]) => `• \`${client}\` — ${n}`,
  );
  const ipLines = sortDesc(ipCounts).slice(0, 5).map(
    ([ip, n]) => `• \`${ip.slice(0, 12)}…\` — ${n}`,
  );

  const text = [
    `🚨 *Identity-prompt email attack detected*`,
    `${attacks.length} attack-shaped rejections in last ${WINDOW_MINUTES} min (threshold: ${threshold})`,
    "",
    "*By reason*",
    ...reasonLines,
    "",
    "*Top targeted clients*",
    ...clientLines,
    "",
    "*Top offending IP hashes*",
    ...ipLines,
    "",
    "_Defenses are HOLDING — all of these are blocked, no emails went out._",
    "_Investigate via `SELECT * FROM chapter_audit.api_auth_attempts WHERE endpoint LIKE '%identity-prompt-email%' AND success = false ORDER BY ts DESC LIMIT 100;`_",
  ].join("\n");

  try {
    await postToGChatUrl(SECURITY_WEBHOOK_URL, { text });
  } catch (err) {
    console.error("[prompt-attack-alert] GChat post failed:", err);
    return NextResponse.json(
      { error: "alert query ok but GChat post failed", attack_count: attacks.length },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    window_minutes: WINDOW_MINUTES,
    attack_count: attacks.length,
    total_rejections: all.length,
    threshold,
    alerted: true,
  });
}

function countBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = keyFn(r);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function sortDesc(m: Map<string, number>): [string, number][] {
  return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
}
