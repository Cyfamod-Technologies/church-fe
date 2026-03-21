"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  fetchAttendanceRecords,
  fetchAttendanceSummary,
  fetchBranches,
  fetchChurch,
  fetchHomecell,
  fetchHomecellAttendanceRecords,
  fetchHomecellAttendanceSummary,
  fetchHomecells,
  fetchServiceSchedules,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  AttendanceRecord,
  AttendanceSummaryResponse,
  BranchListResponse,
  BranchStats,
  ChurchApiRecord,
  HomecellRecord,
  HomecellAttendanceRecord,
  HomecellAttendanceSummaryResponse,
  HomecellListResponse,
  HomecellStats,
  ServiceScheduleRecord,
} from "@/types/api";
import type { SessionData } from "@/types/session";

interface DashboardPageProps {
  session: SessionData;
}

interface DashboardState {
  church: ChurchApiRecord | null;
  activeHomecell: HomecellRecord | null;
  serviceSchedules: ServiceScheduleRecord[];
  branches: BranchListResponse["data"];
  branchStats: BranchStats | undefined;
  homecells: HomecellListResponse["data"];
  homecellStats: HomecellStats | undefined;
  attendanceSummary: AttendanceSummaryResponse["data"] | null;
  attendanceRecords: AttendanceRecord[];
  homecellSummary: HomecellAttendanceSummaryResponse["data"] | null;
  homecellRecords: HomecellAttendanceRecord[];
}

const initialState: DashboardState = {
  church: null,
  activeHomecell: null,
  serviceSchedules: [],
  branches: [],
  branchStats: undefined,
  homecells: [],
  homecellStats: undefined,
  attendanceSummary: null,
  attendanceRecords: [],
  homecellSummary: null,
  homecellRecords: [],
};

