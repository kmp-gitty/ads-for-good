"use server";

// Bulk link import — plan, then commit.
//
// Split in two on purpose. The registry is CONFIG, so it is the one place a
// correction can live over immutable click data — which only holds if a
// re-import cannot silently degrade it. So nothing writes until the operator
// has seen a field-level diff.
//
// The split also solves the scale problem it was not designed for: separating
// "new" (bulk-insertable) from "changed" (rare, confirmed) turns ~500
// sequential round trips for 250 rows into about two.
//
// ⚠️ .upsert({ onConflict: 'client_key,link_id' }) DOES NOT WORK HERE.
//    generated_links_active_uniq is PARTIAL (WHERE valid_to IS NULL) and
//    PostgREST cannot supply the predicate, so Postgres can't infer the index
//    — the same 42P10 class that silently dropped every crm.interactions
//    mirror for months. Hence select-then-partition rather than upsert.
//
// Gated by the /internal/* middleware (gateInternal), same as its siblings.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Mirrors generated_links_link_id_shape. Raised 64 -> 128 on 2026-10-08: the
// longest existing id was 63 of 64, and a realistic affiliate-article id is
// 107. Keep these two in lockstep or rows fail at insert instead of in the UI.
const ID_SHAPE = /^[a-z0-9][a-z0-9_-]{1,127}$/;

export type ImportRow = {
  link_id: string;
  link_host: string | null;
  slug: string;
  destination: string | null;
  dimensions: Record<string, string>;
  url: string | null;
};

export type FieldChange = {
  field: string;
  from: string | null;
  to: string | null;
  // Incoming is blank where a value exists today. Almost always an unmapped
  // column rather than intent, so it is surfaced separately and defaults to
  // KEEPING the existing value.
  clears: boolean;
};

export type ImportPlan = {
  creates: ImportRow[];
  /**
   * Creates whose id is a NEAR-VARIANT of one already registered.
   *
   * ⚠️ THE QUIETEST WAY TO LOSE A PLACEMENT'S HISTORY. If a slot is registered
   *    as ...-affiliate_partner_logo-right_rail and the pattern now derives
   *    ...-affiliate_logo-right_rail, the plan sees an id it has never met and
   *    reports "new". You register a second row, the original keeps every
   *    click, and the placement is split with nothing to indicate it.
   *
   *    Almost always a changed pattern or a renamed dimension rather than a
   *    genuinely new slot — so it is surfaced before the write, not after.
   */
  orphanRisk: { link_id: string; near: string[] }[];
  unchanged: string[];
  changes: { link_id: string; incoming: ImportRow; fields: FieldChange[] }[];
  invalid: { link_id: string; reason: string }[];
  error?: string;
};

/**
 * Registered ids close enough to `candidate` that it is probably the same slot
 * renamed rather than a new one.
 *
 * Compares the hyphen-separated segments: same count, and differing in at most
 * one position. That maps onto how these ids are built — one segment per
 * dimension — so a changed promo or loc shows up and a genuinely different
 * placement (different partner AND loc) does not.
 */
function nearestLinkIds(candidate: string, known: string[], limit = 3): string[] {
  const c = candidate.split("-");
  const out: string[] = [];
  for (const k of known) {
    if (k === candidate) continue;
    const p = k.split("-");
    if (p.length !== c.length) continue;
    let diff = 0;
    for (let i = 0; i < c.length; i++) if (c[i] !== p[i]) diff++;
    if (diff === 1) out.push(k);
    if (out.length >= limit) break;
  }
  return out;
}

type ExistingRow = {
  id: string;
  link_id: string;
  link_host: string | null;
  slug: string;
  destination: string | null;
  dimensions: Record<string, string> | null;
  url: string | null;
};

function diffRow(incoming: ImportRow, existing: ExistingRow): FieldChange[] {
  const out: FieldChange[] = [];
  const scalar: [string, string | null, string | null][] = [
    ["link_host", existing.link_host, incoming.link_host],
    ["slug", existing.slug, incoming.slug],
    ["destination", existing.destination, incoming.destination],
    ["url", existing.url, incoming.url],
  ];
  for (const [field, from, to] of scalar) {
    const a = (from ?? "").trim();
    const b = (to ?? "").trim();
    if (a === b) continue;
    out.push({ field, from: from ?? null, to: to ?? null, clears: !!a && !b });
  }

  // Dimensions diffed per key, in the union of both sides — a key present only
  // on the existing row is a CLEAR, which is the case worth seeing.
  const was = existing.dimensions ?? {};
  const now = incoming.dimensions ?? {};
  for (const key of new Set([...Object.keys(was), ...Object.keys(now)])) {
    const a = (was[key] ?? "").trim();
    const b = (now[key] ?? "").trim();
    if (a === b) continue;
    out.push({ field: `dimensions.${key}`, from: was[key] ?? null, to: now[key] ?? null, clears: !!a && !b });
  }
  return out;
}

