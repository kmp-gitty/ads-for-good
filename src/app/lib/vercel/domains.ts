// Vercel Domains API wrapper for the branded-domain (Phase 4b) self-serve flow.
//
// A self-serve tenant connects e.g. `go.theirbrand.com`; we attach it to this
// Vercel project so Vercel routes it here + issues SSL, then show the DNS record
// they must add. Middleware (src/app/lib/redirect/branded-host.ts) rewrites
// requests on the verified host to /r/<workspace>/<slug>.
//
// Config:
//   VERCEL_API_TOKEN  (required, secret)   — team/account token
//   VERCEL_PROJECT_ID (optional)           — defaults to the project name below
//   VERCEL_TEAM_ID    (optional)           — set if the project moves to a team

const API = "https://api.vercel.com";
const DEFAULT_PROJECT = "ads-for-good";

function project(): string {
  return process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT;
}
function token(): string {
  return process.env.VERCEL_API_TOKEN || "";
}
function teamParam(sep: "?" | "&"): string {
  return process.env.VERCEL_TEAM_ID ? `${sep}teamId=${process.env.VERCEL_TEAM_ID}` : "";
}

export type DnsRecord = { type: string; name: string; value: string };

export type DomainStatus =
  | { ok: true; verified: boolean; dns: DnsRecord[] }
  | { ok: false; error: string };

// Attach the domain to the project, then read back its status + required DNS.
export async function addDomain(host: string): Promise<DomainStatus> {
  const t = token();
  if (!t) return { ok: false, error: "Domain connection isn’t configured yet." };

  const res = await fetch(`${API}/v10/projects/${project()}/domains${teamParam("?")}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: host }),
  });
  // 409 = already added to this project (idempotent re-connect) → fall through.
  if (!res.ok && res.status !== 409) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: vercelMsg(data, res.status) };
  }
  return getDomainStatus(host);
}

// Read whether the domain is verified + DNS-configured, plus the records to add.
export async function getDomainStatus(host: string): Promise<DomainStatus> {
  const t = token();
  if (!t) return { ok: false, error: "Domain connection isn’t configured yet." };

  const pdRes = await fetch(`${API}/v9/projects/${project()}/domains/${host}${teamParam("?")}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  const pd = await pdRes.json().catch(() => ({}));
  if (!pdRes.ok) return { ok: false, error: vercelMsg(pd, pdRes.status) };

  const cfgRes = await fetch(`${API}/v6/domains/${host}/config${teamParam("?")}`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  const cfg = await cfgRes.json().catch(() => ({}));

  // Ownership verified AND DNS points here (not misconfigured) → live.
  const verified = pd.verified === true && cfg.misconfigured === false;
  return { ok: true, verified, dns: buildDnsRecords(host, pd) };
}

export async function removeDomain(host: string): Promise<{ ok: boolean; error?: string }> {
  const t = token();
  if (!t) return { ok: false, error: "not configured" };
  const res = await fetch(`${API}/v9/projects/${project()}/domains/${host}${teamParam("?")}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: vercelMsg(data, res.status) };
  }
  return { ok: true };
}

// Standard records: subdomain → CNAME to cname.vercel-dns.com; apex → A record.
// Plus any TXT ownership challenges Vercel returns when the domain is in use
// elsewhere.
function buildDnsRecords(host: string, pd: Record<string, unknown>): DnsRecord[] {
  const labels = host.split(".");
  const isApex = labels.length <= 2;
  const records: DnsRecord[] = isApex
    ? [{ type: "A", name: "@", value: "76.76.21.21" }]
    : [{ type: "CNAME", name: labels.slice(0, labels.length - 2).join("."), value: "cname.vercel-dns.com" }];

  const verification = pd.verification;
  if (Array.isArray(verification)) {
    for (const v of verification as Array<Record<string, string>>) {
      if (v.type && v.domain && v.value) {
        records.push({ type: v.type.toUpperCase(), name: v.domain, value: v.value });
      }
    }
  }
  return records;
}

function vercelMsg(data: unknown, status: number): string {
  const err = (data as { error?: { message?: string } })?.error?.message;
  return err || `Vercel returned an error (${status}). Please try again.`;
}
