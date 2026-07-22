"use server";

// Branded-domain connect for Smart Links (Phase 4b).
//
// Attaches a tenant's custom host (e.g. go.theirbrand.com) to this Vercel
// project, stores it in chapter_config.branded_domains, and (once DNS verifies)
// makes it route their Smart Links via the Edge middleware host rewrite.
//
// Security: chapter_selfserve has no grant on branded_domains, so reads/writes
// use service_role scoped by the SESSION client_key (never input) — same shape
// as the Smart Prompts install-domain action. The Vercel token lives only in
// process.env.VERCEL_API_TOKEN.

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { getCurrentChapterUser, getClientEntitlement } from "@/app/lib/auth/chapter-user";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { addDomain, getDomainStatus, removeDomain, type DnsRecord } from "@/app/lib/vercel/domains";

type Result = { ok: true } | { ok: false; error: string };

export type BrandedDomainInfo = {
  host: string;
  status: "pending" | "verified" | "error";
  dns: DnsRecord[];
  verifiedAt: string | null;
};

const OUR_HOSTS = new Set(["ads4good.com", "www.ads4good.com"]);

async function requireTenant(): Promise<{ clientKey: string; email: string } | { error: string }> {
  const user = await getCurrentChapterUser();
  if (!user || !user.client_key) return { error: "Not authorized." };
  const ent = await getClientEntitlement(user.client_key);
  if (!ent || !ent.tools_enabled.includes("smart_links")) {
    return { error: "Smart Links isn’t enabled on this workspace." };
  }
  return { clientKey: user.client_key, email: user.email };
}

function normalizeHost(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

function hostError(host: string): string | null {
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) {
    return "Enter a valid domain, e.g. go.yourbrand.com";
  }
  if (OUR_HOSTS.has(host) || host.endsWith(".vercel.app")) {
    return "That domain can’t be used. Use a subdomain of your own site, e.g. go.yourbrand.com";
  }
  return null;
}

// Read the tenant's current branded domain row (one per workspace).
export async function getBrandedDomain(): Promise<BrandedDomainInfo | null> {
  const t = await requireTenant();
  if ("error" in t) return null;
  const supabase = createSupabaseServiceRoleClient();
  const { data } = await supabase
    .schema("chapter_config")
    .from("branded_domains")
    .select("host, status, dns_records, verified_at")
    .eq("client_key", t.clientKey)
    .eq("kind", "links")
    .maybeSingle();
  if (!data) return null;
  return {
    host: data.host as string,
    status: (data.status as BrandedDomainInfo["status"]) ?? "pending",
    dns: (data.dns_records as DnsRecord[]) ?? [],
    verifiedAt: (data.verified_at as string) ?? null,
  };
}

export async function connectBrandedDomain(rawHost: string): Promise<{ ok: true; info: BrandedDomainInfo } | { ok: false; error: string }> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };

  const host = normalizeHost(rawHost);
  const he = hostError(host);
  if (he) return { ok: false, error: he };

  const supabase = createSupabaseServiceRoleClient();
  const cfg = supabase.schema("chapter_config");

  // Host taken by another workspace?
  const existing = await cfg.from("branded_domains").select("client_key").eq("host", host).maybeSingle();
  if (existing.data && existing.data.client_key !== t.clientKey) {
    return { ok: false, error: "That domain is already connected to another workspace." };
  }

  // One branded domain per workspace (v1) — disconnect the current one first.
  const mine = await cfg.from("branded_domains").select("host").eq("client_key", t.clientKey).eq("kind", "links").maybeSingle();
  if (mine.data && (mine.data.host as string) !== host) {
    return { ok: false, error: `You already have a connected domain (${mine.data.host}). Disconnect it first.` };
  }

  const vercel = await addDomain(host);
  if (!vercel.ok) return { ok: false, error: vercel.error };

  const status = vercel.verified ? "verified" : "pending";
  const { error } = await cfg.from("branded_domains").upsert(
    {
      host,
      client_key: t.clientKey,
      kind: "links",
      status,
      dns_records: vercel.dns,
      verified_at: vercel.verified ? new Date().toISOString() : null,
      created_by: t.email,
    },
    { onConflict: "host" },
  );
  if (error) return { ok: false, error: "Couldn’t save your domain. Please try again." };

  revalidatePath("/chapter/links/domain");
  return { ok: true, info: { host, status, dns: vercel.dns, verifiedAt: vercel.verified ? new Date().toISOString() : null } };
}

