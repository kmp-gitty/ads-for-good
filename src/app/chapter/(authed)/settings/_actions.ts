"use server";

// Self-serve Settings mutations. Session-scoped: client_key + user id come from
// the authenticated session, never from input. business_name lives on
// chapter_config.clients; full_name/phone on chapter_config.users. Email is NOT
// editable here — it's the login identity (changing it needs re-verification).

import { revalidatePath } from "next/cache";
import { getCurrentChapterUser, clearClientEntitlementCache } from "@/app/lib/auth/chapter-user";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";

type Result = { ok: true } | { ok: false; error: string };

export async function updateSettings(input: {
  businessName: string;
  fullName: string;
  phone: string;
}): Promise<Result> {
  const user = await getCurrentChapterUser();
  if (!user || !user.client_key) return { ok: false, error: "Not authorized." };

  const businessName = input.businessName.trim();
  if (!businessName) return { ok: false, error: "Business name is required." };

  const supabase = createSupabaseServiceRoleClient();

  const { error: e1 } = await supabase
    .schema("chapter_config")
    .from("clients")
    .update({ business_name: businessName, updated_at: new Date().toISOString() })
    .eq("client_key", user.client_key);
  if (e1) return { ok: false, error: "Couldn’t save your business name. Please try again." };

  const { error: e2 } = await supabase
    .schema("chapter_config")
    .from("users")
    .update({ full_name: input.fullName.trim() || null, phone: input.phone.trim() || null })
    .eq("id", user.id);
  if (e2) return { ok: false, error: "Couldn’t save your details. Please try again." };

  clearClientEntitlementCache(user.client_key);
  revalidatePath("/chapter/settings");
  revalidatePath("/chapter/home");
  return { ok: true };
}
