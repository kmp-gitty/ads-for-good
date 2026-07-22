"use server";

// Self-serve Smart Prompts CRUD (Phase 3).
//
// SECURITY MODEL — the whole reason this is separate from the operator
// _actions.ts:
//   - Operator actions use service_role (BYPASSRLS). That's fine for staff.
//   - Self-serve tenants are untrusted, so every read/write goes through
//     `withSelfServeClient` → the shared `chapter_selfserve` NOBYPASSRLS role +
//     the `identity_prompts_client_isolation` RLS policy. Even a bug here can't
//     touch another tenant's rows; the DB enforces it.
//   - `clientKey` is ALWAYS derived from the authenticated session
//     (chapter_config.users.client_key), NEVER from form input or the ?client
//     query param.

import { revalidatePath } from "next/cache";
import {
  getCurrentChapterUser,
  getClientEntitlement,
} from "@/app/lib/auth/chapter-user";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import { withSelfServeClient } from "@/app/lib/db/per-client";
import type { SelfServePromptInput, ExistingPrompt, PromptResponse } from "./types";

type Result = { ok: true; id?: string } | { ok: false; error: string };

// Resolve + authorize the caller's tenant from the session. Enforces the
// smart_prompts entitlement so a workspace without the tool can't write prompts.
async function requireTenant(): Promise<
  { clientKey: string; email: string } | { error: string }
> {
  const user = await getCurrentChapterUser();
  if (!user || !user.client_key) return { error: "Not authorized." };
  const ent = await getClientEntitlement(user.client_key);
  if (!ent || !ent.tools_enabled.includes("smart_prompts")) {
    return { error: "Smart Prompts isn’t enabled on this workspace." };
  }
  return { clientKey: user.client_key, email: user.email };
}

type TriggerJsonb =
  | { type: "click_element"; selector: string }
  | { type: "exit_intent" }
  | { type: "time_on_page"; delay_ms: number }
  | { type: "scroll_depth"; percent: number };

function buildTriggerJsonb(input: SelfServePromptInput): TriggerJsonb {
  switch (input.trigger_type) {
    case "click_element":
      return { type: "click_element", selector: input.trigger_selector?.trim() || "" };
    case "exit_intent":
      return { type: "exit_intent" };
    case "time_on_page":
      return { type: "time_on_page", delay_ms: input.trigger_delay_ms || 15000 };
    case "scroll_depth":
      return { type: "scroll_depth", percent: input.trigger_percent || 50 };
  }
}

function validate(input: SelfServePromptInput): string | null {
  if (!/^[a-z0-9_]+$/.test(input.slug)) {
    return "Name must be lowercase letters, digits, or underscores (e.g. welcome_offer).";
  }
  // Email Exchange keeps its headline in the dedicated column; composable
  // presets carry it inside content_blocks_jsonb, so it's optional there.
  if (input.preset_type === "email_exchange" && !input.headline.trim()) {
    return "Headline is required.";
  }
  if (input.trigger_type === "click_element" && !input.trigger_selector?.trim()) {
    return "The “on click” trigger needs a CSS selector for the element to watch.";
  }
  if (input.post_submit_action === "button" || input.post_submit_action === "redirect") {
    const url = input.post_submit_url.trim();
    if (!url) return `The “${input.post_submit_action}” action needs a URL.`;
    if (!/^https?:\/\//i.test(url)) return "The URL must start with http:// or https://.";
  }
  return null;
}

export async function createPrompt(input: SelfServePromptInput): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  const err = validate(input);
  if (err) return { ok: false, error: err };

  try {
    const rows = await withSelfServeClient(t.clientKey, async (tx) => {
      const trig = tx.json(buildTriggerJsonb(input));
      const isComp = input.preset_type !== "email_exchange";
      const cb = isComp && input.content_blocks_jsonb ? tx.json(input.content_blocks_jsonb) : null;
      const ff = isComp && input.form_fields_jsonb ? tx.json(input.form_fields_jsonb) : null;
      const cont = isComp && input.container_jsonb ? tx.json(input.container_jsonb) : null;
      const sa = isComp && input.submit_actions_jsonb ? tx.json(input.submit_actions_jsonb) : null;
      return tx<{ id: string }[]>`
        INSERT INTO chapter_config.identity_prompts (
          client_key, preset_type, slug, trigger_jsonb,
          content_blocks_jsonb, form_fields_jsonb, container_jsonb, submit_actions_jsonb,
          headline, body, input_mode, email_placeholder, phone_placeholder,
          button_label, success_message, offer_code, offer_description,
          post_submit_action, post_submit_url, post_submit_button_label,
          frequency, frequency_days, enabled, created_by
        ) VALUES (
          ${t.clientKey}, ${input.preset_type}, ${input.slug}, ${trig}::jsonb,
          ${cb}::jsonb, ${ff}::jsonb, ${cont}::jsonb, ${sa}::jsonb,
          ${input.headline.trim()}, ${input.body.trim() || null}, ${input.input_mode},
          ${input.email_placeholder.trim() || "you@email.com"}, ${input.phone_placeholder.trim() || "(555) 555-5555"},
          ${input.button_label.trim() || "Submit"}, ${input.success_message.trim() || "Thanks!"},
          ${input.offer_code.trim() || null}, ${input.offer_description.trim() || null},
          ${input.post_submit_action}, ${input.post_submit_url.trim() || null}, ${input.post_submit_button_label.trim() || "Claim it"},
          ${input.frequency}, ${input.frequency === "visitor" ? input.frequency_days : null}, ${input.enabled}, ${t.email}
        )
        RETURNING id
      `;
    });
    revalidatePath("/chapter/prompts");
    return { ok: true, id: rows[0]?.id };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) };
  }
}

