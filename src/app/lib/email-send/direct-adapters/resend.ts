// MI v2 Phase 3 — Resend direct adapter.
//
// The default direct-send mechanism. Used when client.email_mechanism = 'direct'
// (the default for new clients) OR when an explicit per-prompt override picks
// 'direct'. Resend handles delivery, bounces, complaints.
//
// Per-client `email_sender_domain` overrides the default `FROM_EMAIL` when set
// (Resend supports multiple verified domains per account; operator adds DNS
// records once per client who wants brand-controlled From: addresses).

import { Resend } from "resend";
import type { EmailAdapter, EmailSendResult, AdapterContext } from "../types";

const DEFAULT_SENDER_NAME = "ads for Good";

export const resendAdapter: EmailAdapter = {
  name: "resend",
  async send(ctx: AdapterContext): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, provider: "resend", error: "RESEND_API_KEY not configured", retryable: false };
    }

    const fromDomain = ctx.client.email_sender_domain || process.env.FROM_EMAIL;
    if (!fromDomain) {
      return { ok: false, provider: "resend", error: "no sender domain (set client.email_sender_domain or FROM_EMAIL env)", retryable: false };
    }

    const fromAddress = fromDomain.includes("@") ? fromDomain : `noreply@${fromDomain}`;
    const from = `${DEFAULT_SENDER_NAME} <${fromAddress}>`;
    const replyTo = ctx.client.email_reply_to || "katoa@ads4good.com";

    const resend = new Resend(apiKey);

    try {
      const result = await resend.emails.send({
        from,
        to: ctx.recipient.email,
        replyTo,
        subject: ctx.rendered.subject,
        html: ctx.rendered.html,
        text: ctx.rendered.text,
      });

      if (result.error) {
        // Resend returns structured error; retryable for transient (rate limit, network)
        // but not for permanent (invalid recipient, unauthorized).
        const retryable =
          result.error.name === "rate_limit_exceeded" ||
          result.error.name === "internal_server_error";
        return {
          ok: false,
          provider: "resend",
          error: `${result.error.name}: ${result.error.message}`,
          retryable,
        };
      }

      if (!result.data?.id) {
        return { ok: false, provider: "resend", error: "no message id in response", retryable: true };
      }

      return { ok: true, provider: "resend", message_id: result.data.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, provider: "resend", error: `exception: ${msg}`, retryable: true };
    }
  },
};
