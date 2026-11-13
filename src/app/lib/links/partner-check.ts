// Partner-key check for new Chapter Links (pure; safe for client and server).
//
// Deliberately NO "use client" / "use server" directive: a plain value exported
// from a "use client" module becomes a client-reference proxy in server code.
//
// For clients whose partner_catalog_mode is 'enforce' (today: acj_today), the
// partner key of a NEW link must be one of:
//   wp        a WordPress affiliate-partner slug, normalised (firstrust-bank -> firstrust_bank)
//   reserved  a house key such as acj_internal
//   legacy    a key existing links already use (warned, with the WordPress-based suggestion)
//   override  anything else, only with the operator's explicit "not in WordPress yet" tick
// A key that is not in normalised form is rejected outright (no override): it
// would split reporting from the same partner written correctly.
// Existing links are never re-checked or rewritten.

export type PartnerCatalogMode = "off" | "enforce";

export type PartnerOption = { key: string; name: string; slug: string; sites: string[] };

export type LegacyPartner = {
  key: string;
  // Normalised WordPress-based key to suggest instead, when one is known.
  suggested: string | null;
  status: "exact" | "matched" | "guess" | "no_wp_tag" | "not_a_partner" | "in_use";
};

export type PartnerCatalog = {
  mode: PartnerCatalogMode;
  partners: PartnerOption[];
  legacy: LegacyPartner[];
  reserved: string[];
};

export type PartnerCheck = "wp" | "legacy" | "reserved" | "override";

export type PartnerVerdict =
  | { kind: "none" }                                   // no partner set, or mode off
  | { kind: "wp"; name: string }
  | { kind: "reserved" }
  | { kind: "legacy"; suggested: string | null; suggestedName: string | null; status: LegacyPartner["status"] }
  | { kind: "malformed"; normalized: string; normalizedName: string | null }
  | { kind: "unknown"; near: PartnerOption[] };

/** lowercase, '-' -> '_', drop anything outside [a-z0-9_], collapse '_', trim '_'. */
export function normalizePartnerKey(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function emptyCatalog(mode: PartnerCatalogMode = "off"): PartnerCatalog {
  return { mode, partners: [], legacy: [], reserved: [] };
}

type Index = {
  wp: Map<string, PartnerOption>;
  legacy: Map<string, LegacyPartner>;
  reserved: Set<string>;
};

const indexCache = new WeakMap<PartnerCatalog, Index>();
function indexOf(c: PartnerCatalog): Index {
  let ix = indexCache.get(c);
  if (!ix) {
    ix = {
      wp: new Map(c.partners.map(p => [p.key, p])),
      legacy: new Map(c.legacy.map(l => [l.key, l])),
      reserved: new Set(c.reserved),
    };
    indexCache.set(c, ix);
  }
  return ix;
}

function nearWp(raw: string, c: PartnerCatalog, limit = 3): PartnerOption[] {
  const q = normalizePartnerKey(raw);
  const words = raw.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  if (!q && words.length === 0) return [];
  const scored: { p: PartnerOption; s: number }[] = [];
  for (const p of c.partners) {
    let s = 0;
    if (q && p.key.startsWith(q)) s += 3;
    else if (q && (p.key.includes(q) || q.includes(p.key))) s += 2;
    const name = p.name.toLowerCase();
    for (const w of words) if (name.includes(w) || p.key.includes(w)) s += 1;
    if (s > 0) scored.push({ p, s });
  }
  scored.sort((a, b) => b.s - a.s || a.p.key.length - b.p.key.length || a.p.key.localeCompare(b.p.key));
  return scored.slice(0, limit).map(x => x.p);
}

export function checkPartner(raw: string | null | undefined, c: PartnerCatalog): PartnerVerdict {
  const v = String(raw ?? "").trim();
  if (c.mode !== "enforce" || !v) return { kind: "none" };
  const ix = indexOf(c);
  const norm = normalizePartnerKey(v);
  if (v !== norm) {
    return { kind: "malformed", normalized: norm, normalizedName: ix.wp.get(norm)?.name ?? null };
  }
  if (ix.reserved.has(v)) return { kind: "reserved" };
  const wp = ix.wp.get(v);
  if (wp) return { kind: "wp", name: wp.name };
  const leg = ix.legacy.get(v);
  if (leg) {
    const sug = leg.suggested && leg.suggested !== v ? leg.suggested : null;
    return {
      kind: "legacy",
      suggested: sug,
      suggestedName: sug ? ix.wp.get(sug)?.name ?? null : null,
      status: leg.status,
    };
  }
  return { kind: "unknown", near: nearWp(v, c) };
}

/** True when the link may be created as typed (override only rescues "unknown"). */
export function partnerAllowed(verdict: PartnerVerdict, override: boolean): boolean {
  if (verdict.kind === "malformed") return false;
  if (verdict.kind === "unknown") return override;
  return true;
}

/** The value stored on generated_links.partner_check for a new link, or null. */
export function partnerCheckValue(verdict: PartnerVerdict, override: boolean): PartnerCheck | null {
  switch (verdict.kind) {
    case "wp": return "wp";
    case "reserved": return "reserved";
    case "legacy": return "legacy";
    case "unknown": return override ? "override" : null;
    default: return null;
  }
}

/** One line for a UI or an error message. */
export function describeVerdict(raw: string, verdict: PartnerVerdict): string {
  switch (verdict.kind) {
    case "none": return "";
    case "wp": return `WordPress partner: ${verdict.name}`;
    case "reserved": return `${raw} is the house key for ACJ's own links`;
    case "legacy":
      return verdict.suggested
        ? `Older key, used by existing links. New links should use ${verdict.suggested}` +
          (verdict.suggestedName ? ` (${verdict.suggestedName})` : "") +
          `, unless this link should match the partner's older links.`
        : `Older key, used by existing links, with no WordPress tag yet.`;
    case "malformed":
      return `Partner keys are lowercase with underscores: use ${verdict.normalized}` +
        (verdict.normalizedName ? ` (${verdict.normalizedName})` : "") + ".";
    case "unknown":
      return `${raw} is not a WordPress partner.` +
        (verdict.near.length ? ` Did you mean ${verdict.near.map(p => `${p.key} (${p.name})`).join(", ")}?` : "") +
        ` If the partner is not in WordPress yet, tick the override.`;
  }
}
