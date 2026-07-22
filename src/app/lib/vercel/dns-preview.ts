// Pure DNS-record derivation (no env, no fetch) so both the client editor and
// the pre-connect email can show a tenant exactly what to add BEFORE we call
// Vercel. Mirrors buildDnsRecords() in domains.ts for the common case:
// subdomain → CNAME to cname.vercel-dns.com; apex → A record. Vercel may add a
// TXT ownership challenge on connect (rare); that's shown post-connect.

import type { DnsRecord } from "./domains";

export function normalizeHost(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

export function isLikelyHost(host: string): boolean {
  return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host);
}

export function previewDnsRecords(host: string): DnsRecord[] {
  const labels = host.split(".");
  if (labels.length <= 2) return [{ type: "A", name: "@", value: "76.76.21.21" }];
  return [{ type: "CNAME", name: labels.slice(0, labels.length - 2).join("."), value: "cname.vercel-dns.com" }];
}
