"use server";

// 8.2 — Identity search for Customer Journeys.
//
// Resolves an email / phone / order id / platform customer id / canonical key to
// a canonical identity, client-scoped and exact-match. The lookup hashes via the
// SHARED hash.ts (the same normalization the capture path uses — pixel + webhooks
// + uploads all go through it), so a search provably round-trips to what was
// stored. The plaintext term is never persisted or logged.

import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { hashEmail, hashPhone } from "@/app/lib/identity/hash";
import { getCurrentChapterUserOrLegacy, canAccessClient } from "@/app/lib/auth/chapter-user";
import { logPiiView, hashSecret } from "@/app/lib/audit/pii-views";
import { hashIp, getClientIp } from "@/app/lib/audit/auth";

// Reporting reads run through the service-role client (trusted operator surface);
// replica preferred, mirrors dashboard-rpc.ts.
const supabase = createClient(
  process.env.SUPABASE_REPLICA_URL ?? process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export type IdentitySearchResult =
  | {
      status: "found" | "no_journeys";
      canonical: string;
      nMergedKeys: number;
      nJourneys: number;
      nChapters: number;
      hasAnonActivity: boolean;
      kind: string;
    }
  | { status: "no_identity"; kind: string }
  | { status: "forbidden" | "rate_limited" | "invalid" };

// Per-viewer in-memory rate limit (per Vercel instance). Free-text PII lookup
// over customer data, so bounded even for a legit operator. 30 / 5 min.
const RL = new Map<string, { count: number; resetAt: number }>();
const RL_MAX = 30;
const RL_WINDOW_MS = 5 * 60 * 1000;
function rateLimited(key: string): boolean {
  const now = Date.now();
  const e = RL.get(key);
  if (!e || now > e.resetAt) {
    RL.set(key, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  e.count += 1;
  return e.count > RL_MAX;
}

const KNOWN_PREFIXES = /^(email_sha256:|phone_sha256:|shopify_customer_id:|square_customer_id:|anonymous_id:)/;

// Auto-detect the search kind and form the candidate identity_key (hashed here,
// via the shared util). Ambiguous plain tokens are tried as an order id first,
// then as a raw identity key.
function detect(term: string): { identity_key?: string; order_id?: string; kind: string } {
  const t = term.trim();
  if (t.includes("@")) return { identity_key: "email_sha256:" + hashEmail(t), kind: "email" };
  if (KNOWN_PREFIXES.test(t)) return { identity_key: t, kind: "identity_key" };
  if (/^[+\d][\d\s\-().]{6,}$/.test(t)) {
    const ph = hashPhone(t);
    if (ph) return { identity_key: "phone_sha256:" + ph, kind: "phone" };
  }
  return { order_id: t, identity_key: t, kind: "order_id_or_key" };
}

export async function resolveIdentitySearch(
  clientKey: string,
  term: string,
): Promise<IdentitySearchResult> {
  const raw = (term || "").trim();
  if (!raw || raw.length > 320) return { status: "invalid" };
  if (!clientKey || !/^[a-z0-9_]+$/i.test(clientKey)) return { status: "invalid" };

  // Client-scoping enforced server-side — never trust the client-passed key.
  // Legacy CHAPTER_DASH_TOKEN operator resolves to chapter_staff (full access).
  const user = await getCurrentChapterUserOrLegacy();
  if (user && !(await canAccessClient(user, clientKey))) return { status: "forbidden" };

  const ck = await cookies();
  const h = await headers();
  const authCookie = ck.get("chapter_auth")?.value;
  const ip = getClientIp({ headers: { get: (n: string) => h.get(n) } });
  const viewer = hashSecret(authCookie) ?? hashIp(ip) ?? "anon";
  if (rateLimited(viewer)) return { status: "rate_limited" };

  const d = detect(raw);

  async function call(args: { p_identity_key?: string | null; p_order_id?: string | null }) {
    const r = await supabase.schema("chapter_reporting").rpc("identity_search", {
      p_client_key: clientKey,
      p_identity_key: args.p_identity_key ?? null,
      p_order_id: args.p_order_id ?? null,
    });
    if (r.error) {
      console.error("[identity_search] rpc failed:", { ...r.error });
      return null;
    }
    const rows = Array.isArray(r.data) ? r.data : [];
    return (rows[0] as {
      canonical_identity_key: string;
      n_merged_keys: number;
      n_journeys: number;
      n_chapters: number;
      has_anon_activity: boolean;
    } | undefined) ?? null;
  }

  let row = d.kind === "order_id_or_key" ? await call({ p_order_id: d.order_id }) : null;
  if (!row) row = await call({ p_identity_key: d.identity_key });

  // Audit the attempt — who / which client / when, never the plaintext term.
  await logPiiView({
    page: "/chapter/journeys#search",
    client_key: clientKey,
    viewed_identity: row?.canonical_identity_key ?? "(search:no_match)",
    viewer_session: hashSecret(authCookie),
    ip_hash: hashIp(ip),
    user_agent_snippet: h.get("user-agent"),
  });

  if (!row) return { status: "no_identity", kind: d.kind };
  const nJourneys = Number(row.n_journeys ?? 0);
  return {
    status: nJourneys > 0 ? "found" : "no_journeys",
    canonical: row.canonical_identity_key,
    nMergedKeys: Number(row.n_merged_keys ?? 0),
    nJourneys,
    nChapters: Number(row.n_chapters ?? 0),
    hasAnonActivity: !!row.has_anon_activity,
    kind: d.kind,
  };
}
