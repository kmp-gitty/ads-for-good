// Builds src/app/lib/redirect/hosting-asn-ranges.data.json: the IP ranges of
// hosting / server networks, by network (ASN), for the redirect bot filter.
//
//   node scripts/build-hosting-asn-ranges.mjs
//
// Re-run every month or two, alongside build-datacenter-ranges.mjs, and commit.
//
// WHY THIS EXISTS: build-datacenter-ranges.mjs covers the five clouds that
// publish their own lists. Most crawler traffic comes from hosts that publish
// nothing (Hetzner, OVH, Linode, Vultr, Contabo, M247, ...) and from Google's
// own network, which cloud.json leaves out. Vercel does not tell a function the
// network a request came from, so we look it up ourselves from two free,
// public datasets. Only the verdict is kept; the IP never is.
//
// Sources:
//   - Which networks are hosting: X4BNet lists_vpn, input/datacenter/ASN.txt
//     (a hand-curated list of hosting / datacenter ASNs).
//   - Which IP ranges belong to each network: iptoasn.com ip2asn-v4/v6
//     (Public Domain Dedication and Licence).
//
// EXCLUDED on purpose, because real people's traffic leaves through them:
//   - Akamai, Cloudflare, Fastly, Apple: iCloud Private Relay and Cloudflare
//     WARP egress through these. (Linode is Akamai-owned but is plain server
//     hosting, so it stays in.)
//   - Residential or mobile access networks that appear in the curated list.
// Add to EXCLUDE when a real-reader network turns up flagged.

import { writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const ASN_LIST = "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/input/datacenter/ASN.txt";
const IP2ASN_V4 = "https://iptoasn.com/data/ip2asn-v4.tsv.gz";
const IP2ASN_V6 = "https://iptoasn.com/data/ip2asn-v6.tsv.gz";

const EXCLUDE = new Map([
  // Akamai (Private Relay egress). 63949 Linode deliberately NOT here.
  [12222, "akamai"], [16625, "akamai"], [16702, "akamai"], [17204, "akamai"],
  [18680, "akamai"], [18717, "akamai"], [20189, "akamai"], [20940, "akamai"],
  [21342, "akamai"], [21357, "akamai"], [21399, "akamai"], [22207, "akamai"],
  [23454, "akamai"], [23455, "akamai"], [23903, "akamai"], [24319, "akamai"],
  [26008, "akamai"], [30675, "akamai"], [31107, "akamai"], [31108, "akamai"],
  [31109, "akamai"], [31110, "akamai"], [31377, "akamai"], [33047, "akamai"],
  [33905, "akamai"], [34164, "akamai"], [34850, "akamai"], [35204, "akamai"],
  [35993, "akamai"], [35994, "akamai"], [36183, "akamai"], [39836, "akamai"],
  [43639, "akamai"], [55409, "akamai"], [55770, "akamai"],
  // Cloudflare, Fastly, Apple.
  [13335, "cloudflare"], [209242, "cloudflare"], [54113, "fastly"],
  [714, "apple"], [6185, "apple"],
  // Residential / mobile access networks found in the curated list.
  [132225, "china telecom 5g mobile"], [36290, "residential cable"],
  [394330, "rural residential broadband"], [4323, "business isp"],
  [32306, "mobile"],
]);

async function get(url, binary = false) {
  const res = await fetch(url, { headers: { "user-agent": "chapter-range-builder" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return binary ? Buffer.from(await res.arrayBuffer()) : res.text();
}

function v4ToInt(ip) {
  return ip.split(".").reduce((a, o) => a * 256 + Number(o), 0);
}

// First 64 bits of an IPv6 address, as in build-datacenter-ranges.mjs.
function v6Top64(ip) {
  const [head, tail] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const groups = tail === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  return groups.slice(0, 4).reduce((a, g) => (a << 16n) + BigInt(parseInt(g || "0", 16)), 0n);
}

// Sorted, non-overlapping, with adjacent same-ASN ranges merged. A range that
// overlaps an earlier one (only possible on IPv6 after /64 truncation) is
// clipped so the binary search stays valid.
function normalise(rows) {
  rows.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const out = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1]) {
      if (r[1] <= last[1]) continue;
      r[0] = last[1] + (typeof r[0] === "bigint" ? 1n : 1);
    }
    if (last && last[2] === r[2] && r[0] === last[1] + (typeof r[0] === "bigint" ? 1n : 1)) last[1] = r[1];
    else out.push(r);
  }
  return out;
}

const listText = await get(ASN_LIST);
const listed = new Set();
for (const line of listText.split("\n")) {
  const n = line.match(/^AS(\d+)/)?.[1];
  if (n) listed.add(Number(n));
}
for (const a of EXCLUDE.keys()) listed.delete(a);

const names = new Map();
const v4 = [], v6 = [];
for (const [url, isV6] of [[IP2ASN_V4, false], [IP2ASN_V6, true]]) {
  const tsv = gunzipSync(await get(url, true)).toString();
  for (const line of tsv.split("\n")) {
    const [s, e, a, , n] = line.split("\t");
    const asn = Number(a);
    if (!listed.has(asn)) continue;
    if (!names.has(asn)) names.set(asn, n);
    if (isV6) v6.push([v6Top64(s), v6Top64(e), asn]);
    else v4.push([v4ToInt(s), v4ToInt(e), asn]);
  }
}
const n4 = normalise(v4), n6 = normalise(v6);

// Short readable label per network, e.g. 24940 -> "hetzner-as".
const slug = (n) =>
  (n ?? "").split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "unknown";
const asnNames = {};
for (const [a, n] of names) asnNames[a] = slug(n);

const data = {
  generated: new Date().toISOString().slice(0, 10),
  sources: ["X4BNet lists_vpn datacenter ASN.txt", "iptoasn.com ip2asn-v4/v6"],
  excluded_asns: [...EXCLUDE.keys()],
  names: asnNames,
  // [start, end, asn, ...] unsigned 32-bit integers, sorted.
  v4: n4.flat(),
  // [startHex, endHex, asn, ...] over the first 64 bits, sorted.
  v6: n6.flatMap((r) => [r[0].toString(16), r[1].toString(16), r[2]]),
};
writeFileSync(
  new URL("../src/app/lib/redirect/hosting-asn-ranges.data.json", import.meta.url),
  JSON.stringify(data),
);
console.log(`wrote ${n4.length} IPv4 + ${n6.length} IPv6 ranges across ${names.size} hosting networks (${EXCLUDE.size} excluded)`);