export function DashboardPage({ session }: DashboardPageProps) {
  const [data, setData] = useState<DashboardState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const isLeader = isHomecellLeaderSession(session);
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const homecellId = session.homecell?.id ? Number(session.homecell.id) : undefined;
  const workspaceTitle = isLeader ? (session.homecell?.name || "Dashboard") : (data.church?.name || session.church?.name || "Dashboard");
  const workspaceSubtitle = isLeader
    ? "Record attendance for your homecell, review your recent submissions, and keep your profile current."
    : "Live branch, setup, attendance, and homecell visibility for the current workspace.";
  const operationalAlerts = buildOperationalAlerts(data, session);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const [
          churchResponse,
          activeHomecellResponse,
          serviceScheduleResponse,
          branchesResponse,
          homecellsResponse,
          attendanceSummaryResponse,
          attendanceRecordsResponse,
          homecellSummaryResponse,
          homecellRecordsResponse,
        ] = await Promise.all([
          fetchChurch(churchId),
          homecellId ? fetchHomecell(homecellId) : Promise.resolve({ data: null }),
          fetchServiceSchedules(churchId),
          fetchBranches(churchId),
          fetchHomecells(churchId, branchId),
          fetchAttendanceSummary(churchId, branchId),
          fetchAttendanceRecords(churchId, branchId, 5),
          fetchHomecellAttendanceSummary(churchId, branchId, homecellId),
          fetchHomecellAttendanceRecords(churchId, branchId, homecellId, 5),
        ]);

        if (!isActive) {
          return;
        }

        setData({
          church: churchResponse.data,
          activeHomecell: activeHomecellResponse.data,
          serviceSchedules: serviceScheduleResponse.data || [],
          branches: branchesResponse.data || [],
          branchStats: branchesResponse.meta?.stats,
          homecells: homecellsResponse.data || [],
          homecellStats: homecellsResponse.meta?.stats,
          attendanceSummary: attendanceSummaryResponse.data || null,
          attendanceRecords: attendanceRecordsResponse.data || [],
          homecellSummary: homecellSummaryResponse.data || null,
          homecellRecords: homecellRecordsResponse.data || [],
        });
      } catch (loadError) {
        if (!isActive) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard records.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, [branchId, churchId, homecellId]);

  return (
    isLeader ? (
      <LeaderDashboard
        data={data}
        error={error}
        isLoading={isLoading}
        workspaceSubtitle={workspaceSubtitle}
      />
    ) : (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">{workspaceTitle}</h4>
                  <p className="text-secondary mb-0">{workspaceSubtitle}</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {isLeader ? (
                    <>
                      <Link className="btn btn-primary" href="/homecell-management">
                        Record Homecell Attendance
                      </Link>
                      <Link className="btn btn-light-secondary" href="/profile">
                        My Profile
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link className="btn btn-primary" href="/services">
                        Record Attendance
                      </Link>
                      <Link className="btn btn-outline-primary" href="/homecell-management">
                        Homecell Attendance
                      </Link>
                      <Link className="btn btn-light-primary" href="/church-setup">
                        Create Branch
                      </Link>
                      <Link className="btn btn-light-secondary" href="/church-setup">
                        Church Setup
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${error ? "" : "d-none"}`} role="alert">
            {error}
          </div>
        </div>

        <div className="col-md-6 col-xxl-3">
          <div className="card overview-details-box b-s-3-primary">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Branch Network</p>
              <h3 className="text-primary mb-0">{data.branchStats?.total_branches ?? 0}</h3>
              <span className="badge text-light-primary mt-2">
                {data.branchStats?.direct_branches
                  ? `${data.branchStats.direct_branches} direct branches`
                  : "No branches yet"}
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xxl-3">
          <div className="card overview-details-box b-s-3-success">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Homecells</p>
              <h3 className="text-success mb-0">{data.homecellStats?.total_homecells ?? 0}</h3>
              <span className="badge text-light-success mt-2">
                {data.homecellStats?.leaders_assigned
                  ? `${data.homecellStats.leaders_assigned} leaders assigned`
                  : "No homecells yet"}
              </span>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xxl-3">
          <div className="card overview-details-box b-s-3-warning">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Church Attendance</p>
              <h3 className="text-warning mb-0">{data.attendanceSummary?.total_attendance ?? 0}</h3>
              <span className="badge text-light-warning mt-2">This week</span>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-xxl-3">
          <div className="card overview-details-box b-s-3-info">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Homecell Coverage</p>
              <h3 className="text-info mb-0">
                {data.homecellSummary?.homecells_covered ?? 0} / {data.homecellSummary?.active_homecells ?? 0}
              </h3>
              <span className="badge text-light-info mt-2">
                {data.homecellSummary?.pending_homecells
                  ? `${data.homecellSummary.pending_homecells} pending this week`
                  : "This week"}
              </span>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card equal-card">
            <div className="card-header">
              <h5 className="mb-0">Quick Actions</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {(isLeader
                  ? [
                      { href: "/homecell-management", label: "Record Homecell Attendance", buttonClass: "btn-light-primary" },
                      { href: "/homecell-management", label: "View Homecell Records", buttonClass: "btn-light-success" },
                      { href: "/profile", label: "Update My Profile", buttonClass: "btn-light-secondary" },
                    ]
                  : [
                      { href: "/services", label: "Record Church Attendance", buttonClass: "btn-light-primary" },
                      { href: "/homecell-management", label: "Record Homecell Attendance", buttonClass: "btn-light-success" },
                      { href: "/homecell-management", label: "Manage Homecells", buttonClass: "btn-light-warning" },
                      { href: "/church-setup", label: "Manage Branches", buttonClass: "btn-light-info" },
                      { href: "/church-setup", label: "Church Profile", buttonClass: "btn-light-secondary" },
                      { href: "/church-setup", label: "Service Schedule", buttonClass: "btn-light-danger" },
                    ]).map((action) => (
                  <div className="col-md-4" key={action.label}>
                    <Link className={`btn ${action.buttonClass} w-100`} href={action.href}>
                      {action.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Operational Alerts</h5>
            </div>
            <div className="card-body">
              {operationalAlerts.length > 0 ? (
                operationalAlerts.map((alert) => (
                  <div className="border rounded p-3 mb-3" key={alert}>
                    <div className="text-secondary">{alert}</div>
                  </div>
                ))
              ) : (
                <div className="text-secondary">{isLoading ? "Loading operational alerts..." : "No operational alerts right now."}</div>
              )}
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Church Snapshot</h5>
            </div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3">
                <span className="text-secondary small d-block mb-1">Church</span>
                <strong>{data.church?.name || "--"}</strong>
                <div className="small text-secondary mt-1">Code: {data.church?.code || "--"}</div>
              </div>
              <div className="border rounded p-3 mb-3">
                <span className="text-secondary small d-block mb-1">Location</span>
                <strong>{formatLocation(data.church)}</strong>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <span className="text-secondary small d-block mb-1">Admin Users</span>
                    <strong>{data.church?.users?.length ?? 0}</strong>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <span className="text-secondary small d-block mb-1">Configured Services</span>
                    <strong>{data.serviceSchedules.length}</strong>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <span className="text-secondary small d-block mb-1">Finance</span>
                    <strong>{data.church?.finance_enabled ? "Enabled" : "Disabled"}</strong>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <span className="text-secondary small d-block mb-1">Special Services</span>
                    <strong>{data.church?.special_services_enabled ? "Enabled" : "Disabled"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Branch Network</h5>
              <Link className="btn btn-sm btn-outline-primary" href="/church-setup">
                View All
              </Link>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Tag</th>
                      <th>Current Parent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.branches.length > 0 ? (
                      data.branches.slice(0, 5).map((branch) => (
                        <tr key={branch.id}>
                          <td>{branch.name}</td>
                          <td>{branch.tag?.name || "--"}</td>
                          <td>{branch.current_parent?.name || (data.church?.name || "--")}</td>
                          <td>{formatLabel(branch.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={4}>
                          {isLoading ? "Loading branches..." : "No branches yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-7">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Recent Church Attendance</h5>
              <Link className="btn btn-sm btn-outline-primary" href="/services">
                Record More
              </Link>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Service</th>
                      <th>Branch</th>
                      <th>Total</th>
                      <th>Recorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attendanceRecords.length > 0 ? (
                      data.attendanceRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.service_date)}</td>
                          <td>{record.service_label || "--"}</td>
                          <td>{record.branch?.name || data.church?.name || "--"}</td>
                          <td>{record.total_count ?? 0}</td>
                          <td>{record.recorded_by?.name || record.recordedBy?.name || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={5}>
                          {isLoading ? "Loading attendance records..." : "No attendance records yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-5">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Recent Homecell Attendance</h5>
              <Link className="btn btn-sm btn-outline-primary" href="/homecell-management">
                View Reports
              </Link>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Homecell</th>
                      <th>Total</th>
                      <th>Recorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.homecellRecords.length > 0 ? (
                      data.homecellRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.meeting_date)}</td>
                          <td>{record.homecell?.name || "--"}</td>
                          <td>{record.total_count ?? 0}</td>
                          <td>{record.recorded_by?.name || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={4}>
                          {isLoading ? "Loading homecell attendance..." : "No homecell attendance yet"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    )
  );
}

function LeaderDashboard({
  data,
  error,
  isLoading,
  workspaceSubtitle,
}: {
  data: DashboardState;
  error: string;
  isLoading: boolean;
  workspaceSubtitle: string;
}) {
  const activeHomecell = data.activeHomecell || null;
  const latestRecord = data.homecellRecords[0] || null;
  const branchLabel = activeHomecell?.branch?.name || "Main church";
  const meetingSchedule = [activeHomecell?.meeting_day, activeHomecell?.meeting_time ? formatTimeValue(activeHomecell.meeting_time) : null]
    .filter(Boolean)
    .join(", ") || "--";
  const hostDetails = [activeHomecell?.host_name, activeHomecell?.host_phone].filter(Boolean).join(" / ") || "--";
  const locationDetails = [activeHomecell?.city_area, activeHomecell?.address].filter(Boolean).join(" / ") || "--";

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">{activeHomecell?.name || "My Homecell Dashboard"}</h4>
                  <p className="text-secondary mb-0">
                    {activeHomecell?.name
                      ? `You are recording and reviewing attendance for ${activeHomecell.name}.`
                      : workspaceSubtitle}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-primary" href="/homecell-attendance">
                    <i className="ti ti-clipboard-plus me-1" />
                    Record Attendance
                  </Link>
                  <Link className="btn btn-outline-secondary" href="/homecell-records">
                    <i className="ti ti-table me-1" />
                    View Records
                  </Link>
                  <Link className="btn btn-outline-secondary" href="/profile">
                    <i className="ti ti-user me-1" />
                    My Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${error ? "" : "d-none"}`} role="alert">
            {error}
          </div>
        </div>

        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-primary">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">My Homecell</p>
              <h4 className="text-primary mb-0">{activeHomecell?.name || "--"}</h4>
              <span className="badge text-light-primary mt-2">{branchLabel}</span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-success">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">This Week Total</p>
              <h3 className="text-success mb-0">{data.homecellSummary?.total_attendance ?? 0}</h3>
              <span className="badge text-light-success mt-2">{data.homecellSummary?.reports_submitted ?? 0} submissions</span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-warning">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Average Attendance</p>
              <h3 className="text-warning mb-0">{data.homecellSummary?.average_attendance ?? 0}</h3>
              <span className="badge text-light-warning mt-2">Current week</span>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-info">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Latest Meeting</p>
              <h4 className="text-info mb-0">{latestRecord ? formatDate(latestRecord.meeting_date) : "--"}</h4>
              <span className="badge text-light-info mt-2">
                {latestRecord ? `Latest total: ${latestRecord.total_count ?? 0}` : "No record yet"}
              </span>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Homecell Snapshot</h5>
            </div>
            <div className="card-body d-grid gap-3">
              <SnapshotCard label="Meeting Schedule" value={meetingSchedule} />
              <SnapshotCard label="Host" value={hostDetails} />
              <SnapshotCard label="Location" value={locationDetails} />
              <SnapshotCard
                label="Coverage"
                value={`${data.homecellSummary?.homecells_covered ?? 0} / ${data.homecellSummary?.active_homecells ?? 0}`}
              />
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Recent Records</h5>
              <Link className="btn btn-sm btn-outline-primary" href="/homecell-records">
                Open Full Records
              </Link>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Guests</th>
                      <th>Offering</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.homecellRecords.length > 0 ? (
                      data.homecellRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.meeting_date)}</td>
                          <td><span className="badge text-light-primary">{record.total_count ?? 0}</span></td>
                          <td>
                            FT: {record.first_timers_count ?? 0}
                            <br />
                            NC: {record.new_converts_count ?? 0}
                          </td>
                          <td>{formatCurrencyValue(record.offering_amount)}</td>
                          <td>{record.recorded_by?.name || "System"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={5}>
                          {isLoading ? "Loading records..." : "No homecell attendance records have been added yet."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <span className="text-secondary small d-block mb-1">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatLocation(church: ChurchApiRecord | null) {
  const parts = [church?.city, church?.district_area, church?.state].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "--";
}

function formatTimeValue(value?: string | null) {
  if (!value) {
    return "--";
  }

  const [hoursRaw, minutesRaw] = value.slice(0, 5).split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 || 12;
  return `${normalizedHours}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatCurrencyValue(value?: number | null) {
  if (value === null || value === undefined) {
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

function formatDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLabel(value?: string | null) {
  if (!value) {
    return "--";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildOperationalAlerts(data: DashboardState, session: SessionData) {
  const alerts: string[] = [];

  if ((data.serviceSchedules?.length ?? 0) === 0) {
    alerts.push("Service schedule has not been configured yet.");
  }

  if ((data.homecellStats?.total_homecells ?? 0) === 0) {
    alerts.push("No homecells have been added yet.");
  }

  if ((data.branchStats?.total_branches ?? 0) === 0 && !isHomecellLeaderSession(session)) {
    alerts.push("No branches have been created yet.");
  }

  if ((data.homecellSummary?.pending_homecells ?? 0) > 0) {
    alerts.push(`${data.homecellSummary?.pending_homecells ?? 0} homecells have not submitted attendance this week.`);
  }

  if ((data.attendanceRecords?.length ?? 0) === 0) {
    alerts.push("No church attendance records have been entered yet.");
  }

  return alerts;
}