/** Read-only. Classifies every incoming row against the live registry. */
export async function planRegistryImport(
  clientKey: string,
  rows: ImportRow[],
): Promise<ImportPlan> {
  const plan: ImportPlan = { creates: [], unchanged: [], changes: [], invalid: [], orphanRisk: [] };
  if (!clientKey || rows.length === 0) return plan;

  const valid: ImportRow[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const id = (r.link_id ?? "").trim().toLowerCase();
    if (!id) { plan.invalid.push({ link_id: "(blank)", reason: "no link id — check the pattern and its inputs" }); continue; }
    if (!ID_SHAPE.test(id)) {
      plan.invalid.push({
        link_id: id,
        reason: id.length > 128
          ? `${id.length} characters — over the 128 limit`
          : "must be lowercase a-z 0-9 _ - and start with a letter or digit",
      });
      continue;
    }
    if (seen.has(id)) { plan.invalid.push({ link_id: id, reason: "duplicate within this import" }); continue; }
    seen.add(id);
    valid.push({ ...r, link_id: id });
  }
  if (valid.length === 0) return plan;

  // ONE read for the whole batch.
  const ids = valid.map(r => r.link_id);
  const { data, error } = await supabase
    .schema("chapter_config")
    .from("generated_links")
    .select("id, link_id, link_host, slug, destination, dimensions, url")
    .eq("client_key", clientKey)
    .is("valid_to", null)
    .in("link_id", ids);

  if (error) return { ...plan, error: error.message };

  const existing = new Map<string, ExistingRow>();
  for (const row of (data ?? []) as ExistingRow[]) existing.set(row.link_id, row);

  for (const r of valid) {
    const prior = existing.get(r.link_id);
    if (!prior) { plan.creates.push(r); continue; }
    const fields = diffRow(r, prior);
    if (fields.length === 0) plan.unchanged.push(r.link_id);
    else plan.changes.push({ link_id: r.link_id, incoming: r, fields });
  }

  // Second read, over ALL of this client's ids rather than the incoming ones —
  // the point is precisely to catch ids the import does NOT contain. Bounded by
  // client and cheap (tens to low hundreds of rows).
  if (plan.creates.length > 0) {
    const { data: allRows } = await supabase
      .schema("chapter_config")
      .from("generated_links")
      .select("link_id")
      .eq("client_key", clientKey)
      .is("valid_to", null);
    const allIds = ((allRows ?? []) as { link_id: string }[]).map(r => r.link_id);
    for (const r of plan.creates) {
      const near = nearestLinkIds(r.link_id, allIds);
      if (near.length > 0) plan.orphanRisk.push({ link_id: r.link_id, near });
    }
  }
  return plan;
}

export type CommitResult = { inserted: number; updated: number; error?: string };

/**
 * Writes only what the operator confirmed.
 *
 * `updates` carries the already-merged row — the caller resolves each CLEAR to
 * keep-or-clear before getting here, so this never has to guess which blank
 * was deliberate.
 */
export async function commitRegistryImport(
  clientKey: string,
  creates: ImportRow[],
  updates: ImportRow[],
): Promise<CommitResult> {
  let inserted = 0;
  let updated = 0;

  // Chunked rather than one giant statement: a 250-row insert is fine, but the
  // bound keeps a future 2,000-row import from hitting a payload limit as a
  // mystery failure half way through.
  const CHUNK = 250;
  for (let i = 0; i < creates.length; i += CHUNK) {
    const slice = creates.slice(i, i + CHUNK).map(r => ({
      client_key: clientKey,
      link_id: r.link_id,
      link_host: r.link_host,
      slug: r.slug,
      destination: r.destination,
      dimensions: r.dimensions,
      url: r.url ?? null,
    }));
    if (slice.length === 0) continue;
    const { error } = await supabase.schema("chapter_config").from("generated_links").insert(slice);
    if (error) return { inserted, updated, error: error.message };
    inserted += slice.length;
  }

  for (const r of updates) {
    const { error } = await supabase
      .schema("chapter_config")
      .from("generated_links")
      .update({
        link_host: r.link_host,
        slug: r.slug,
        destination: r.destination,
        dimensions: r.dimensions,
        url: r.url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("client_key", clientKey)
      .eq("link_id", r.link_id)
      .is("valid_to", null);
    if (error) return { inserted, updated, error: error.message };
    updated += 1;
  }

  return { inserted, updated };
}
