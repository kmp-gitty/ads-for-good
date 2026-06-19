// Identity-prompt session token: HMAC-signed proof that the visitor's browser
// actually loaded the prompts list before attempting to submit. The pixel
// receives a token from GET /api/chapter/identity-prompts and includes it in
// the body of POST /api/chapter/identity-prompt-email. A non-pixel attacker
// can't trivially forge one without CHAPTER_PROMPT_SECRET.
//
// Token shape: base64url(payload).base64url(hmac)
// payload: { client_key: string, exp: number (unix ms) }
//
// TTL: 30 min — long enough for the visitor to read the modal + submit,
// short enough that a stolen token has limited value.

import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 30 * 60 * 1000;

function b64urlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function getPromptSecret(): string | null {
  return process.env.CHAPTER_PROMPT_SECRET || null;
}

export function signPromptSession(client_key: string): string | null {
  const secret = getPromptSecret();
  if (!secret) return null;
  const payload = { client_key, exp: Date.now() + TTL_MS };
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(Buffer.from(payloadJson, "utf8"));
  const sig = createHmac("sha256", secret).update(payloadB64).digest();
  return `${payloadB64}.${b64urlEncode(sig)}`;
}

export type VerifyResult =
  | { ok: true; client_key: string }
  | { ok: false; reason: "missing_secret" | "malformed" | "bad_signature" | "expired" | "wrong_client_key" };

export function verifyPromptSession(token: string, expected_client_key: string): VerifyResult {
  const secret = getPromptSecret();
  if (!secret) return { ok: false, reason: "missing_secret" };
  if (!token || typeof token !== "string" || !token.includes(".")) return { ok: false, reason: "malformed" };

  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return { ok: false, reason: "malformed" };

  // Constant-time signature compare.
  const expectedSig = createHmac("sha256", secret).update(payloadB64).digest();
  let receivedSig: Buffer;
  try {
    receivedSig = b64urlDecode(sigB64);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (receivedSig.length !== expectedSig.length || !timingSafeEqual(receivedSig, expectedSig)) {
    return { ok: false, reason: "bad_signature" };
  }

  let payload: { client_key?: string; exp?: number };
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!payload.client_key || typeof payload.exp !== "number") return { ok: false, reason: "malformed" };
  if (Date.now() > payload.exp) return { ok: false, reason: "expired" };
  if (payload.client_key !== expected_client_key) return { ok: false, reason: "wrong_client_key" };

  return { ok: true, client_key: payload.client_key };
}
