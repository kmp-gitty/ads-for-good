"use server";

// Link registry writes from the matrix builder.
//
// The builder was deliberately a PURE GENERATOR — no DB writes — because links
// themselves were never stored, only clicks. That is also why a 240-link grid
// where 180 drew zero clicks reconstructs from click history as 60 rows: click
// data records demand and can never record supply. This is the one insert that
// closes that gap.
//
// Gated by the /internal/* middleware (gateInternal), same as the sibling rule
// actions, which likewise use the service-role client directly.

import { createClient } from "@supabase/supabase-js";
import { authorizeLinksClient } from "@/app/lib/auth/links-access";
import { loadPartnerCatalog, gateNewLinkPartner } from "@/app/lib/links/partner-catalog";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const ID_SHAPE = /^[a-z0-9][a-z0-9_-]{1,127}$/;

export type RegistryRowInput = {
  // Operator-assigned, readable, lowercase. NEVER the builder's own row id:
  // that one is derived from row CONTENT (so adding a property cannot shuffle
  // typed destinations onto the wrong rows), which means it changes whenever a
  // dimension changes — exactly the mutability an assigned id exists to avoid.
  link_id: string;
  link_host: string | null;
  slug: string;
  destination: string | null;
  // Non-identity dimensions only. `link` is excluded because link_id IS the
  // identity; the mismatch checker compares on that basis.
  dimensions: Record<string, string>;
  // The assembled URL as generated. Components could reconstruct it, but
  // reconstruction drifts if URL assembly ever changes — and it cannot be
  // backfilled, so a link registered without it loses the string permanently.
  url?: string | null;
  // Operator ticked "not in WordPress yet" for this link's partner. Only read
  // for clients whose partner_catalog_mode is 'enforce', and only on create.
  partner_override?: boolean;
};

export type RegisterResult = {
  inserted: number;
  updated: number;
  skipped: number;
  // Per-row reasons a link was not registered (bad id, blocked partner).
  problems?: string[];
  error?: string;
};

/**
 * Upsert one registry row per generated link.
 *
 * Idempotent on (client_key, link_id) for the currently-valid row — which the
 * partial unique index generated_links_active_uniq enforces. Re-exporting the
 * same grid updates attributes in place rather than duplicating, and that is
 * the point of an assigned id: correcting a creative name later must not
 * orphan historical clicks the way a dimension-set join key would.
 *
 * Rows with no `link` dimension are SKIPPED, not failed — the builder can
 * legitimately be used for one-off links that nobody wants registered.
 */
export async function registerGeneratedLinks(
  clientKey: string,
  rows: RegistryRowInput[],
): Promise<RegisterResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  // Authorized from the session — also callable from clients' dashboards.
  const auth = await authorizeLinksClient(clientKey);
  if (!auth.ok) return { inserted, updated, skipped: rows.length, error: auth.error };

  const problems: string[] = [];
  const catalog = await loadPartnerCatalog(clientKey).catch(err => {
    console.error("[link-registry] partner catalog load failed:", err);
    return null;
  });

  const seen = new Set<string>();
  for (const row of rows) {
    const linkId = (row.link_id ?? "").trim().toLowerCase();
    if (!linkId || !row.slug || seen.has(linkId)) {
      skipped++;
      continue;
    }
    if (linkId.length > 128) {
      skipped++;
      problems.push(`${linkId.slice(0, 40)}…: link id is ${linkId.length} characters, over the 128 limit — shorten a part by hand`);
      continue;
    }
    if (!ID_SHAPE.test(linkId)) {
      skipped++;
      problems.push(`${linkId}: link id may only use lowercase letters, numbers, - and _`);
      continue;
    }
    seen.add(linkId);

    try {
      const { data: existing, error: selErr } = await supabase
        .schema("chapter_config")
        .from("generated_links")
        .select("id")
        .eq("client_key", clientKey)
        .eq("link_id", linkId)
        .is("valid_to", null)
        .maybeSingle();
      if (selErr) {
        console.error("[link-registry] lookup failed:", selErr);
        return { inserted, updated, skipped, error: selErr.message };
      }

      if (existing) {
        const { error } = await supabase
          .schema("chapter_config")
          .from("generated_links")
          .update({
            link_host: row.link_host,
            slug: row.slug,
            destination: row.destination,
            dimensions: row.dimensions,
            url: row.url ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", (existing as { id: string }).id);
        if (error) {
          console.error("[link-registry] update failed:", error);
          return { inserted, updated, skipped, error: error.message };
        }
        updated++;
      } else {
        // New link: the partner must pass the client's partner rule.
        let partnerCheck: string | null = null;
        if (catalog?.mode === "enforce") {
          const gate = gateNewLinkPartner(catalog, row.dimensions?.partner, !!row.partner_override);
          if (!gate.ok) {
            skipped++;
            problems.push(`${linkId}: ${gate.error}`);
            continue;
          }
          partnerCheck = gate.partner_check;
        } else if (!catalog) {
          return { inserted, updated, skipped, problems, error: "could not load the partner list; nothing new was registered" };
        }
        const { error } = await supabase
          .schema("chapter_config")
          .from("generated_links")
          .insert({
            client_key: clientKey,
            link_id: linkId,
            link_host: row.link_host,
            slug: row.slug,
            destination: row.destination,
            dimensions: row.dimensions,
            url: row.url ?? null,
            created_by: "matrix_builder",
            ...(partnerCheck ? { partner_check: partnerCheck } : {}),
          });
        if (error) {
          console.error("[link-registry] insert failed:", error);
          return { inserted, updated, skipped, error: error.message };
        }
        inserted++;
      }
    } catch (err) {
      console.error("[link-registry] threw:", err);
      return {
        inserted,
        updated,
        skipped,
        error: err instanceof Error ? err.message : "unknown error",
      };
    }
  }

  return { inserted, updated, skipped, ...(problems.length ? { problems } : {}) };
}
