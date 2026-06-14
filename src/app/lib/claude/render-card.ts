// Claude Sonnet wrapper for rendering Recommendation cards.
//
// Input: a phrasing template + a structured data object (rule evaluator output).
// Output: { headline, story, action } — strings filled per the template using the
// provided data. Claude does NOT generate the underlying numbers or facts; it
// fills the template precisely. All data access happens in the rule evaluators,
// which run pre-written parameterized queries.
//
// Failure mode: on API error or invalid response shape, falls back to a
// template-substitution renderer that uses literal {placeholder} replacement.
// Findings written with `render_method = 'fallback'` so ops can see when the
// API is degraded.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const SYSTEM_PROMPT =
  "You are Chapter's recommendation renderer. Given a structured phrasing template " +
  "and a data object, produce a headline, story, and action by filling the template " +
  "precisely with the provided data. Do not invent numbers, channels, or facts. Do " +
  "not add commentary. Output only the requested JSON shape: " +
  '{"headline": "...", "story": "...", "action": "..."}. ' +
  "Match Chapter's voice: direct, evidence-led, no breathless language, no exclamation " +
  "points, no emoji. Use specific numbers, not vague qualifiers. Never use absolute " +
  "superlatives (best/worst/strongest) without supporting numbers from the data.";

export type PhrasingTemplate = {
  headline: string;
  story: string;
};

export type ActionTemplate = {
  action: string;
};

export type RenderedCard = {
  headline: string;
  story: string;
  action: string;
};

export type RenderResult = {
  card: RenderedCard;
  render_method: "claude" | "fallback";
};

// Public entrypoint. Tries Claude once with a single retry on transient error,
// falls back to template substitution on persistent failure.
export async function renderRecommendationCard(
  phrasing: PhrasingTemplate,
  action: ActionTemplate,
  data: Record<string, unknown>,
): Promise<RenderResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[render-card] ANTHROPIC_API_KEY missing — falling back to template substitution");
    return { card: fallbackRender(phrasing, action, data), render_method: "fallback" };
  }

  const client = new Anthropic({ apiKey });
  const userMessage = buildUserMessage(phrasing, action, data);

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      });
      const text = res.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      const parsed = parseJsonResponse(text);
      if (parsed) {
        return { card: parsed, render_method: "claude" };
      }
      console.warn(`[render-card] attempt ${attempt + 1} returned unparseable response`);
    } catch (err) {
      console.warn(`[render-card] attempt ${attempt + 1} threw:`, err instanceof Error ? err.message : String(err));
    }
  }

  return { card: fallbackRender(phrasing, action, data), render_method: "fallback" };
}

function buildUserMessage(
  phrasing: PhrasingTemplate,
  action: ActionTemplate,
  data: Record<string, unknown>,
): string {
  return [
    "Phrasing template (fill with the provided data):",
    JSON.stringify(phrasing, null, 2),
    "",
    "Action template:",
    JSON.stringify(action, null, 2),
    "",
    "Data:",
    JSON.stringify(data, null, 2),
    "",
    'Return JSON: {"headline": "...", "story": "...", "action": "..."}',
  ].join("\n");
}

function parseJsonResponse(text: string): RenderedCard | null {
  // Tolerate code-fenced output (```json ... ```).
  const cleaned = text
    .replace(/^```(?:json)?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      typeof parsed.headline === "string" &&
      typeof parsed.story === "string" &&
      typeof parsed.action === "string"
    ) {
      return parsed as RenderedCard;
    }
  } catch {
    // fall through
  }
  return null;
}

// Template substitution fallback. Replaces {key} tokens in the template
// strings with stringified values from `data`. Unknown tokens are left
// in place so the operator can see something went wrong rather than silently
// producing bad copy.
function fallbackRender(
  phrasing: PhrasingTemplate,
  action: ActionTemplate,
  data: Record<string, unknown>,
): RenderedCard {
  const sub = (template: string): string =>
    template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
      const v = data[key];
      if (v === undefined || v === null) return `{${key}}`;
      return String(v);
    });
  return {
    headline: sub(phrasing.headline),
    story: sub(phrasing.story),
    action: sub(action.action),
  };
}
