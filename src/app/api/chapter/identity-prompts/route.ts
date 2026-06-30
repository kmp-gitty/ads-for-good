// GET /api/chapter/identity-prompts?client_key=X
//
// Returns the active identity prompts for a client_key. The pixel fetches
// this once per session-init and registers triggers for each prompt. The
// payload is intentionally minimal — only what the pixel needs to render
// + decide when to fire.
//
// CORS-mediated like other browser-facing Chapter routes (CHAPTER_ALLOWED_ORIGINS).
// Public read; the payload contains no secrets (operator-authored copy +
// trigger config + optional offer code that's MEANT to be shown to the visitor).
// Cached at the CDN for 5 min so dashboard edits propagate but don't hammer DB.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withCors, corsPreflightHeaders } from "@/app/lib/auth/cors";
import { signPromptSession } from "@/app/lib/auth/prompt-session";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsPreflightHeaders(req) });
}

export async function GET(req: NextRequest) {
  const clientKey = (req.nextUrl.searchParams.get("client_key") || "").trim();
  if (!clientKey) {
    return withCors(req, NextResponse.json({ error: "missing_client_key" }, { status: 400 }));
  }

  const { data, error } = await supabase
    .schema("chapter_config")
    .from("identity_prompts")
    .select("id, slug, preset_type, trigger_jsonb, headline, body, input_mode, email_placeholder, phone_placeholder, button_label, success_message, offer_code, offer_description, post_submit_action, post_submit_url, post_submit_button_label, frequency, frequency_days, container_jsonb, content_blocks_jsonb, form_fields_jsonb, pages_jsonb, recovery_jsonb, submit_actions_jsonb, targeting_jsonb, variant_jsonb, enabled_devices, email_mechanism_override")
    .eq("client_key", clientKey)
    .eq("enabled", true);

  if (error) {
    console.warn("[identity-prompts] fetch failed:", error.message);
    return withCors(req, NextResponse.json({ prompts: [] }, { status: 200 }));
  }

  // Mint an HMAC session token. The pixel includes it in subsequent
  // /api/chapter/identity-prompt-email POSTs as proof that the visitor's
  // browser actually loaded the prompt config (not a direct-POST attacker).
  // Token is null when CHAPTER_PROMPT_SECRET isn't configured; the email
  // route will then reject all sends (fail-closed).
  //
  // Cache-Control note: because each request mints a fresh token, the
  // response is no longer safely shareable across visitors. Drop CDN cache
  // and force per-request mint. (We accept the extra DB hit per session-init
  // — endpoint is hit once per visitor per ~5 min window via browser's HTTP
  // cache.)
  const session_token = signPromptSession(clientKey);
  const res = NextResponse.json({ prompts: data ?? [], session_token }, { status: 200 });
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return withCors(req, res);
}
