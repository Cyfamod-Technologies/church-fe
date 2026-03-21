import { apiRequest } from "@/lib/api";
import type { SessionData } from "@/types/session";
import type {
  AttendanceListResponse,
  AttendanceSummaryResponse,
  BranchListResponse,
  ChurchApiRecord,
  ChurchUnitListResponse,
  GuestResponseEntryListResponse,
  HomecellAttendanceListResponse,
  HomecellAttendanceSummaryResponse,
  HomecellListResponse,
  ServiceScheduleRecord,
} from "@/types/api";

export function getChurchId(session: SessionData): number {
  return Number(session.church?.id);
}

export function getBranchId(session: SessionData): number | undefined {
  return session.branch?.id ? Number(session.branch.id) : undefined;
}

export async function fetchChurch(churchId: number) {
  return apiRequest<{ data: ChurchApiRecord }>(`churches/${churchId}`);
}

export async function fetchServiceSchedules(churchId: number) {
  return apiRequest<{ data: ServiceScheduleRecord[] }>(`churches/${churchId}/service-schedules`);
}

export async function fetchBranches(churchId: number) {
  return apiRequest<BranchListResponse>(`branches?church_id=${churchId}`);
}

export async function fetchHomecells(churchId: number, branchId?: number) {
  const params = new URLSearchParams({ church_id: String(churchId) });

  if (branchId) {
    params.set("branch_id", String(branchId));
  }

  return apiRequest<HomecellListResponse>(`homecells?${params.toString()}`);
}

export async function fetchAttendanceSummary(churchId: number, branchId?: number, period = "weekly") {
  const params = new URLSearchParams({
    church_id: String(churchId),
    period,
  });

  if (branchId) {
    params.set("branch_id", String(branchId));
  }

  return apiRequest<AttendanceSummaryResponse>(`attendance/summary?${params.toString()}`);
}

export async function fetchAttendanceRecords(churchId: number, branchId?: number, perPage = 5) {
  const params = new URLSearchParams({
    church_id: String(churchId),
    per_page: String(perPage),
  });

  if (branchId) {
    params.set("branch_id", String(branchId));
  }

  return apiRequest<AttendanceListResponse>(`attendance?${params.toString()}`);
}

export async function fetchHomecellAttendanceSummary(churchId: number, branchId?: number, homecellId?: number, period = "weekly") {
  const params = new URLSearchParams({
    church_id: String(churchId),
    period,
  });

  if (branchId) {
    params.set("branch_id", String(branchId));
  }

  if (homecellId) {
    params.set("homecell_id", String(homecellId));
  }

  return apiRequest<HomecellAttendanceSummaryResponse>(`homecell-attendance/summary?${params.toString()}`);
}

export async function fetchHomecellAttendanceRecords(churchId: number, branchId?: number, homecellId?: number, limit = 5) {
  const params = new URLSearchParams({
    church_id: String(churchId),
    limit: String(limit),
  });

  if (branchId) {
    params.set("branch_id", String(branchId));
  }

  if (homecellId) {
    params.set("homecell_id", String(homecellId));
  }

  return apiRequest<HomecellAttendanceListResponse>(`homecell-attendance?${params.toString()}`);
}

export async function fetchMemberEntries(churchId: number, branchId?: number, limit = 50) {
  const params = new URLSearchParams({
    church_id: String(churchId),
    limit: String(limit),
  });

  if (branchId) {
    params.set("branch_id", String(branchId));
  }

  return apiRequest<GuestResponseEntryListResponse>(`guest-response-entries?${params.toString()}`);
}

export async function fetchChurchUnits(churchId: number) {
  return apiRequest<ChurchUnitListResponse>(`church-units?church_id=${churchId}`);
}
