// Builds src/app/lib/redirect/datacenter-ranges.data.ts from the cloud
// providers' own published IP-range lists.
//
//   node scripts/build-datacenter-ranges.mjs
//
// Re-run every month or two and commit the result. Providers add ranges
// continuously; a stale file misses new ones but never flags a wrong address,
// because cloud providers do not hand their ranges back to residential ISPs.
//
// WHY THESE LISTS AND NOT A COMMERCIAL ASN DATABASE: Vercel does not expose
// the network (ASN) of a request to functions, only to its firewall. These
// lists are free, official, and need no account or licence key.
//
// What is in, and why only these:
//   AWS EC2 only, not the whole "AMAZON" set, which also covers Amazon's own
//     services and CloudFront edges.
//   GCP cloud.json, which is customer compute. NOT goog.json, which also covers
//     Google's consumer services, so a person could be browsing from it.
//   Azure "AzureCloud" (all public Azure), Oracle Cloud, DigitalOcean.
//
// Deliberately NOT in: Cloudflare, Akamai, Fastly. iCloud Private Relay and
// Cloudflare WARP send real people's traffic out through them, so flagging
// them would flag Safari users.
//
// Known gap: Hetzner, OVH, Linode, Vultr, Alibaba and Tencent publish no
// machine-readable list. Clicks from them still need the burst rule.

import { writeFileSync } from "node:fs";

const SOURCES = {
  aws: "https://ip-ranges.amazonaws.com/ip-ranges.json",
  gcp: "https://www.gstatic.com/ipranges/cloud.json",
  oracle: "https://docs.oracle.com/en-us/iaas/tools/public_ip_ranges.json",
  digitalocean: "https://www.digitalocean.com/geo/google.csv",
  azurePage: "https://www.microsoft.com/en-us/download/details.aspx?id=56519",
};

async function get(url, as = "json") {
  const res = await fetch(url, { headers: { "user-agent": "chapter-range-builder" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return as === "json" ? res.json() : res.text();
}

async function collect() {
  const out = []; // [provider, cidr]
  const aws = await get(SOURCES.aws);
  for (const p of aws.prefixes) if (p.service === "EC2") out.push(["aws", p.ip_prefix]);
  for (const p of aws.ipv6_prefixes) if (p.service === "EC2") out.push(["aws", p.ipv6_prefix]);

  const gcp = await get(SOURCES.gcp);
  for (const p of gcp.prefixes) out.push(["gcp", p.ipv4Prefix ?? p.ipv6Prefix]);

  const oci = await get(SOURCES.oracle);
  for (const r of oci.regions) for (const c of r.cidrs) out.push(["oracle", c.cidr]);

  const doCsv = await get(SOURCES.digitalocean, "text");
  for (const line of doCsv.split("\n")) {
    const cidr = line.split(",")[0]?.trim();
    if (cidr) out.push(["digitalocean", cidr]);
  }

  // Azure moves its file weekly; the download page names the current one.
  const page = await get(SOURCES.azurePage, "text");
  const azUrl = page.match(/https:\/\/download\.microsoft\.com\/[^"]*ServiceTags_Public[^"]*\.json/)?.[0];
  if (!azUrl) throw new Error("could not find the Azure service-tags file on the download page");
  const az = await get(azUrl);
  const cloud = az.values.find((v) => v.name === "AzureCloud");
  if (!cloud) throw new Error("AzureCloud tag missing");
  for (const c of cloud.properties.addressPrefixes) out.push(["azure", c]);

  return { rows: out.filter(([, c]) => c), azUrl };
}

function v4ToInt(ip) {
  return ip.split(".").reduce((a, o) => a * 256 + Number(o), 0);
}

// IPv6 is reduced to its first 64 bits. Cloud ranges are /64 or shorter, so
// nothing is lost; a longer one widens to its /64.
function v6Top64(ip) {
  const [head, tail] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const groups = tail === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  return groups.slice(0, 4).reduce((a, g) => (a << 16n) + BigInt(parseInt(g || "0", 16)), 0n);
}

function merge(ranges) {
  ranges.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const m = [];
  for (const r of ranges) {
    const last = m[m.length - 1];
    // Only merge within one provider, so a hit can still name its provider.
    if (last && last[2] === r[2] && r[0] <= last[1] + (typeof r[0] === "bigint" ? 1n : 1)) {
      if (r[1] > last[1]) last[1] = r[1];
    } else m.push([...r]);
  }
  return m;
}

const { rows, azUrl } = await collect();
const providers = [...new Set(rows.map(([p]) => p))];
const v4 = [], v6 = [];
for (const [p, cidr] of rows) {
  const [ip, lenStr] = cidr.split("/");
  const len = Number(lenStr);
  const pi = providers.indexOf(p);
  if (ip.includes(":")) {
    const L = BigInt(Math.min(len, 64));
    const span = 1n << (64n - L);
    const start = v6Top64(ip) & ~(span - 1n);
    v6.push([start, start + span - 1n, pi]);
  } else {
    const span = 2 ** (32 - len);
    const start = Math.floor(v4ToInt(ip) / span) * span;
    v4.push([start, start + span - 1, pi]);
  }
}
const m4 = merge(v4), m6 = merge(v6);

const file = `// GENERATED by scripts/build-datacenter-ranges.mjs on ${new Date().toISOString().slice(0, 10)}.
// Do not edit by hand. Re-run the script to refresh.
// Sources: AWS EC2, GCP cloud.json, Azure AzureCloud (${azUrl.split("/").pop()}), Oracle Cloud, DigitalOcean.
// ${rows.length} published prefixes merged to ${m4.length} IPv4 + ${m6.length} IPv6 ranges.

export const DC_PROVIDERS = ${JSON.stringify(providers)} as const;

// IPv4: flat [start, end, providerIndex, ...] as unsigned 32-bit integers, sorted.
export const DC_V4: readonly number[] = [${m4.map((r) => r.join(",")).join(",")}];

// IPv6: flat [startHex, endHex, providerIndex, ...] over the first 64 bits, sorted.
export const DC_V6: readonly (string | number)[] = [${m6
  .map((r) => `"${r[0].toString(16)}","${r[1].toString(16)}",${r[2]}`)
  .join(",")}];
`;
writeFileSync(new URL("../src/app/lib/redirect/datacenter-ranges.data.ts", import.meta.url), file);
console.log(`wrote ${m4.length} IPv4 + ${m6.length} IPv6 ranges from ${rows.length} prefixes (${providers.join(", ")})`);
