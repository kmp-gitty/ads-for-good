import { createClient } from "@supabase/supabase-js";

// Per-client consent POLICY config (separate from the collection kill switch in
// collection-switch.ts). Two knobs on chapter_config.clients:
//
//   consent_mode  'permissive' | 'strict'   (default 'permissive')
//     The DEFAULT applied when there is NO explicit per-visitor signal (no
//     chapter_consent cookie, no GPC, no per-request consent in the pixel
//     payload). 'permissive' = collect-when-unknown (opt-out regime).
//     'strict' = collect ONLY on an explicit opt-in. An explicit opt_in/opt_out
//     signal ALWAYS wins over this default on both paths.
//
//     NOTE ON NAMING: this is a REGIME default, not geography. Jurisdiction is a
//     property of the visitor, not the client — a 'permissive' client with EU
//     traffic still treats those EU visitors permissively. Do not read
//     'permissive'/'strict' as "handles GDPR by region"; it does not. Choosing
//     the regime per client (and, later, per-visitor via a CMP) is the operator's
//     responsibility.
//
//   esp_link_click_attribution  boolean   (default false)
//     Policy flag for the ESP-wrapped-link case. When a visitor with a GPC
//     opt-out clicks a link wrapped by the client's own email/SMS platform that
//     carries a recipient token (?rid/?rh/?re), that token identifies a known
//     subscriber of that channel. With this on, the redirect ATTRIBUTES that one
//     click (logs it + stitches to the known subscriber) but STOPS at the
//     browser — no identity cookies, no ?chid handoff, no entry-relay. Default
//     false. Enabling it is a legal judgment the CLIENT makes about their own
//     risk and SHOULD be a documented contractual acknowledgment, not a casual
//     toggle. The defensibility rests on: the sender already knows who the
//     recipient is, the token only proves a known subscriber clicked their own
//     link, Chapter learns nothing NEW about "who," and collection stops at the
//     browser — so this is first-party measurement of a consented channel, not
//     the sale/sharing GPC governs. The counterargument (subscribing to email is
//     not by itself consent to identity-graph linkage) is not frivolous; the
//     linkage already exists on the ESP side, which is why Chapter learns nothing
//     new — but that reasoning must live in the DPA, not be improvised later.
//
// --- CMP (Consent Management Platform) integration hook -----------------------
// Chapter does not ship its own banner. A CMP (OneTrust / Cookiebot / a custom
// banner) integrates by writing the `chapter_consent` cookie on the property:
//   opt_in  → collect;  opt_out → do not collect.
// Both the pixel (/api/pixel) and the redirect (/r/...) read that cookie as the
// authoritative per-visitor signal, above everything here. The pixel ALSO
// accepts `consent_status` / `consent_mode` in its send payload, so a CMP-aware
// pixel wrapper can pass the CMP's decision per event. This `consent_mode`
// column only decides the DEFAULT when the CMP has expressed nothing yet.

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type ConsentPolicyConfig = {
  consentDefault: "permissive" | "strict";
  espLinkClickAttribution: boolean;
};

const cache = new Map<string, { at: number; cfg: ConsentPolicyConfig }>();
const TTL_MS = 5 * 60 * 1000;

// Fail-safe = current behavior: 'permissive' (collect-when-unknown) + flag off.
const SAFE: ConsentPolicyConfig = { consentDefault: "permissive", espLinkClickAttribution: false };

export async function getConsentPolicyConfig(clientKey: string): Promise<ConsentPolicyConfig> {
  const hit = cache.get(clientKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.cfg;
  let cfg: ConsentPolicyConfig = { ...SAFE };
  try {
    const { data } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("consent_mode, esp_link_click_attribution")
      .eq("client_key", clientKey)
      .maybeSingle();
    if (data) {
      const row = data as { consent_mode: string | null; esp_link_click_attribution: boolean | null };
      cfg = {
        consentDefault: row.consent_mode === "strict" ? "strict" : "permissive",
        espLinkClickAttribution: row.esp_link_click_attribution === true,
      };
    }
  } catch {
    cfg = { ...SAFE }; // fail-safe to current behavior
  }
  cache.set(clientKey, { at: Date.now(), cfg });
  return cfg;
}

// Maps the regime default to the pixel's `effective_mode` vocabulary, where
// 'opt_out' = collect-on-unknown (permissive) and 'opt_in' = strict.
export function consentDefaultToMode(consentDefault: "permissive" | "strict"): "opt_in" | "opt_out" {
  return consentDefault === "strict" ? "opt_in" : "opt_out";
}
