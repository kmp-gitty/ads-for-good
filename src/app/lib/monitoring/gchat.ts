// Google Chat webhook helper.
//
// Default webhook is CHAPTER_GCHAT_WEBHOOK_URL (used for stuck-runs, daily
// digest, cron failures, etc.). Specific surfaces can route to their own
// dedicated webhook by calling postToGChatUrl() directly — the inquiry
// system uses CHAPTER_INQUIRIES_GCHAT_WEBHOOK_URL for example, so client
// inquiries don't drown in operational noise.

const DEFAULT_WEBHOOK_URL = process.env.CHAPTER_GCHAT_WEBHOOK_URL;

export type GChatMessage =
  | { text: string }
  | { cardsV2: Array<{ cardId: string; card: Record<string, unknown> }> };

/**
 * Low-level: post to an arbitrary webhook URL. Callers that route to a
 * non-default channel should use this directly.
 */
export async function postToGChatUrl(
  webhookUrl: string,
  payload: GChatMessage,
): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    throw new Error(`GChat webhook failed: ${res.status} ${res.statusText} — ${body}`);
  }
}

/**
 * Post to the default operational webhook (CHAPTER_GCHAT_WEBHOOK_URL).
 * Used by stuck-runs, daily-digest, etc.
 */
export async function postToGChat(payload: GChatMessage): Promise<void> {
  if (!DEFAULT_WEBHOOK_URL) {
    throw new Error("CHAPTER_GCHAT_WEBHOOK_URL not configured");
  }
  await postToGChatUrl(DEFAULT_WEBHOOK_URL, payload);
}

export function isGChatConfigured(): boolean {
  return Boolean(DEFAULT_WEBHOOK_URL);
}
