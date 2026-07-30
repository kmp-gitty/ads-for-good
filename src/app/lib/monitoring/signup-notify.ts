// Self-serve signup notification.
//
// Fires a Google Chat ping the moment a new self-serve tenant is provisioned
// (from provisionSelfServeTenant). Routes to a dedicated "Chapter Signups"
// space via CHAPTER_SIGNUPS_GCHAT_WEBHOOK_URL so happy signup pings don't drown
// in operational/cron noise; falls back to the default ops webhook if the
// dedicated var isn't set. No-ops silently if neither is configured.
//
// Always fire-and-forget from the caller — a notification failure must never
// block the visitor's provisioning/redirect.

import { postToGChatUrl } from "./gchat";

type SignupNotice = {
  clientKey: string;
  email: string;
  company: string;
  fullName: string | null;
  phone: string | null;
  trialDays: number;
};

export async function notifySelfServeSignup(n: SignupNotice): Promise<void> {
  const url =
    process.env.CHAPTER_SIGNUPS_GCHAT_WEBHOOK_URL ||
    process.env.CHAPTER_GCHAT_WEBHOOK_URL;
  if (!url) return; // not configured — silently skip

  const trialEnd = new Date(Date.now() + n.trialDays * 86_400_000).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  const lines = [
    "🎉 *New Chapter self-serve signup*",
    `*Company:* ${n.company}  \`${n.clientKey}\``,
    `*Name:* ${n.fullName?.trim() || "—"}`,
    `*Email:* ${n.email}`,
    `*Phone:* ${n.phone?.trim() || "—"}`,
    `*Trial:* ${n.trialDays}-day free trial (Smart Prompts + Smart Links) · ends ${trialEnd}`,
  ];

  await postToGChatUrl(url, { text: lines.join("\n") });
}
