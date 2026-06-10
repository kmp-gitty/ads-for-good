// POST /api/chapter-auth/signout — clears the Supabase session.
// Also clears the legacy CHAPTER_DASH_TOKEN cookie for users who haven't
// migrated yet (no-op if they already lost it).

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/auth/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("chapter_auth");
  return res;
}
