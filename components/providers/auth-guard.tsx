"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessPath, getDefaultRoute, hasValidSession, parseSession, getSessionRaw, subscribeToSession } from "@/lib/session";
import type { SessionData } from "@/types/session";
import { TemplateLoader } from "@/components/ui/template-loader";

interface AuthGuardProps {
  children: (session: SessionData) => React.ReactNode;
}

const SessionContext = createContext<SessionData | null>(null);

export function useSessionContext(): SessionData {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("Session context is not available outside AuthGuard.");
  }

  return session;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useSyncExternalStore(subscribeToSession, () => true, () => false);
  const sessionRaw = useSyncExternalStore(subscribeToSession, getSessionRaw, () => null);
  const session = useMemo(() => parseSession(sessionRaw), [sessionRaw]);

  useEffect(() => {
    if (isClient && !hasValidSession(session)) {
      router.replace("/login");
      return;
    }

    if (isClient && session && !canAccessPath(session, pathname)) {
      router.replace(getDefaultRoute(session));
    }
  }, [isClient, pathname, router, session]);

  if (!isClient || !session || !canAccessPath(session, pathname)) {
    return <TemplateLoader />;
  }

  return <SessionContext.Provider value={session}>{children(session)}</SessionContext.Provider>;
}
