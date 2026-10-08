// Pure helpers for the bulk importer.
//
// Deliberately NO "use client" / "use server" directive. A plain value exported
// from a "use client" module becomes a client-reference proxy when server code
// reads it, which threw at request time and took the whole page down once
// already. A directive-free module is safe for the client component, a server
// component and a test script alike.

export function hostLabel(h: string): string {
  return h.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export function propertyToken(h: string): string {
  return hostLabel(h).replace(/^(go|s)\./, "").split(".")[0];
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/** Split one delimited line, honouring double-quoted fields. */
export function splitLine(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === d) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/**
 * Tab or comma, whichever yields more header columns.
 *
 * Tab first on a tie because a Sheets copy/paste is TSV, and a destination
 * column full of URLs with commas in query strings would otherwise win the
 * count for the wrong delimiter.
 */
export function parseSheet(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const d = splitLine(lines[0], "\t").length >= splitLine(lines[0], ",").length ? "\t" : ",";
  return { headers: splitLine(lines[0], d), rows: lines.slice(1).map(l => splitLine(l, d)) };
}

/** "Montco" -> go.montco.today. Falls back to the literal if nothing matches. */
export function resolveHost(value: string, hosts: string[]): string {
  const v = value.trim().toLowerCase();
  if (!v) return "";
  const direct = hosts.find(h => hostLabel(h).toLowerCase() === v.replace(/^https?:\/\//, ""));
  if (direct) return direct;
  const byToken = hosts.find(h => propertyToken(h).toLowerCase() === v);
  if (byToken) return byToken;
  const loose = hosts.find(h =>
    propertyToken(h).toLowerCase().includes(v) || v.includes(propertyToken(h).toLowerCase()));
  return loose ?? value.trim();
}

/**
 * Known partner slugs closest to an unrecognised one, nearest first.
 *
 * Two kinds of near-miss, and the second is the one that matters:
 *   separator-only  first_rust  vs firstrust       — caught by normalising
 *   TRUNCATION      firstrust   vs firstrust_bank  — missed by normalising,
 *                                                    because the strings do differ
 *
 * Truncation is the realistic error — reaching for the advertiser's name rather
 * than the slug the client already uses. Bounded to an 8-character gap so a
 * short slug does not match every longer one that happens to start the same way.
 *
 * ⚠️ RETURNS ALL MATCHES, NOT THE FIRST. Once a client has both `firstrust`
 *    and `firstrust_bank` in its vocabulary, a typo like `firstrus` is near
 *    BOTH — and naming only one of them hides the actual decision. Which one
 *    .find() would have returned depended on array order, which the operator
 *    has no way to reason about.
 */
export function nearestPartners(candidate: string, known: string[], limit = 3): string[] {
  const norm = (s: string) => s.toLowerCase().replace(/[_-]/g, "");
  const c = norm(candidate);
  if (!c) return [];
  const scored: { slug: string; gap: number }[] = [];
  for (const k of known) {
    const n = norm(k);
    if (n === c) { scored.push({ slug: k, gap: 0 }); continue; }
    if ((n.startsWith(c) || c.startsWith(n)) && Math.abs(n.length - c.length) <= 8) {
      scored.push({ slug: k, gap: Math.abs(n.length - c.length) });
    }
  }
  // Closest first; name ties broken alphabetically so the order is stable
  // between renders rather than depending on how the vocabulary was assembled.
  return scored
    .sort((a, b) => a.gap - b.gap || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map(x => x.slug);
}
