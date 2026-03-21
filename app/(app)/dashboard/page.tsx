"use client";

import { useSessionContext } from "@/components/providers/auth-guard";
import { DashboardPage } from "@/components/dashboard/dashboard-page";

export default function DashboardRoute() {
  const session = useSessionContext();

  return <DashboardPage session={session} />;
}
