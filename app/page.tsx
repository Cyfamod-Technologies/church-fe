"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultRoute, getSession, hasValidSession } from "@/lib/session";
import { TemplateLoader } from "@/components/ui/template-loader";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();

    router.replace(hasValidSession(session) ? getDefaultRoute(session) : "/login");
  }, [router]);

  return <TemplateLoader />;
}
