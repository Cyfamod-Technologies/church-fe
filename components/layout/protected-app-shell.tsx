"use client";

import { AuthGuard } from "@/components/providers/auth-guard";
import { AppShell } from "@/components/layout/app-shell";

export function ProtectedAppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthGuard>{(session) => <AppShell session={session}>{children}</AppShell>}</AuthGuard>;
}
