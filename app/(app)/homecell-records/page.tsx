"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { formatCurrency, getRangeDates, getTodayDate, looksLikeRoleLabel } from "@/lib/homecell-utils";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  fetchBranches,
  fetchChurch,
  fetchHomecellAttendanceRecordsWithFilters,
  fetchHomecellAttendanceSummary,
  fetchHomecells,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  BranchRecord,
  HomecellAttendanceRecord,
  HomecellAttendanceSummaryResponse,
  HomecellRecord,
} from "@/types/api";

export default function HomecellRecordsRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const isHomecellLeader = isHomecellLeaderSession(session);
  const activeHomecellId = session.homecell?.id ? Number(session.homecell.id) : null;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [churchUsers, setChurchUsers] = useState<Array<{ id: number; name?: string | null }>>([]);
  const [records, setRecords] = useState<HomecellAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<HomecellAttendanceSummaryResponse["data"] | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [date, setDate] = useState(getTodayDate());
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : "");
  const [homecellFilter, setHomecellFilter] = useState(activeHomecellId ? String(activeHomecellId) : "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const successMessage = searchParams.get("updated") === "1" ? "Attendance record updated successfully." : "";

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [churchResponse, branchesResponse, homecellsResponse] = await Promise.all([
          fetchChurch(churchId),
          branchId ? Promise.resolve({ data: session.branch ? [session.branch as BranchRecord] : [] }) : fetchBranches(churchId),
          fetchHomecells(churchId, branchId),
        ]);

        if (!active) {
          return;
        }

        setChurchUsers(churchResponse.data?.users || []);
        setBranches(branchesResponse.data || []);
        setHomecells(homecellsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell records.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [branchId, churchId, session.branch]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const range = getRangeDates(date, period);
        const effectiveBranchId = isHomecellLeader ? (session.homecell?.branch?.id || branchId) : (Number(branchFilter || 0) || undefined);
        const effectiveHomecellId = isHomecellLeader ? (activeHomecellId || undefined) : (Number(homecellFilter || 0) || undefined);

        const [summaryResponse, recordsResponse] = await Promise.all([
          fetchHomecellAttendanceSummary(churchId, effectiveBranchId, effectiveHomecellId, period),
          fetchHomecellAttendanceRecordsWithFilters({
            churchId,
            branchId: effectiveBranchId,
            homecellId: effectiveHomecellId,
            dateFrom: range.start,
            dateTo: range.end,
            limit: 50,
          }),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryResponse.data || null);
        setRecords(recordsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell attendance records.");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [activeHomecellId, branchFilter, branchId, churchId, date, homecellFilter, isHomecellLeader, period, session.homecell?.branch?.id]);

  const filteredHomecells = useMemo(() => {
    const selectedBranchId = Number(branchFilter || 0) || null;
    return homecells.filter((homecell) => !selectedBranchId || homecell.branch?.id === selectedBranchId);
  }, [branchFilter, homecells]);

  function exportRecordsAsExcel() {
    if (records.length === 0) {
      setErrorMessage("There are no homecell records to export for the current filters.");
      return;
    }

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Homecell</th>
            <th>Branch</th>
            <th>Male</th>
            <th>Female</th>
            <th>Children</th>
            <th>Total</th>
            <th>First Timers</th>
            <th>New Converts</th>
            <th>Offering</th>
            <th>Recorded By</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((record) => `
            <tr>
              <td>${formatDate(record.meeting_date)}</td>
              <td>${record.homecell?.name || "--"}</td>
              <td>${record.branch?.name || "Unassigned"}</td>
              <td>${record.male_count || 0}</td>
              <td>${record.female_count || 0}</td>
              <td>${record.children_count || 0}</td>
              <td>${record.total_count || 0}</td>
              <td>${record.first_timers_count || 0}</td>
              <td>${record.new_converts_count || 0}</td>
              <td>${formatCurrency(record.offering_amount)}</td>
              <td>${getResolvedRecorderName(record.recorded_by, churchUsers)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([`\ufeff${tableHtml}`], { type: "application/vnd.ms-excel" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    const prefix = isHomecellLeader ? (session.homecell?.name || "homecell-records") : "homecell-records";
    link.href = downloadUrl;
    link.download = `${prefix.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  if (isLoading) {
    return <TemplateLoader />;
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Homecell Records</h4>
                  <p className="text-secondary mb-0">Review recent submissions by period, branch, or homecell, then open any record back in the attendance page for editing.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-outline-success" onClick={exportRecordsAsExcel} type="button">
                    <i className="ti ti-file-spreadsheet me-1" />
                    Export Excel
                  </button>
                  <Link className="btn btn-outline-secondary" href="/homecell-attendance">
                    <i className="ti ti-clipboard-plus me-1" />
                    {isHomecellLeader ? "Record My Attendance" : "Record Attendance"}
                  </Link>
                  {!isHomecellLeader ? (
                    <Link className="btn btn-primary" href="/homecell-reports">
                      <i className="ti ti-chart-bar me-1" />
                      View Reports
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Attendance" value={Number(summary?.total_attendance || 0)} valueClass="text-primary">
          {period === "monthly" ? "Current month" : "Current week"}
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Reports Submitted" value={Number(summary?.reports_submitted || 0)} valueClass="text-success">
          Submitted records
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Average Attendance" value={Number(summary?.average_attendance || 0)} valueClass="text-warning">
          Per homecell meeting
        </StatCard>
        <StatCard
          borderClass="b-s-3-info"
          badgeClass="text-light-info"
          label="Coverage"
          value={`${summary?.homecells_covered || 0} / ${summary?.active_homecells || 0}`}
          valueClass="text-info"
        >
          {`${summary?.pending_homecells || 0} pending`}
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Homecell Records</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")} style={{ width: 140 }} value={period}>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <input className="form-control form-control-sm" onChange={(event) => setDate(event.target.value)} style={{ width: 170 }} type="date" value={date} />
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(branchId) || isHomecellLeader}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  style={{ width: 200 }}
                  value={branchFilter}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(activeHomecellId)}
                  onChange={(event) => setHomecellFilter(event.target.value)}
                  style={{ width: 220 }}
                  value={homecellFilter}
                >
                  <option value="">All Homecells</option>
                  {filteredHomecells.map((homecell) => (
                    <option key={homecell.id} value={homecell.id}>
                      {homecell.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Homecell</th>
                      <th>Branch</th>
                      <th>Breakdown</th>
                      <th>Total</th>
                      <th>Guests</th>
                      <th>Offering</th>
                      <th>Recorded By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={9}>No homecell attendance records found for the current filters.</td>
                      </tr>
                    ) : records.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.meeting_date)}</td>
                        <td>
                          <strong>{record.homecell?.name || "--"}</strong>
                          <div className="small text-secondary">{record.homecell?.code || "--"}</div>
                        </td>
                        <td>{record.branch?.name || <span className="text-muted">Unassigned</span>}</td>
                        <td className="small">
                          M: {record.male_count || 0}<br />
                          F: {record.female_count || 0}<br />
                          C: {record.children_count || 0}
                        </td>
                        <td><span className="badge text-light-primary">{record.total_count || 0}</span></td>
                        <td className="small">
                          FT: {record.first_timers_count || 0}<br />
                          NC: {record.new_converts_count || 0}
                        </td>
                        <td>{formatCurrency(record.offering_amount)}</td>
                        <td>{getResolvedRecorderName(record.recorded_by, churchUsers)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-light-primary"
                            onClick={() => router.push(`/homecell-attendance?record_id=${record.id}&return_to=records`)}
                            type="button"
                          >
                            <i className="ti ti-edit me-1" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="alert alert-info mb-0">
            <i className="ti ti-info-circle me-2" />
            <strong>How it works:</strong> Filters here shape both the summary cards and the records table. Use <strong>Edit</strong> to return to the attendance page with the selected record preloaded.
          </div>
        </div>
      </div>
    </div>
  );
}

function getResolvedRecorderName(
  recorder: HomecellAttendanceRecord["recorded_by"],
  churchUsers: Array<{ id: number; name?: string | null }>,
) {
  if (!recorder) {
    return "System";
  }

  const directName = String(recorder.name || "").trim();

  if (directName && !looksLikeRoleLabel(directName)) {
    return directName;
  }

  return churchUsers.find((user) => user.id === recorder.id && user.name && !looksLikeRoleLabel(user.name))?.name || directName || "System";
}

function StatCard({
  borderClass,
  badgeClass,
  label,
  value,
  valueClass,
  children,
}: {
  borderClass: string;
  badgeClass: string;
  label: string;
  value: number | string;
  valueClass: string;
  children: string;
}) {
  return (
    <div className="col-md-3">
      <div className={`card overview-details-box ${borderClass}`}>
        <div className="card-body">
          <p className="text-dark f-w-600 mb-1">{label}</p>
          <h3 className={`${valueClass} mb-0`}>{value}</h3>
          <span className={`badge ${badgeClass} mt-2`}>{children}</span>
        </div>
      </div>
    </div>
  );
}
