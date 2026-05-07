const WEBHOOK_URL = process.env.CHAPTER_GCHAT_WEBHOOK_URL;

export type GChatMessage =
  | { text: string }
  | { cardsV2: Array<{ cardId: string; card: Record<string, unknown> }> };

export async function postToGChat(payload: GChatMessage): Promise<void> {
  if (!WEBHOOK_URL) {
    throw new Error("CHAPTER_GCHAT_WEBHOOK_URL not configured");
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    throw new Error(`GChat webhook failed: ${res.status} ${res.statusText} — ${body}`);
  }
}

export function isGChatConfigured(): boolean {
  return Boolean(WEBHOOK_URL);
}