export async function updatePrompt(id: string, input: SelfServePromptInput): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  const err = validate(input);
  if (err) return { ok: false, error: err };

  try {
    const rows = await withSelfServeClient(t.clientKey, async (tx) => {
      const trig = tx.json(buildTriggerJsonb(input));
      const isComp = input.preset_type !== "email_exchange";
      const cb = isComp && input.content_blocks_jsonb ? tx.json(input.content_blocks_jsonb) : null;
      const ff = isComp && input.form_fields_jsonb ? tx.json(input.form_fields_jsonb) : null;
      const cont = isComp && input.container_jsonb ? tx.json(input.container_jsonb) : null;
      const sa = isComp && input.submit_actions_jsonb ? tx.json(input.submit_actions_jsonb) : null;
      // RLS already restricts to this tenant; the explicit client_key predicate
      // is belt + suspenders.
      return tx<{ id: string }[]>`
        UPDATE chapter_config.identity_prompts SET
          preset_type = ${input.preset_type},
          slug = ${input.slug},
          trigger_jsonb = ${trig}::jsonb,
          content_blocks_jsonb = ${cb}::jsonb,
          form_fields_jsonb = ${ff}::jsonb,
          container_jsonb = ${cont}::jsonb,
          submit_actions_jsonb = ${sa}::jsonb,
          headline = ${input.headline.trim()},
          body = ${input.body.trim() || null},
          input_mode = ${input.input_mode},
          email_placeholder = ${input.email_placeholder.trim() || "you@email.com"},
          phone_placeholder = ${input.phone_placeholder.trim() || "(555) 555-5555"},
          button_label = ${input.button_label.trim() || "Submit"},
          success_message = ${input.success_message.trim() || "Thanks!"},
          offer_code = ${input.offer_code.trim() || null},
          offer_description = ${input.offer_description.trim() || null},
          post_submit_action = ${input.post_submit_action},
          post_submit_url = ${input.post_submit_url.trim() || null},
          post_submit_button_label = ${input.post_submit_button_label.trim() || "Claim it"},
          frequency = ${input.frequency},
          frequency_days = ${input.frequency === "visitor" ? input.frequency_days : null},
          enabled = ${input.enabled},
          updated_at = now()
        WHERE id = ${id} AND client_key = ${t.clientKey}
        RETURNING id
      `;
    });
    if (rows.length === 0) return { ok: false, error: "Prompt not found." };
    revalidatePath("/chapter/prompts");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) };
  }
}

export async function togglePrompt(id: string, enabled: boolean): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  try {
    await withSelfServeClient(t.clientKey, (tx) =>
      tx`UPDATE chapter_config.identity_prompts SET enabled = ${enabled}, updated_at = now()
         WHERE id = ${id} AND client_key = ${t.clientKey}`,
    );
    revalidatePath("/chapter/prompts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) };
  }
}

export async function deletePrompt(id: string): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };
  try {
    await withSelfServeClient(t.clientKey, (tx) =>
      tx`DELETE FROM chapter_config.identity_prompts WHERE id = ${id} AND client_key = ${t.clientKey}`,
    );
    revalidatePath("/chapter/prompts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e) };
  }
}

// Read helpers (also RLS-scoped, so a tenant can only ever see its own rows).
export async function listPrompts(): Promise<ExistingPrompt[]> {
  const t = await requireTenant();
  if ("error" in t) return [];
  return withSelfServeClient(t.clientKey, (tx) =>
    tx<ExistingPrompt[]>`
      SELECT id, slug, preset_type, trigger_jsonb, headline, body, input_mode,
             email_placeholder, phone_placeholder, button_label, success_message,
             offer_code, offer_description, post_submit_action, post_submit_url,
             post_submit_button_label, frequency, frequency_days, enabled,
             hit_count, submit_count, last_hit_at,
             content_blocks_jsonb, form_fields_jsonb, container_jsonb, submit_actions_jsonb
      FROM chapter_config.identity_prompts
      WHERE client_key = ${t.clientKey}
      ORDER BY created_at DESC
    `,
  );
}

