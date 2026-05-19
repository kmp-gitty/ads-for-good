import { notFound } from "next/navigation";
import ClientPortalDashboard from "../_components/ClientPortalDashboard";
import { getPortalData } from "../_lib/portal-data";

export default async function NotSoCavalierPortalPage() {
  const data = await getPortalData("not_so_cavalier");
  if (!data) notFound();
  return <ClientPortalDashboard data={data} />;
}
