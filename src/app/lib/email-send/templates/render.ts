// MI v2 Phase 3 — Template rendering.
//
// Composes the final email from three pieces:
//   1. The shell (HTML wrapper with branding + footer)
//   2. The operator-authored subject + body (from chapter_config.email_templates)
//   3. Merge data substituted at send time (offer_code, product_name, etc.)
//
// Merge tokens use {{key}} syntax. Unknown tokens are left as-is so operators
// can SEE in the rendered email that a substitution failed (better than silently
// producing empty strings).

import type { EmailMergeData, RenderedTemplate, ClientEmailConfig } from "../types";
import { renderDefaultShell, htmlToPlain } from "./default-shell";

const DEFAULT_REPLY_TO = "katoa@ads4good.com";

export function renderTemplate(args: {
  subject: string;
  body: string;
  merge_data: EmailMergeData;
  client: ClientEmailConfig;
}): RenderedTemplate {
  const subject = substituteMergeTokens(args.subject, args.merge_data);
  const bodyHtml = substituteMergeTokens(toHtmlParagraphs(args.body), args.merge_data);

  const replyTo = args.client.email_reply_to || DEFAULT_REPLY_TO;
  const subjectPreview = subject.slice(0, 90);

  const html = renderDefaultShell({
    body_html: bodyHtml,
    subject_preview: subjectPreview,
    reply_to: replyTo,
  });
  const text = htmlToPlain(html);

  return { subject, html, text };
}

// Operator template bodies are markdown-ish plain text. Convert blank-line-separated
// blocks to <p>, single newlines to <br/>. Preserve {{merge}} tokens for later
// substitution. Operators can also paste raw HTML — if a block starts with '<',
// pass through unchanged.
function toHtmlParagraphs(body: string): string {
  const blocks = body.split(/\n\s*\n/);
  return blocks
    .map(b => {
      const trimmed = b.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("<")) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

// Replace {{key}} occurrences with values from merge_data. Numbers/booleans
// stringified; null left as empty. Unknown keys left as literal {{key}} so
// operators can see in the rendered email that the substitution failed.
function substituteMergeTokens(s: string, merge_data: EmailMergeData): string {
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, key) => {
    if (!(key in merge_data)) return full;
    const v = merge_data[key];
    if (v == null) return "";
    return String(v);
  });
}
