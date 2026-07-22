"use server";

// Self-serve Smart Links CRUD (Phase 4a).
//
// Same security model as Smart Prompts: every read/write goes through
// withSelfServeClient (chapter_selfserve role + redirect_rules_client_isolation
// RLS), client_key from the session. A "link" (one slug) is saved by replacing
// ALL of that slug's rows in a single transaction — smart rules at ascending
// priorities, then the default as a catch-all. The public redirect route reads
// these rows via service_role, so saved links go live immediately.

import { revalidatePath } from "next/cache";
import { getCurrentChapterUser, getClientEntitlement } from "@/app/lib/auth/chapter-user";
import { withSelfServeClient } from "@/app/lib/db/per-client";
import { RESERVED_SLUGS, type LinkInput, type LinkSummary, type LinkDetail } from "./types";

type Result = { ok: true } | { ok: false; error: string };

async function requireTenant(): Promise<{ clientKey: string; email: string } | { error: string }> {
  const user = await getCurrentChapterUser();
  if (!user || !user.client_key) return { error: "Not authorized." };
  const ent = await getClientEntitlement(user.client_key);
  if (!ent || !ent.tools_enabled.includes("smart_links")) {
    return { error: "Smart Links isn’t enabled on this workspace." };
  }
  return { clientKey: user.client_key, email: user.email };
}

const SMART_BASE_PRIORITY = 10;
const SMART_STEP = 10;
const DEFAULT_PRIORITY = 100000;

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

function validate(input: LinkInput): string | null {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(slug)) {
    return "Link name must be lowercase letters, digits, hyphens or underscores (e.g. summer-sale).";
  }
  if (RESERVED_SLUGS.has(slug)) return `“${slug}” is reserved — pick another name.`;
  if (!isHttpUrl(input.default_destination)) {
    return "Default destination must be a full URL starting with http:// or https://.";
  }
  for (const r of input.smart_rules) {
    if (!isHttpUrl(r.destination)) {
      return "Every rule needs a destination URL starting with http:// or https://.";
    }
    if (!r.conditions || Object.keys(r.conditions).length === 0) {
      return "Every smart rule needs at least one condition. Use the default destination for the catch-all.";
    }
  }
  return null;
}

export async function saveLink(input: LinkInput, isNew: boolean): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  const err = validate(input);
  if (err) return { ok: false, error: err };
  const slug = input.slug.trim().toLowerCase();

  try {
    const conflict = await withSelfServeClient(t.clientKey, async (tx) => {
      if (isNew) {
        const existing = await tx<{ n: number }[]>`
          SELECT count(*)::int AS n FROM chapter_config.redirect_rules
          WHERE client_key = ${t.clientKey} AND slug = ${slug}
        `;
        if ((existing[0]?.n ?? 0) > 0) return true;
      }
      // Replace-all: drop this slug's rows, re-insert the current set.
      await tx`DELETE FROM chapter_config.redirect_rules WHERE client_key = ${t.clientKey} AND slug = ${slug}`;

      let priority = SMART_BASE_PRIORITY;
      for (const r of input.smart_rules) {
        await tx`
          INSERT INTO chapter_config.redirect_rules
            (client_key, slug, rule_priority, condition_jsonb, destination_template, description, enabled, created_by)
          VALUES (${t.clientKey}, ${slug}, ${priority}, ${tx.json(r.conditions as never)}::jsonb,
                  ${r.destination.trim()}, ${input.description.trim() || null}, ${input.enabled}, ${t.email})
        `;
        priority += SMART_STEP;
      }
      // Default catch-all (empty conditions) last.
      await tx`
        INSERT INTO chapter_config.redirect_rules
          (client_key, slug, rule_priority, condition_jsonb, destination_template, description, enabled, created_by)
        VALUES (${t.clientKey}, ${slug}, ${DEFAULT_PRIORITY}, '{}'::jsonb,
                ${input.default_destination.trim()}, ${input.description.trim() || null}, ${input.enabled}, ${t.email})
      `;
      return false;
    });

    if (conflict) return { ok: false, error: "A link with that name already exists. Pick a different name." };
    revalidatePath("/chapter/links");
    return { ok: true };
  } catch (e) {
    console.warn("[smart-links] saveLink error:", (e as Error)?.message);
    return { ok: false, error: "Something went wrong saving your link. Please try again." };
  }
}

