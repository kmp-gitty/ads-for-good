import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function GET(req, ctx) {
    const { click_slug } = await ctx.params;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // server-side only
  );

  console.log("ATTR HIT slug:", click_slug);

  // 1) Lookup campaign by slug
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, client_id, click_slug, destination_type, destination_url, call_number, status")
    .eq("click_slug", click_slug)
    .maybeSingle();

  console.log("CAMPAIGN result:", { campaign, error });


  if (error || !campaign) return new Response("Not found", { status: 404 });
  if (campaign.status !== "active") return new Response("Inactive campaign", { status: 410 });

  // 2) Determine destination
  let redirectTo = null;
  let eventType = null;

  if (campaign.destination_type === "call") {
    if (!campaign.call_number) return new Response("No phone configured", { status: 400 });
    redirectTo = `tel:${campaign.call_number}`;
    eventType = "call_intent";
  } else {
    if (!campaign.destination_url) return new Response("No destination configured", { status: 400 });
    redirectTo = campaign.destination_url;
    eventType = "link_click";
  }

  // 3) Capture minimal request info (privacy-safe)
  const ua = req.headers.get("user-agent") || null;
  const ref = req.headers.get("referer") || null;
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  const ip_hash = ip ? sha256(ip) : null;

  // Optional: session id if you pass one later
  const { searchParams } = new URL(req.url);
  const source = searchParams.get("source") || "unknown";

  // 4) Log event
  await supabase.from("events").insert({
    ts: new Date().toISOString(),
    client_id: campaign.client_id,
    campaign_id: campaign.id,
    event_type: eventType,
    click_slug: campaign.click_slug,
    user_agent: ua,
    referrer: ref,
    ip_hash,
    metadata: {
      source,
      destination_type: campaign.destination_type,
    },
  });

  // 5) Redirect (tracking redirects should be 302)
  return Response.redirect(redirectTo, 302);
}
