import { apiRequest } from "@/lib/api";
import type { SessionData } from "@/types/session";
import type {
  AttendanceListResponse,
  AttendanceSummaryResponse,
  BranchRecord,
  BranchListResponse,
  BranchParentOptionsResponse,
  BranchTagsResponse,
  ChurchApiRecord,
  ChurchUnitListResponse,
  GuestResponseEntryListResponse,
  HomecellAttendanceListResponse,
  HomecellAttendanceSummaryResponse,
  HomecellListResponse,
  LgasResponse,
  StatesResponse,
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

export async function fetchBranch(branchId: number) {
  return apiRequest<{ data: BranchRecord }>(`branches/${branchId}`);
}

export async function fetchBranchTags(churchId: number) {
  return apiRequest<BranchTagsResponse>(`branch-tags?church_id=${churchId}`);
}

export async function createBranchTag(payload: {
  church_id: number;
  name: string;
}) {
  return apiRequest<{ message: string; data: unknown }>("branch-tags", {
    method: "POST",
    body: payload,
  });
}

export async function deleteBranchTag(branchTagId: number) {
  return apiRequest<{ message: string }>(`branch-tags/${branchTagId}`, {
    method: "DELETE",
  });
}

export async function fetchBranchParents(excludeBranchId?: number) {
  const params = new URLSearchParams();

  if (excludeBranchId) {
    params.set("exclude_branch_id", String(excludeBranchId));
  }

  return apiRequest<BranchParentOptionsResponse>(
    `branch-parents${params.toString() ? `?${params.toString()}` : ""}`,
  );
}

export async function createBranch(payload: Record<string, unknown>) {
  return apiRequest<{ message: string; data: unknown }>("branches", {
    method: "POST",
    body: payload,
  });
}

export async function updateBranch(branchId: number, payload: Record<string, unknown>) {
  return apiRequest<{ message: string; data: unknown }>(`branches/${branchId}`, {
    method: "PUT",
    body: payload,
  });
}

export async function reassignBranch(branchId: number, payload: Record<string, unknown>) {
  return apiRequest<{ message: string; data: unknown }>(`branches/${branchId}/reassign`, {
    method: "POST",
    body: payload,
  });
}

export async function detachBranch(branchId: number, payload: Record<string, unknown>) {
  return apiRequest<{ message: string; data: unknown }>(`branches/${branchId}/detach`, {
    method: "POST",
    body: payload,
  });
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

export async function updateChurchProfile(churchId: number, payload: Record<string, unknown>) {
  return apiRequest<{ message: string; data: unknown }>(`churches/${churchId}/profile`, {
    method: "PUT",
    body: payload,
  });
}

export async function updateServiceSchedules(churchId: number, payload: Record<string, unknown>) {
  return apiRequest<{ message: string; data: unknown }>(`churches/${churchId}/service-schedules`, {
    method: "PUT",
    body: payload,
  });
}

export async function fetchStates() {
  return apiRequest<StatesResponse>("locations/states");
}

export async function fetchLgasByStateSlug(stateSlug: string) {
  return apiRequest<LgasResponse>(`locations/lgas?state_slug=${encodeURIComponent(stateSlug)}`);
}
