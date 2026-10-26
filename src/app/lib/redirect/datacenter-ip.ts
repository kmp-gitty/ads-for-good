// Is this IP inside a cloud provider's published range?
//
// Vercel tells a function the visitor's city and country but not their network,
// so a crawler on AWS reads as "Ashburn, VA" and a click from Dublin could be a
// person or an EC2 box. The ranges come from the providers' own lists, built by
// scripts/build-datacenter-ranges.mjs. Lookup is a binary search over sorted,
// merged ranges: no network call, no added latency on the redirect.
//
// Only the verdict is ever kept (a reason string on the click). The IP itself
// is never stored, same rule as the rest of the redirect path.

import { DC_PROVIDERS, DC_V4, DC_V6 } from "./datacenter-ranges.data";

const V6: { s: bigint; e: bigint; p: number }[] = [];
for (let i = 0; i < DC_V6.length; i += 3) {
  V6.push({ s: BigInt("0x" + DC_V6[i]), e: BigInt("0x" + DC_V6[i + 1]), p: DC_V6[i + 2] as number });
}

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return null;
    n = n * 256 + o;
  }
  return n;
}

function v6Top64(ip: string): bigint | null {
  try {
    const [head, tail] = ip.split("::");
    const h = head ? head.split(":") : [];
    const t = tail !== undefined && tail !== "" ? tail.split(":") : [];
    if (tail === undefined && h.length !== 8) return null;
    const groups = tail === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
    // BigInt() calls, not 0n/16n literals: the tsconfig target predates ES2020.
    const SIXTEEN = BigInt(16);
    let n = BigInt(0);
    for (const g of groups.slice(0, 4)) {
      if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
      n = (n << SIXTEEN) + BigInt(parseInt(g, 16));
    }
    return n;
  } catch {
    return null;
  }
}

/** Returns the provider name ("aws", "gcp", ...) or null. Never throws. */
export function datacenterProvider(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const raw = ip.trim();
  // IPv4-mapped IPv6 (::ffff:1.2.3.4) is really IPv4.
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const v4 = v4ToInt(mapped ?? raw);
  if (v4 !== null) {
    let lo = 0, hi = DC_V4.length / 3 - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = DC_V4[mid * 3], e = DC_V4[mid * 3 + 1];
      if (v4 < s) hi = mid - 1;
      else if (v4 > e) lo = mid + 1;
      else return DC_PROVIDERS[DC_V4[mid * 3 + 2]];
    }
    return null;
  }
  if (!raw.includes(":")) return null;
  const v6 = v6Top64(raw);
  if (v6 === null) return null;
  let lo = 0, hi = V6.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = V6[mid];
    if (v6 < r.s) hi = mid - 1;
    else if (v6 > r.e) lo = mid + 1;
    else return DC_PROVIDERS[r.p];
  }
  return null;
}
