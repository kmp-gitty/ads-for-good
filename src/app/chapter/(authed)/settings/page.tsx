// Self-serve Settings. Editable: business name, owner name, phone. Read-only:
// login email (it's the auth identity), workspace ID, tools (managed in
// Billing), plan. Rendered inside (authed) chrome.

import { getClientEntitlement, getCurrentChapterUser } from "@/app/lib/auth/chapter-user";
import { createSupabaseServiceRoleClient } from "@/app/lib/auth/supabase-server";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const clientKey = (client || "").trim();

  const [ent, user] = await Promise.all([
    clientKey ? getClientEntitlement(clientKey) : Promise.resolve(null),
    getCurrentChapterUser(),
  ]);

  // Operator-managed clients in the tools-only view (e.g. acj_today) have no
  // workspace settings to manage — the operator owns them.
  if (ent && !ent.self_serve && !ent.tools_enabled.includes("chapter")) {
    redirect(`/chapter/${clientKey}/home`);
  }

  // Owner name/phone live on chapter_config.users.
  let fullName = "";
  let phone = "";
  if (user?.id) {
    const supabase = createSupabaseServiceRoleClient();
    const { data } = await supabase
      .schema("chapter_config")
      .from("users")
      .select("full_name, phone")
      .eq("id", user.id)
      .maybeSingle();
    fullName = (data?.full_name as string) || "";
    phone = (data?.phone as string) || "";
  }

  const tools = (ent?.tools_enabled || []).filter((t) => t !== "chapter");
  const planLabel =
    ent?.billing_status === "trialing" ? "Free trial" : ent?.plan || ent?.billing_status || "—";

  return (
    <SettingsClient
      clientKey={clientKey}
      businessName={ent?.business_name || ""}
      fullName={fullName}
      phone={phone}
      email={user?.email || ""}
      tools={tools}
      planLabel={planLabel}
      canDelete={!!ent?.self_serve}
    />
  );
}