export async function refreshBrandedDomain(): Promise<{ ok: true; info: BrandedDomainInfo } | { ok: false; error: string }> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };

  const supabase = createSupabaseServiceRoleClient();
  const cfg = supabase.schema("chapter_config");
  const row = await cfg.from("branded_domains").select("host").eq("client_key", t.clientKey).eq("kind", "links").maybeSingle();
  if (!row.data) return { ok: false, error: "No domain connected yet." };
  const host = row.data.host as string;

  const vercel = await getDomainStatus(host);
  if (!vercel.ok) return { ok: false, error: vercel.error };

  const status = vercel.verified ? "verified" : "pending";
  const verifiedAt = vercel.verified ? new Date().toISOString() : null;
  await cfg.from("branded_domains").update({ status, dns_records: vercel.dns, verified_at: verifiedAt }).eq("host", host);

  revalidatePath("/chapter/links/domain");
  return { ok: true, info: { host, status, dns: vercel.dns, verifiedAt } };
}

export async function disconnectBrandedDomain(): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };

  const supabase = createSupabaseServiceRoleClient();
  const cfg = supabase.schema("chapter_config");
  const row = await cfg.from("branded_domains").select("host").eq("client_key", t.clientKey).eq("kind", "links").maybeSingle();
  if (!row.data) return { ok: true };
  const host = row.data.host as string;

  await removeDomain(host); // best-effort; ignore Vercel errors so the row can always be cleared
  const { error } = await cfg.from("branded_domains").delete().eq("host", host);
  if (error) return { ok: false, error: "Couldn’t disconnect. Please try again." };

  revalidatePath("/chapter/links/domain");
  return { ok: true };
}

// Email the DNS setup steps to the tenant's web person. Replies go to the owner.
export async function emailDomainInstructions(recipient: string, note?: string): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };

  const to = recipient.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "Enter a valid email address." };

  const info = await getBrandedDomain();
  if (!info) return { ok: false, error: "Connect a domain first, then email the steps." };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, error: "Email isn’t set up right now — please copy the record instead." };

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      to,
      from: `Chapter (via Ads for Good) <${from}>`,
      replyTo: t.email,
      subject: `DNS setup for ${info.host}`,
      html: buildDomainEmail({ host: info.host, dns: info.dns, ownerEmail: t.email, note: note?.trim() || "" }),
    });
  } catch {
    return { ok: false, error: "Couldn’t send the email. Please try again, or copy the record." };
  }
  return { ok: true };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function buildDomainEmail(a: { host: string; dns: DnsRecord[]; ownerEmail: string; note: string }): string {
  const owner = a.ownerEmail ? escapeHtml(a.ownerEmail) : "A colleague";
  const rows = a.dns
    .map(
      (r) => `<tr>
        <td style="padding:8px 12px;border:1px solid #E5E0D4;font-family:ui-monospace,monospace;font-size:13px;">${escapeHtml(r.type)}</td>
        <td style="padding:8px 12px;border:1px solid #E5E0D4;font-family:ui-monospace,monospace;font-size:13px;">${escapeHtml(r.name)}</td>
        <td style="padding:8px 12px;border:1px solid #E5E0D4;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;">${escapeHtml(r.value)}</td>
      </tr>`,
    )
    .join("");
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1F2D43;">
    <img src="https://www.ads4good.com/images/ads4Good_Logo_500x500.png" alt="Ads for Good" width="46" height="46" style="border-radius:8px;margin-bottom:16px;" />
    <h2 style="font-size:19px;margin:0 0 6px;">Point <span style="font-family:ui-monospace,monospace;">${escapeHtml(a.host)}</span> to Chapter</h2>
    <p style="font-size:14px;line-height:1.55;color:#5C6B82;margin:0 0 16px;">
      ${owner} set up branded short links with Chapter and asked you to add a DNS record for <strong>${escapeHtml(a.host)}</strong>. It takes a couple of minutes at your DNS provider (registrar).
    </p>
    ${a.note ? `<div style="background:#FFF4EC;border:1px solid #E3641044;border-radius:8px;padding:12px 14px;font-size:13.5px;line-height:1.5;margin:0 0 16px;">${escapeHtml(a.note)}</div>` : ""}
    <p style="font-size:14px;font-weight:600;margin:0 0 8px;">Add this DNS record:</p>
    <table style="border-collapse:collapse;width:100%;margin:0 0 14px;">
      <thead><tr>
        <th style="padding:8px 12px;border:1px solid #E5E0D4;background:#FBFAF6;font-size:12px;text-align:left;">Type</th>
        <th style="padding:8px 12px;border:1px solid #E5E0D4;background:#FBFAF6;font-size:12px;text-align:left;">Name / Host</th>
        <th style="padding:8px 12px;border:1px solid #E5E0D4;background:#FBFAF6;font-size:12px;text-align:left;">Value</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:13.5px;line-height:1.6;color:#5C6B82;margin:0;">
      DNS changes can take a few minutes to a few hours to take effect. Once it’s live, the certificate is issued automatically — nothing else to do. Questions? Reply to this email and it’ll reach ${owner}.
    </p>
    <p style="font-size:12px;color:#8A98AD;margin:22px 0 0;">Sent via Chapter · Ads for Good</p>
  </div>`;
}
