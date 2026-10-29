// Is this IP on a hosting / server network? Returns "<asn>-<name>" or null.
//
// Second layer after datacenter-ip.ts. That one covers the five clouds that
// publish their own ranges; this one covers the hosts that publish nothing
// (Hetzner, OVH, Linode, Vultr, ...) plus Google's own network, using public
// network-ownership data built by scripts/build-hosting-asn-ranges.mjs.
// CDNs and relays that carry real readers (Akamai, Cloudflare, Fastly, Apple)
// are excluded at build time.
//
// Same rule as the rest of the redirect path: only the verdict is kept, the
// IP is never stored. Binary search, no network call.

import data from "./hosting-asn-ranges.data.json";

const V4 = data.v4 as number[];
const NAMES = data.names as Record<string, string>;
const V6: { s: bigint; e: bigint; a: number }[] = [];
for (let i = 0; i < data.v6.length; i += 3) {
  V6.push({ s: BigInt("0x" + data.v6[i]), e: BigInt("0x" + data.v6[i + 1]), a: data.v6[i + 2] as number });
}

function label(asn: number): string {
  return `${asn}-${NAMES[asn] ?? "unknown"}`;
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

/** Returns "<asn>-<name>" (e.g. "24940-hetzner-as") or null. Never throws. */
export function hostingNetwork(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const raw = ip.trim();
  const mapped = raw.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  const v4 = v4ToInt(mapped ?? raw);
  if (v4 !== null) {
    let lo = 0, hi = V4.length / 3 - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = V4[mid * 3], e = V4[mid * 3 + 1];
      if (v4 < s) hi = mid - 1;
      else if (v4 > e) lo = mid + 1;
      else return label(V4[mid * 3 + 2]);
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
    else return label(r.a);
  }
  return null;
}
