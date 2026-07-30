// Cloudflare Turnstile server-side verification.
//
// Env vars:
//   TURNSTILE_SECRET_KEY          — server secret (this file)
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY — client widget site key (signup form)
//
// Fail-open contract: when TURNSTILE_SECRET_KEY is unset, verifyTurnstile()
// returns ok+skipped so the surrounding endpoint keeps working before the keys
// are provisioned in Vercel. The honeypot + per-IP rate limit still protect the
// endpoint in that window. The moment TURNSTILE_SECRET_KEY is set, CAPTCHA
// verification is enforced (a missing/invalid token then rejects the request).
//
// Network errors talking to Cloudflare also fail open (with a warn log) rather
// than block real signups during a Cloudflare hiccup — honeypot + rate limit
// remain as the backstop.

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: string };

export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true }; // not configured yet — fail open

  if (!token || !token.trim()) return { ok: false, reason: "missing_token" };

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token.trim());
    if (remoteIp) form.set("remoteip", remoteIp);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      ["error-codes"]?: string[];
    };
    if (data.success) return { ok: true };
    return {
      ok: false,
      reason: (data["error-codes"] || ["verification_failed"]).join(",").slice(0, 100),
    };
  } catch (e) {
    console.warn("[turnstile] siteverify error:", e instanceof Error ? e.message : String(e));
    return { ok: true, skipped: true }; // network failure — fail open, backstops still apply
  }
}
