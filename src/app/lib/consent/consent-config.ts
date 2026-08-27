import { createClient } from "@supabase/supabase-js";

// Per-client consent POLICY config (separate from the collection kill switch in
// collection-switch.ts). Two knobs on chapter_config.clients:
//
//   consent_mode  'us' | 'eu'   (default 'us')
//     The jurisdiction default for what to do when there is NO explicit signal
//     (no chapter_consent cookie, no GPC, no per-request consent in the pixel
//     payload). 'us' = collect-when-unknown (opt-out regime). 'eu' = strict,
//     collect ONLY on an explicit opt-in. An explicit opt_in/opt_out signal
//     ALWAYS wins over this default on both paths.
//
//   gpc_measure_consented_clicks  boolean  (default false)
//     Policy flag for the wrapped-link case: when a visitor with a GPC opt-out
//     clicks an ESP-wrapped link that carries a recipient token (?rid/?rh/?re),
//     that token is proof they subscribed to (consented to) that specific
//     channel. With this flag on, the redirect MEASURES that one consented click
//     (logs it + stitches to the known subscriber) but still STOPS at the
//     browser — no identity cookies, no ?chid handoff, no entry-relay. Default
//     false = conservative (GPC opt-out drops the click entirely).
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
  consentDefault: "us" | "eu";
  gpcMeasureConsented: boolean;
};

const cache = new Map<string, { at: number; cfg: ConsentPolicyConfig }>();
const TTL_MS = 5 * 60 * 1000;

// Fail-safe = current behavior: 'us' (collect-when-unknown) + measurement off.
const SAFE: ConsentPolicyConfig = { consentDefault: "us", gpcMeasureConsented: false };

export async function getConsentPolicyConfig(clientKey: string): Promise<ConsentPolicyConfig> {
  const hit = cache.get(clientKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.cfg;
  let cfg: ConsentPolicyConfig = { ...SAFE };
  try {
    const { data } = await supabase
      .schema("chapter_config")
      .from("clients")
      .select("consent_mode, gpc_measure_consented_clicks")
      .eq("client_key", clientKey)
      .maybeSingle();
    if (data) {
      const row = data as { consent_mode: string | null; gpc_measure_consented_clicks: boolean | null };
      cfg = {
        consentDefault: row.consent_mode === "eu" ? "eu" : "us",
        gpcMeasureConsented: row.gpc_measure_consented_clicks === true,
      };
    }
  } catch {
    cfg = { ...SAFE }; // fail-safe to current behavior
  }
  cache.set(clientKey, { at: Date.now(), cfg });
  return cfg;
}

// Maps the jurisdiction default to the pixel's `effective_mode` vocabulary,
// where 'opt_out' = collect-on-unknown (US) and 'opt_in' = strict (EU).
export function consentDefaultToMode(consentDefault: "us" | "eu"): "opt_in" | "opt_out" {
  return consentDefault === "eu" ? "opt_in" : "opt_out";
}
