// Welcome-sequence sender + scheduler.
//
// evaluateWelcome() decides, given a tenant's state + now, which step to send
// and which lapsed steps to close out as skipped (one send per run). The daily
// cron applies it; the auth callback sends step 0 directly. Sends go out as
// "Chapter by Ads for Good" via Resend; a 'sent' row is only written after a
// successful send so a transient failure retries next run.

import { Resend } from "resend";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { renderWelcomeEmail } from "./templates";
import type { WelcomeState } from "./state";

const DAY = 86_400_000;

export function evaluateWelcome(s: WelcomeState, nowMs: number): { skips: number[]; send: number | null } {
  if (s.subscribed || s.deletionRequested) return { skips: [], send: null };

  const created = s.createdAt ? new Date(s.createdAt).getTime() : nowMs;
  const ageDays = (nowMs - created) / DAY;
  const trialEnd = s.trialEndsAt ? new Date(s.trialEndsAt).getTime() : null;
  const daysToEnd = trialEnd !== null ? (trialEnd - nowMs) / DAY : Infinity;

  const done = new Set(s.alreadyHandled);
  const hasPrompts = s.tools.includes("smart_prompts");
  const hasLinks = s.tools.includes("smart_links");
  const needsInstall = (hasPrompts && !s.pixelInstalled) || (hasLinks && !s.domainConnected);
  const needsBuild = (hasPrompts && !s.hasPrompt) || (hasLinks && !s.hasLink);

  const skips: number[] = [];
  let send: number | null = null;
  const consider = (step: number, due: boolean, condMet: boolean) => {
    if (send !== null || done.has(step)) return;
    if (!due) return;
    if (condMet) send = step;
    else skips.push(step);
  };

  // Step 0 (instant welcome) is normally sent synchronously by the auth
  // callback on fresh provision. Backfill it here for any path that skips that
  // send — reactivation / reused-email signups — so it always eventually goes
  // out, ahead of the later steps. No-ops on the happy path, where the callback
  // already sent and recorded it (done.has(0)).
  consider(0, true, true);
  consider(1, ageDays >= 1, needsInstall);
  consider(2, ageDays >= 3, needsInstall);
  consider(3, ageDays >= 5, needsBuild);
  consider(4, ageDays >= 9, true);
  consider(5, trialEnd !== null && daysToEnd <= 3 && daysToEnd > 0, true);
  consider(6, trialEnd !== null && daysToEnd <= 0, true);

  return { skips, send };
}

async function recordWelcome(clientKey: string, step: number, status: "sent" | "skipped"): Promise<void> {
  const supabase = createSupabaseServiceRoleClient();
  await supabase
    .schema("chapter_config")
    .from("welcome_sequence_sent")
    .upsert({ client_key: clientKey, step, status }, { onConflict: "client_key,step", ignoreDuplicates: true });
}

// Send one step (or record it skipped if there's nothing to say). Returns true
// when an email actually went out.
export async function sendWelcomeStep(s: WelcomeState, step: number): Promise<boolean> {
  const tpl = renderWelcomeEmail(step, s);
  if (!tpl) {
    await recordWelcome(s.clientKey, step, "skipped");
    return false;
  }
  const from = process.env.FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !from || !s.email) {
    // Can't deliver — leave it unrecorded so it retries next run.
    return false;
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      to: s.email,
      from: `Chapter by Ads for Good <${from}>`,
      replyTo: "katoa@ads4good.com",
      subject: tpl.subject,
      html: tpl.html,
    });
    await recordWelcome(s.clientKey, step, "sent");
    return true;
  } catch (e) {
    console.error(`[welcome] step ${step} send failed for ${s.clientKey}:`, e instanceof Error ? e.message : e);
    return false;
  }
}

// Apply the schedule for one tenant: record skips, send the due step. Used by
// the cron.
export async function runWelcomeForTenant(s: WelcomeState, nowMs: number): Promise<number | null> {
  const { skips, send } = evaluateWelcome(s, nowMs);
  for (const step of skips) await recordWelcome(s.clientKey, step, "skipped");
  if (send !== null) {
    const ok = await sendWelcomeStep(s, send);
    return ok ? send : null;
  }
  return null;
}
