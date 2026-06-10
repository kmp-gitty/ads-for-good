// PII normalization + hashing helpers shared across ingest paths.
// Email + phone are both hashed via SHA-256 of a normalized form so the same
// identifier produces the same hash across the pixel, webhooks, and uploads.
//
// Convention (DO NOT change without coordinated re-hash across the data):
//   email_sha256 = sha256(lowercase(trim(email)))
//   phone_sha256 = sha256(E.164(phone))   where E.164 = +<country><digits>

import crypto from "crypto";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hashEmail(email: string): string {
  return sha256Hex(normalizeEmail(email));
}

// E.164 normalization. US default (+1) if no country code and exactly 10
// digits after stripping punctuation. Returns null if shape is ambiguous —
// caller should skip phone aliasing rather than persist a bad key.
export function normalizePhone(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
  if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
  return null;
}

export function hashPhone(phone: string): string | null {
  const normalized = normalizePhone(phone);
  return normalized ? sha256Hex(normalized) : null;
}
