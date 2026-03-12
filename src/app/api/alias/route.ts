import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chapterSchemas } from "@/app/lib/chapter-db";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function POST(req: NextRequest) {
  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const client_key = safeString(payload?.client_key);
  const from_identity_key = safeString(payload?.from_identity_key);
  const to_identity_key = safeString(payload?.to_identity_key);
  const method = safeString(payload?.method) || "upgrade";

  if (!client_key) return NextResponse.json({ error: "Missing client_key" }, { status: 400 });
  if (!from_identity_key) return NextResponse.json({ error: "Missing from_identity_key" }, { status: 400 });
  if (!to_identity_key) return NextResponse.json({ error: "Missing to_identity_key" }, { status: 400 });

  const now = new Date().toISOString();

  const ins = await chapterSchemas
  .identity(supabase)
  .from("identity_aliases")
  .insert({
    ts: now,
    client_key,
    from_identity_key,
    to_identity_key,
    method,
    metadata: payload?.metadata ?? null,
  });

  if (ins.error) {
    // ignore dupes, log other errors
    console.error("identity_aliases insert error:", ins.error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
