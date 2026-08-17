// Google Ads server-side conversion capture.
//
// When a visitor clicks the client's "conversion" redirect (e.g. book-now) and
// the entry-relay cookie (set on their earlier ad entry) carries an ad click id,
// record a conversion in the ledger. A separate delivery layer (pull feed / push
// API) hands these to Google Ads. Firing from our server means it can't be lost
// to the mobile-Safari beacon race that plagued the client-side gtag tag — and
// it recovers the iOS gbraid/wbraid clicks the tag drops entirely.
//
// Config-gated per (client_key, conversion_slug); does nothing until an enabled
// chapter_config.gads_conversions row exists. All work runs post-302 (after()),
// so it never adds latency to the redirect.

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type GadsConfig = {
  conversion_action_name: string;
  platform: string;
  currency: string;
  default_value: number;
};

export type EntryClick = { clickId: string; platform: string; kind: string | null; tsSec: number | null };

// 5-min in-memory cache of enabled config per (client, slug). null = no config.
const configCache = new Map<string, { at: number; cfg: GadsConfig | null }>();
const CONFIG_TTL_MS = 5 * 60 * 1000;

// Read the ad click id from the entry-relay cookie. Cheap (no DB) — call this
// first and bail when absent, so the config lookup only runs for ad-attributed
// clicks. Returns null when the cookie is missing or carries no click id.
export function readEntryClick(req: NextRequest, clientKey: string): EntryClick | null {
  const raw = req.cookies.get(`chapter_entry_${clientKey}`)?.value;
  if (!raw) return null;
  let obj: Record<string, unknown> | null = null;
  try {
    obj = JSON.parse(raw);
  } catch {
    try {
      obj = JSON.parse(decodeURIComponent(raw));
    } catch {
      obj = null;
    }
  }
  if (!obj || typeof obj.g !== "string" || !obj.g) return null;
  return {
    clickId: obj.g,
    platform: typeof obj.gt === "string" ? obj.gt : "google",
    kind: typeof obj.gk === "string" ? obj.gk : null,
    tsSec: typeof obj.t === "number" ? obj.t : null,
  };
}

// Enabled conversion config for (client, slug), or null. Cached 5 min.
export async function fetchGadsConfig(clientKey: string, slug: string): Promise<GadsConfig | null> {
  const key = `${clientKey}:${slug}`;
  const hit = configCache.get(key);
  if (hit && Date.now() - hit.at < CONFIG_TTL_MS) return hit.cfg;
  let cfg: GadsConfig | null = null;
  try {
    const { data } = await supabase
      .schema("chapter_config")
      .from("gads_conversions")
      .select("conversion_action_name, platform, currency, default_value")
      .eq("client_key", clientKey)
      .eq("conversion_slug", slug)
      .eq("enabled", true)
      .maybeSingle();
    cfg = (data as GadsConfig | null) ?? null;
  } catch {
    cfg = null;
  }
  configCache.set(key, { at: Date.now(), cfg });
  return cfg;
}

// Record a conversion in the ledger. Idempotent per (client, click id, action)
// via the unique index — a returning visitor re-clicking the conversion redirect
// (entry cookie still present) won't double-fire the same ad click.
export async function recordGadsConversion(input: {
  clientKey: string;
  clickId: string;
  clickPlatform: string;
  clickKind: string | null;
  cfg: GadsConfig;
}): Promise<void> {
  try {
    await supabase
      .schema("chapter_engagement")
      .from("gads_click_conversions")
      .upsert(
        {
          client_key: input.clientKey,
          click_id: input.clickId,
          click_platform: input.clickPlatform,
          click_kind: input.clickKind,
          conversion_action_name: input.cfg.conversion_action_name,
          conversion_ts: new Date().toISOString(),
          value: input.cfg.default_value,
          currency: input.cfg.currency,
        },
        { onConflict: "client_key,click_id,conversion_action_name", ignoreDuplicates: true },
      );
  } catch (err) {
    console.error("[gads-conversion] record failed:", err);
  }
}
