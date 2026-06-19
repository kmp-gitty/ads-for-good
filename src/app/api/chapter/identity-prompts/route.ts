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
    .select("id, slug, trigger_jsonb, headline, body, input_placeholder, button_label, success_message, offer_code, offer_description, frequency, frequency_days")
    .eq("client_key", clientKey)
    .eq("enabled", true);

  if (error) {
    console.warn("[identity-prompts] fetch failed:", error.message);
    return withCors(req, NextResponse.json({ prompts: [] }, { status: 200 }));
  }

  const res = NextResponse.json({ prompts: data ?? [] }, { status: 200 });
  res.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  return withCors(req, res);
}
