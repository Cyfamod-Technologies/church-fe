import type { HomecellLeaderRecord, HomecellRecord } from "@/types/api";

export interface FlattenedHomecellLeader extends HomecellLeaderRecord {
  homecell_id: number;
  homecell_name: string;
  branch_id: number | null;
  branch_name: string | null;
}

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function formatCurrency(value?: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return "--";
  }

  return numericValue.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function looksLikeRoleLabel(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  return [
    "church_admin",
    "branch_admin",
    "admin",
    "homecell_office_admin",
    "homecell leader",
    "church admin",
    "branch admin",
  ].includes(normalized);
}

export function getPrimaryLeaderName(homecell?: HomecellRecord | null) {
  const leaders = homecell?.leaders || [];
  const primaryLeader = leaders.find((leader) => Boolean(leader.is_primary));

  return primaryLeader?.name || leaders[0]?.name || "--";
}

export function flattenHomecellLeaders(sourceHomecells: HomecellRecord[]): FlattenedHomecellLeader[] {
  return sourceHomecells.flatMap((homecell) => (
    (homecell.leaders || []).map((leader) => ({
      ...leader,
      homecell_id: homecell.id,
      homecell_name: homecell.name,
      branch_id: homecell.branch?.id || null,
      branch_name: homecell.branch?.name || null,
    }))
  ));
}

export function getRangeDates(anchorDate: string, period: "weekly" | "monthly") {
  const date = new Date(`${anchorDate}T00:00:00`);

  if (period === "monthly") {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  const dayOfWeek = date.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(date);
  start.setDate(date.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function percentage(part: number, total: number) {
  if (!total) {
    return "0% of total";
  }

  return `${((part / total) * 100).toFixed(1)}% of total`;
}