export async function getPrompt(id: string): Promise<ExistingPrompt | null> {
  const t = await requireTenant();
  if ("error" in t) return null;
  const rows = await withSelfServeClient(t.clientKey, (tx) =>
    tx<ExistingPrompt[]>`
      SELECT id, slug, preset_type, trigger_jsonb, headline, body, input_mode,
             email_placeholder, phone_placeholder, button_label, success_message,
             offer_code, offer_description, post_submit_action, post_submit_url,
             post_submit_button_label, frequency, frequency_days, enabled,
             hit_count, submit_count, last_hit_at,
             content_blocks_jsonb, form_fields_jsonb, container_jsonb, submit_actions_jsonb
      FROM chapter_config.identity_prompts
      WHERE id = ${id} AND client_key = ${t.clientKey}
      LIMIT 1
    `,
  );
  return rows[0] ?? null;
}

// Responses (Phase 3c). prompt_responses is RLS-covered for chapter_selfserve,
// so this read is scoped to the tenant by the same policy as everything else.
export async function listResponses(limit = 200): Promise<PromptResponse[]> {
  const t = await requireTenant();
  if ("error" in t) return [];
  const cap = Math.min(Math.max(1, limit), 500);
  return withSelfServeClient(t.clientKey, (tx) =>
    tx<PromptResponse[]>`
      SELECT id::text AS id, prompt_slug, identity_key, anonymous_id,
             responses_jsonb, submitted_at, page_url, ip_country
      FROM chapter_engagement.prompt_responses
      WHERE client_key = ${t.clientKey}
      ORDER BY submitted_at DESC
      LIMIT ${cap}
    `,
  );
}

// ---------- Install & Activate (Phase 3b) ----------

export type ActivationStatus = {
  connected: boolean;
  lastEventAt: string | null;
  recentCount: number;
  promptFired: boolean;
  storefrontDomain: string | null;
};

// Reads pixel_events for the session's tenant to answer "has the pixel fired?".
// Uses service_role with an explicit client_key filter (chapter_selfserve has no
// grant on chapter_ingest); client_key comes from the session, never input.
export async function getActivationStatus(): Promise<ActivationStatus> {
  const t = await requireTenant();
  if ("error" in t) {
    return { connected: false, lastEventAt: null, recentCount: 0, promptFired: false, storefrontDomain: null };
  }
  const supabase = createSupabaseServiceRoleClient();
  const ingest = supabase.schema("chapter_ingest");
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [last, recent, promptFired, client] = await Promise.all([
    ingest.from("pixel_events").select("ts").eq("client_key", t.clientKey).order("ts", { ascending: false }).limit(1).maybeSingle(),
    ingest.from("pixel_events").select("*", { count: "exact", head: true }).eq("client_key", t.clientKey).gte("ts", since),
    ingest.from("pixel_events").select("ts").eq("client_key", t.clientKey).eq("event_name", "identity_prompt_shown").limit(1).maybeSingle(),
    supabase.schema("chapter_config").from("clients").select("storefront_domain").eq("client_key", t.clientKey).maybeSingle(),
  ]);

  return {
    connected: !!last.data,
    lastEventAt: (last.data?.ts as string) ?? null,
    recentCount: recent.count ?? 0,
    promptFired: !!promptFired.data,
    storefrontDomain: (client.data?.storefront_domain as string) ?? null,
  };
}

// Saves the tenant's website domain so the pixel is CORS-allowed on their site.
// service_role update scoped by session client_key (chapter_selfserve can't
// write chapter_config.clients). Only affects the tenant's own row.
export async function setStorefrontDomain(domain: string): Promise<Result> {
  const t = await requireTenant();
  if ("error" in t) return { ok: false, error: t.error };

  const clean = domain.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "").replace(/^www\./i, "").toLowerCase();
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(clean)) {
    return { ok: false, error: "Enter a valid domain, e.g. yourbrand.com" };
  }
  const supabase = createSupabaseServiceRoleClient();
  const { error } = await supabase
    .schema("chapter_config")
    .from("clients")
    .update({ storefront_domain: clean, updated_at: new Date().toISOString() })
    .eq("client_key", t.clientKey);
  if (error) return { ok: false, error: "Couldn’t save your domain. Please try again." };
  revalidatePath("/chapter/prompts/install");
  return { ok: true };
}

function friendlyDbError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/duplicate key|unique/i.test(msg)) {
    return "A prompt with that name already exists. Pick a different name.";
  }
  console.warn("[self-serve prompts] db error:", msg);
  return "Something went wrong saving your prompt. Please try again.";
}
