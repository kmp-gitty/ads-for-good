// POST /api/internal/gdpr/delete-identity
//
// Per-identity right-to-erasure. Resolves the full identity CLUSTER for a
// person (canonical + every stitched alias: anon ids, email/phone hashes,
// platform customer ids), then removes every row keyed to that cluster across
// the ingest / identity / journey / engagement / model / attribution /
// reporting layers. Irreversible.
//
// Backed by DB function chapter_identity.delete_identity (SECURITY DEFINER),
// reached through the public.gdpr_delete_identity wrapper. Every real deletion
// is logged atomically to chapter_audit.gdpr_deletions in the same transaction.
//
// Safety model (deletion is irreversible + legally sensitive):
//   - Auth: same `chapter_auth` admin cookie as the rest of /internal/*.
//   - DRY-RUN BY DEFAULT. A plain call returns a preview of the cluster + row
//     counts and deletes NOTHING. This is what you send first to eyeball the
//     blast radius.
//   - To actually delete you must send BOTH `execute: true` AND
//     `confirm: "<exact identity_key>"` — a typed-match guard so a fat-fingered
//     or replayed request can't erase the wrong person.
//
// Body (JSON):
//   client_key    string  required
//   identity_key  string  required — any key in the person's cluster (email_sha256:… /
//                                    phone_sha256:… / anonymous_id:… / *_customer_id:… / canonical)
//   execute       boolean optional — must be true to delete (else dry-run)
//   confirm       string  optional — must equal identity_key to delete

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";

const ADMIN_COOKIE = "chapter_auth";

export async function POST(req: NextRequest) {
  const expectedToken = process.env.CHAPTER_DASH_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: "auth_not_configured" }, { status: 503 });
  }
  const cookieStore = await cookies();
  if (cookieStore.get(ADMIN_COOKIE)?.value !== expectedToken) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: {
    client_key?: unknown;
    identity_key?: unknown;
    execute?: unknown;
    confirm?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const clientKey = typeof body.client_key === "string" ? body.client_key.trim() : "";
  const identityKey = typeof body.identity_key === "string" ? body.identity_key.trim() : "";
  const execute = body.execute === true;
  const confirm = typeof body.confirm === "string" ? body.confirm.trim() : "";

  if (!clientKey) return NextResponse.json({ error: "missing_client_key" }, { status: 400 });
  if (!identityKey) return NextResponse.json({ error: "missing_identity_key" }, { status: 400 });

  // Typed-match guard: to delete for real, confirm must exactly equal identity_key.
  const dryRun = !(execute && confirm === identityKey);
  if (execute && confirm !== identityKey) {
    return NextResponse.json(
      {
        error: "confirm_mismatch",
        hint: "To execute, send execute:true AND confirm equal to the exact identity_key. Returned a dry-run instead.",
        dry_run: true,
      },
      { status: 409 },
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase.rpc("gdpr_delete_identity", {
    p_client_key: clientKey,
    p_identity_key: identityKey,
    p_dry_run: dryRun,
    p_requested_by: dryRun ? null : "internal-admin",
  });

  if (error) {
    return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dry_run: dryRun, result: data });
}
