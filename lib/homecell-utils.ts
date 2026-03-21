import type { ChurchApiRecord, HomecellLeaderRecord, HomecellRecord } from "@/types/api";

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

export function normalizeHomecellMonthlyDates(dates?: string[] | null) {
  return [...new Set((dates || []).filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
}

export function getNextHomecellMeetingDate(dates?: string[] | null, today = getTodayDate()) {
  return normalizeHomecellMonthlyDates(dates).find((date) => date >= today) || null;
}

export function formatLongDate(date?: string | null) {
  if (!date) {
    return "--";
  }

  const value = new Date(`${date}T00:00:00`);

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString("en-NG", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getHomecellScheduleGate(church?: ChurchApiRecord | null, today = getTodayDate()) {
  const locked = Boolean(church?.homecell_schedule_locked);
  const monthlyDates = normalizeHomecellMonthlyDates(church?.homecell_monthly_dates);
  const activeDate = getNextHomecellMeetingDate(monthlyDates, today);

  if (!locked) {
    return {
      locked: false,
      activeDate: null,
      message: "",
      canAdd: true,
    };
  }

  if (!monthlyDates.length || !activeDate) {
    return {
      locked: true,
      activeDate: null,
      message: "Attendance is locked right now. Wait till the next homecell date is set by admin.",
      canAdd: false,
    };
  }

  if (activeDate !== today) {
    return {
      locked: true,
      activeDate,
      message: `Attendance is locked for now. Wait till ${formatLongDate(activeDate)}.`,
      canAdd: false,
    };
  }

  return {
    locked: true,
    activeDate,
    message: `Attendance is open for ${formatLongDate(activeDate)} only.`,
    canAdd: true,
  };
}
