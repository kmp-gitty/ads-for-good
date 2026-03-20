"use client";

import DashboardShell from "@/components/dashboard/DashboardShell";
import { eosDashboardConfig } from "@/app/lib/dashboard/configs/eos";

export default function DemoDashboardPage() {
  return <DashboardShell config={eosDashboardConfig} defaultClientKey="eos_fabrics" />;
}