"use client";

import type { SessionData } from "@/types/session";

const SESSION_KEY = "lfc_session";
const SESSION_EVENT = "lfc-session-change";

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
    return JSON.parse(raw) as SessionData;
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
  return Boolean(session?.user?.id && session?.church?.id);
}

export function isHomecellLeaderSession(session: SessionData | null): boolean {
  return Boolean(
    session?.user?.role === "homecell_leader" && session?.homecell?.id && session?.homecell_leader?.id,
  );
}

export function getDefaultRoute(session: SessionData | null): string {
  return isHomecellLeaderSession(session) ? "/dashboard" : "/dashboard";
}