export async function deleteLink(slug: string): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  try {
    await withSelfServeClient(t.clientKey, (tx) =>
      tx`DELETE FROM chapter_config.redirect_rules WHERE client_key = ${t.clientKey} AND slug = ${slug.toLowerCase()}`,
    );
    revalidatePath("/chapter/links");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn’t delete the link. Please try again." };
  }
}

export async function setLinkEnabled(slug: string, enabled: boolean): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  try {
    await withSelfServeClient(t.clientKey, (tx) =>
      tx`UPDATE chapter_config.redirect_rules SET enabled = ${enabled}, updated_at = now()
         WHERE client_key = ${t.clientKey} AND slug = ${slug.toLowerCase()}`,
    );
    revalidatePath("/chapter/links");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn’t update the link. Please try again." };
  }
}

type RuleRow = {
  slug: string;
  rule_priority: number;
  condition_jsonb: Record<string, unknown> | null;
  destination_template: string;
  description: string | null;
  enabled: boolean;
  hit_count: string; // bigint → string
};

export async function listLinks(): Promise<LinkSummary[]> {
  const t = await requireTenant();
  if ("error" in t) return [];
  const rows = await withSelfServeClient(t.clientKey, (tx) =>
    tx<RuleRow[]>`
      SELECT slug, rule_priority, condition_jsonb, destination_template, description, enabled,
             hit_count::text AS hit_count
      FROM chapter_config.redirect_rules
      WHERE client_key = ${t.clientKey}
      ORDER BY slug ASC, rule_priority ASC
    `,
  );
  const bySlug = new Map<string, RuleRow[]>();
  for (const r of rows) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug)!.push(r);
  }
  const out: LinkSummary[] = [];
  for (const [slug, rs] of bySlug) {
    const isDefault = (r: RuleRow) => !r.condition_jsonb || Object.keys(r.condition_jsonb).length === 0;
    const def = rs.find(isDefault) ?? rs[rs.length - 1];
    out.push({
      slug,
      description: def.description,
      default_destination: def.destination_template,
      smart_rule_count: rs.filter((r) => !isDefault(r)).length,
      enabled: rs.some((r) => r.enabled),
      total_hits: rs.reduce((a, r) => a + (parseInt(r.hit_count, 10) || 0), 0),
    });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getLink(slug: string): Promise<LinkDetail | null> {
  const t = await requireTenant();
  if ("error" in t) return null;
  const rows = await withSelfServeClient(t.clientKey, (tx) =>
    tx<RuleRow[]>`
      SELECT slug, rule_priority, condition_jsonb, destination_template, description, enabled,
             hit_count::text AS hit_count
      FROM chapter_config.redirect_rules
      WHERE client_key = ${t.clientKey} AND slug = ${slug.toLowerCase()}
      ORDER BY rule_priority ASC
    `,
  );
  if (rows.length === 0) return null;
  const isDefault = (r: RuleRow) => !r.condition_jsonb || Object.keys(r.condition_jsonb).length === 0;
  const def = rows.find(isDefault) ?? rows[rows.length - 1];
  const smart = rows.filter((r) => !isDefault(r));
  return {
    slug: rows[0].slug,
    description: rows[0].description ?? "",
    default_destination: def.destination_template,
    enabled: rows.some((r) => r.enabled),
    smart_rules: smart.map((r, i) => ({
      key: `r${i}`,
      conditions: r.condition_jsonb ?? {},
      destination: r.destination_template,
    })),
  };
}
