import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { postToGChatUrl } from "@/app/lib/monitoring/gchat";
import { unauthorizedIfNotCron } from "@/app/lib/monitoring/auth";

// Attack-alert cron for the email-sending auth endpoints.
//
// Queries chapter_audit.api_auth_attempts for the last 15 minutes of
// rejections on the endpoints that fire a branded email to a caller-supplied
// address (WATCHED_ENDPOINTS): the identity-prompt-email endpoint and the
// open self-serve signup endpoint (added 2026-07-30 after the signup-form
// email-bombing incident). Filters to attack-shaped failure reasons (honeypot /
// session / rate-limited / turnstile_*) — skips legit user errors
// (invalid_email, missing_required_fields) so typo-prone humans don't trigger
// the alarm.
//
// Fires when count crosses CHAPTER_ATTACK_ALERT_THRESHOLD (default 10).
// Posts to CHAPTER_SECURITY_GCHAT_WEBHOOK_URL with a breakdown by endpoint +
// reason + top targeted clients + top offending IP hashes.
//
// NOTE on cadence: this catches a fast flood (>=threshold in 15 min). A
// low-and-slow abuser (~1-2/hr, like the original signup incident) stays under
// the threshold — the daily-digest signup-abuse summary + the real-time
// new-tenant Google Chat ping are the coverage for that pattern.
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

// Endpoints that send a branded email to a caller-supplied address — the ones
// worth watching for abuse. Signup added 2026-07-30.
const WATCHED_ENDPOINTS = [
  "/api/chapter/identity-prompt-email",
  "/api/chapter-auth/signup",
];

// Attack-shaped failure reasons. Everything else (invalid_email,
// missing_required_fields, prompt_not_found, etc.) is normal user-error
// noise and isn't counted toward the alert threshold. Turnstile rejections
// carry a variable suffix (turnstile_missing_token, turnstile_<error-codes>),
// so they're matched by prefix in isAttackReason() rather than listed here.
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

function isAttackReason(reason: string | null): boolean {
  if (!reason) return false;
  return ATTACK_REASONS.has(reason) || reason.startsWith("turnstile_");
}

type AuditRow = {
  failure_reason: string | null;
  endpoint: string | null;
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
    .select("failure_reason, endpoint, client_key, ip_hash, ts")
    .in("endpoint", WATCHED_ENDPOINTS)
    .eq("success", false)
    .gte("ts", cutoff);

  if (error) {
    console.error("[prompt-attack-alert] query failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all = (data ?? []) as AuditRow[];
  const attacks = all.filter((r) => isAttackReason(r.failure_reason));

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

  // Breakdown by endpoint, failure_reason, client_key, ip_hash
  const endpointCounts = countBy(attacks, (r) => r.endpoint || "unknown");
  const reasonCounts = countBy(attacks, (r) => r.failure_reason || "unknown");
  const clientCounts = countBy(attacks, (r) => r.client_key || "unknown");
  const ipCounts = countBy(attacks, (r) => r.ip_hash || "no_ip");

  const endpointLines = sortDesc(endpointCounts).map(
    ([endpoint, n]) => `• \`${endpoint}\` — ${n}`,
  );
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
    `🚨 *Auth/prompt endpoint attack detected*`,
    `${attacks.length} attack-shaped rejections in last ${WINDOW_MINUTES} min (threshold: ${threshold})`,
    "",
    "*By endpoint*",
    ...endpointLines,
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
    "_Investigate via `SELECT * FROM chapter_audit.api_auth_attempts WHERE success = false ORDER BY ts DESC LIMIT 100;`_",
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
