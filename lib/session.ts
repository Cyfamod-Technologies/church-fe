"use client";

import type { SessionData } from "@/types/session";

const SESSION_KEY = "lfc_session";
const SESSION_EVENT = "lfc-session-change";
const SESSION_DURATION_MS = 5 * 60 * 60 * 1000;
const RESTRICTED_MANAGER_DEFAULT_ROUTES: Record<string, string> = {
  homecell_manager: "/homecell-management",
  service_manager: "/services",
  member_manager: "/members",
  report_manager: "/reports",
};
const RESTRICTED_MANAGER_ALLOWED_PATHS: Record<string, string[]> = {
  homecell_manager: [
    "/homecell-management",
    "/homecells",
    "/homecell-leaders",
    "/homecell-attendance",
    "/homecell-records",
    "/homecell-reports",
    "/profile",
  ],
  service_manager: [
    "/services",
    "/attendance",
    "/service-report",
    "/profile",
  ],
  member_manager: [
    "/members",
    "/add-member",
    "/member-registry",
    "/church-units",
    "/profile",
  ],
  report_manager: [
    "/reports",
    "/branch-report",
    "/service-report-church",
    "/homecell-report",
    "/member-report",
    "/profile",
  ],
};
const HOMECELL_LEADER_ALLOWED_PATHS = [
  "/dashboard",
  "/homecell-attendance",
  "/homecell-records",
  "/profile",
];

export function getSessionRaw(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(SESSION_KEY);
}

export function parseSession(raw: string | null): SessionData | null {
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as SessionData;

    if (session && !session.session_expires_at) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_KEY);
      }

      return null;
    }

    if (session?.session_expires_at && Date.now() >= Number(session.session_expires_at)) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_KEY);
      }

      return null;
    }

    return session;
  } catch {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SESSION_KEY);
    }
    return null;
  }
}

export function getSession(): SessionData | null {
  return parseSession(getSessionRaw());
}

export function saveSession(data: SessionData): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = getSession() || {};
  const now = Date.now();
  const hasExistingExpiry = Boolean(
    existing.session_expires_at && Number(existing.session_expires_at) > now,
  );
  const nextSession: SessionData = {
    ...existing,
    ...data,
    user: Object.prototype.hasOwnProperty.call(data, "user") ? data.user : existing.user,
    church: Object.prototype.hasOwnProperty.call(data, "church") ? data.church : existing.church,
    branch: Object.prototype.hasOwnProperty.call(data, "branch") ? data.branch : existing.branch,
    homecell: Object.prototype.hasOwnProperty.call(data, "homecell")
      ? data.homecell
      : existing.homecell,
    homecell_leader: Object.prototype.hasOwnProperty.call(data, "homecell_leader")
      ? data.homecell_leader
      : existing.homecell_leader,
    session_issued_at: hasExistingExpiry
      ? Number(existing.session_issued_at || now)
      : now,
    session_expires_at: hasExistingExpiry
      ? Number(existing.session_expires_at)
      : now + SESSION_DURATION_MS,
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function subscribeToSession(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => {
    listener();
  };

  window.addEventListener("storage", handleChange);
  window.addEventListener(SESSION_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(SESSION_EVENT, handleChange);
  };
}

export function hasValidSession(session: SessionData | null): session is SessionData {
  return Boolean(
    session?.user?.id &&
    session?.church?.id &&
    (!session.session_expires_at || Date.now() < Number(session.session_expires_at)),
  );
}

export function isHomecellLeaderSession(session: SessionData | null): boolean {
  return Boolean(
    session?.user?.role === "homecell_leader" && session?.homecell?.id && session?.homecell_leader?.id,
  );
}

export function getRestrictedManagerRole(session: SessionData | null): string | null {
  const role = String(session?.user?.role || "");

  return Object.prototype.hasOwnProperty.call(RESTRICTED_MANAGER_DEFAULT_ROUTES, role)
    ? role
    : null;
}

export function getRestrictedManagerGroupId(session: SessionData | null): string | null {
  const role = getRestrictedManagerRole(session);

  if (!role) {
    return null;
  }

  return ({
    homecell_manager: "homecell-management",
    service_manager: "services",
    member_manager: "members",
    report_manager: "reports",
  } as Record<string, string>)[role] || null;
}

export function canAccessPath(session: SessionData | null, pathname: string): boolean {
  if (!hasValidSession(session)) {
    return false;
  }

  if (isHomecellLeaderSession(session)) {
    return HOMECELL_LEADER_ALLOWED_PATHS.includes(pathname);
  }

  const restrictedRole = getRestrictedManagerRole(session);

  if (!restrictedRole) {
    return true;
  }

  return (RESTRICTED_MANAGER_ALLOWED_PATHS[restrictedRole] || []).includes(pathname);
}

export function getDefaultRoute(session: SessionData | null): string {
  if (isHomecellLeaderSession(session)) {
    return "/dashboard";
  }

  const restrictedRole = getRestrictedManagerRole(session);

  if (restrictedRole) {
    return RESTRICTED_MANAGER_DEFAULT_ROUTES[restrictedRole] || "/dashboard";
  }

  return "/dashboard";
}
