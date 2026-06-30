// MI v2 Phase 3 — Default email shell.
//
// HTML wrapper used for all auto-sends unless an operator-authored
// shell is configured per client. Orange ads4good branding by default;
// client-specific senders can override email_sender_domain (Resend
// multi-domain) without changing the shell.
//
// Shell contract:
//   - {{subject_preview}} — first 90 chars of subject (preheader)
//   - {{body_html}}      — operator's template body, with merge data already substituted
//   - {{reply_to}}       — client.email_reply_to or system default
//   - {{footer_brand}}   — ads4good footer block

export function renderDefaultShell(args: {
  body_html: string;
  subject_preview: string;
  reply_to: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(args.subject_preview)}</title>
  <style>
    body { margin:0; padding:0; background:#F7F5F1; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; color:#1F2D43; }
    .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
    .card { background:#FFFFFF; border-radius:12px; padding:32px; box-shadow:0 1px 4px rgba(31,45,67,0.04); }
    .preheader { display:none !important; visibility:hidden; mso-hide:all; font-size:1px; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden; }
    .footer { margin-top:24px; padding:0 8px; color:#8B95A6; font-size:12px; line-height:1.6; text-align:center; }
    .footer a { color:#8B95A6; }
    h1, h2, h3 { color:#1F2D43; line-height:1.3; }
    p { color:#1F2D43; line-height:1.6; }
    a.button {
      display:inline-block; padding:12px 24px; background:#E36410; color:#FFFFFF !important;
      text-decoration:none; border-radius:8px; font-weight:600; margin:12px 0;
    }
    .offer-code {
      display:inline-block; padding:8px 16px; background:#FFF4EC; color:#E36410;
      font-family:Menlo,Monaco,Consolas,monospace; font-size:16px; font-weight:600;
      border-radius:6px; border:1px dashed #E36410; margin:8px 0;
    }
  </style>
</head>
<body>
  <span class="preheader">${escapeHtml(args.subject_preview)}</span>
  <div class="wrap">
    <div class="card">
      ${args.body_html}
    </div>
    <div class="footer">
      Sent by ads for Good · Reply to <a href="mailto:${escapeHtml(args.reply_to)}">${escapeHtml(args.reply_to)}</a>
    </div>
  </div>
</body>
</html>`;
}

// Strip HTML to produce a plain-text fallback for the text/plain MIME part.
export function htmlToPlain(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
