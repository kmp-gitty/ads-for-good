// Install & Activate (Phase 3b). Captures the tenant's website domain (for
// CORS allow-listing), shows the copy-paste pixel snippet with platform tabs,
// and a live "Connected / waiting for first event" check against pixel_events.

import { getActivationStatus } from "../_actions";
import InstallClient from "./InstallClient";

export const metadata = { title: "Install" };
export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const initial = await getActivationStatus();
  return <InstallClient clientKey={(client || "").trim()} initial={initial} />;
}
