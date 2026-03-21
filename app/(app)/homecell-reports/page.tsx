"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { ModalShell } from "@/components/ui/modal-shell";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { formatCurrency, getPrimaryLeaderName, getRangeDates, getTodayDate, percentage } from "@/lib/homecell-utils";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  fetchBranches,
  fetchHomecellAttendanceRecordsWithFilters,
  fetchHomecells,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type { BranchRecord, HomecellAttendanceRecord, HomecellRecord } from "@/types/api";

interface ReportRow {
  homecell_id: number;
  homecell_name: string;
  homecell_code?: string | null;
  branch_id: number | null;
  branch_name: string | null;
  leader_name: string;
  male_count: number;
  female_count: number;
  children_count: number;
  total_count: number;
  first_timers_count: number;
  new_converts_count: number;
  offering_amount: number;
  latest_meeting_date: string | null;
  status: "submitted" | "pending";
  records: HomecellAttendanceRecord[];
}

export default function HomecellReportsRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const isHomecellLeader = isHomecellLeaderSession(session);
  const activeHomecellId = session.homecell?.id ? Number(session.homecell.id) : null;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [records, setRecords] = useState<HomecellAttendanceRecord[]>([]);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [date, setDate] = useState(getTodayDate());
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : "");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [detailsRow, setDetailsRow] = useState<ReportRow | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [branchesResponse, homecellsResponse] = await Promise.all([
          branchId ? Promise.resolve({ data: session.branch ? [session.branch as BranchRecord] : [] }) : fetchBranches(churchId),
          fetchHomecells(churchId, branchId),
        ]);

        if (!active) {
          return;
        }

        setBranches(branchesResponse.data || []);
        setHomecells(homecellsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell reports.");
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

    async function loadRecords() {
      try {
        const range = getRangeDates(date, period);
        const effectiveBranchId = isHomecellLeader ? (session.homecell?.branch?.id || branchId) : (Number(branchFilter || 0) || undefined);

        const response = await fetchHomecellAttendanceRecordsWithFilters({
          churchId,
          branchId: effectiveBranchId,
          dateFrom: range.start,
          dateTo: range.end,
          limit: 200,
        });

        if (!active) {
          return;
        }

        setRecords(response.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell reports.");
        }
      }
    }

    void loadRecords();

    return () => {
      active = false;
    };
  }, [branchFilter, branchId, churchId, date, isHomecellLeader, period, session.homecell?.branch?.id]);

  const scopedHomecells = useMemo(() => {
    const selectedBranchId = Number(branchFilter || 0) || null;
    return homecells.filter((homecell) => {
      if (activeHomecellId) {
        return homecell.id === activeHomecellId;
      }

      return !selectedBranchId || homecell.branch?.id === selectedBranchId;
    });
  }, [activeHomecellId, branchFilter, homecells]);

  const rows = useMemo(() => {
    const aggregatedByHomecell = new Map<number, ReportRow>();

    records.forEach((record) => {
      const homecellId = record.homecell?.id;

      if (!homecellId) {
        return;
      }

      const existing = aggregatedByHomecell.get(homecellId) || {
        homecell_id: homecellId,
        homecell_name: record.homecell?.name || "--",
        homecell_code: record.homecell?.code || null,
        branch_id: record.branch?.id || null,
        branch_name: record.branch?.name || null,
        leader_name: "--",
        male_count: 0,
        female_count: 0,
        children_count: 0,
        total_count: 0,
        first_timers_count: 0,
        new_converts_count: 0,
        offering_amount: 0,
        latest_meeting_date: null,
        status: "submitted" as const,
        records: [],
      };

      existing.male_count += Number(record.male_count || 0);
      existing.female_count += Number(record.female_count || 0);
      existing.children_count += Number(record.children_count || 0);
      existing.total_count += Number(record.total_count || 0);
      existing.first_timers_count += Number(record.first_timers_count || 0);
      existing.new_converts_count += Number(record.new_converts_count || 0);
      existing.offering_amount += Number(record.offering_amount || 0);
      existing.latest_meeting_date = !existing.latest_meeting_date || (record.meeting_date || "") > existing.latest_meeting_date
        ? (record.meeting_date || null)
        : existing.latest_meeting_date;
      existing.records.push(record);

      aggregatedByHomecell.set(homecellId, existing);
    });

    return scopedHomecells
      .map((homecell) => {
        const aggregated = aggregatedByHomecell.get(homecell.id);

        if (aggregated) {
          return {
            ...aggregated,
            leader_name: getPrimaryLeaderName(homecell),
          };
        }

        return {
          homecell_id: homecell.id,
          homecell_name: homecell.name,
          homecell_code: homecell.code || null,
          branch_id: homecell.branch?.id || null,
          branch_name: homecell.branch?.name || null,
          leader_name: getPrimaryLeaderName(homecell),
          male_count: 0,
          female_count: 0,
          children_count: 0,
          total_count: 0,
          first_timers_count: 0,
          new_converts_count: 0,
          offering_amount: 0,
          latest_meeting_date: null,
          status: "pending" as const,
          records: [],
        };
      })
      .filter((row) => !statusFilter || row.status === statusFilter)
      .filter((row) => {
        const normalizedSearch = search.trim().toLowerCase();

        if (!normalizedSearch) {
          return true;
        }

        return [row.homecell_name, row.leader_name, row.branch_name, row.homecell_code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === "submitted" ? -1 : 1;
        }

        return left.homecell_name.localeCompare(right.homecell_name);
      });
  }, [records, scopedHomecells, search, statusFilter]);

  const stats = useMemo(() => {
    const submittedRows = rows.filter((row) => row.status === "submitted");
    const totalAttendance = submittedRows.reduce((sum, row) => sum + row.total_count, 0);
    const maleCount = submittedRows.reduce((sum, row) => sum + row.male_count, 0);
    const femaleCount = submittedRows.reduce((sum, row) => sum + row.female_count, 0);
    const childrenCount = submittedRows.reduce((sum, row) => sum + row.children_count, 0);
    const coveredCount = submittedRows.length;
    const pendingCount = rows.filter((row) => row.status === "pending").length;

    return {
      totalAttendance,
      submittedReports: records.length,
      coveredCount,
      pendingCount,
      maleCount,
      femaleCount,
      childrenCount,
    };
  }, [records.length, rows]);

  function exportCsv() {
    if (rows.length === 0) {
      setErrorMessage("There is no report data to export for the current filters.");
      return;
    }

    const lines = [
      ["Homecell", "Leader", "Branch", "Status", "Male", "Female", "Children", "Total", "Last Meeting", "Records Submitted", "First Timers", "New Converts", "Offering"].join(","),
      ...rows.map((row) => [
        row.homecell_name,
        row.leader_name,
        row.branch_name || "Unassigned",
        row.status,
        row.male_count,
        row.female_count,
        row.children_count,
        row.total_count,
        row.latest_meeting_date || "",
        row.records.length,
        row.first_timers_count,
        row.new_converts_count,
        row.offering_amount ? row.offering_amount.toFixed(2) : "",
      ].map((value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`).join(",")),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `homecell-report-${date}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
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
                  <h4 className="mb-1">Homecell Report</h4>
                  <p className="text-secondary mb-0">See which homecells submitted attendance, which ones are still pending, and how the period breaks down by leader and branch.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-outline-secondary" href="/homecell-attendance">
                    <i className="ti ti-clipboard-plus me-1" />
                    Record Attendance
                  </Link>
                  <button className="btn btn-primary" onClick={exportCsv} type="button">
                    <i className="ti ti-download me-1" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Attendance" value={stats.totalAttendance} valueClass="text-primary">
          {period === "monthly" ? "Selected month" : "Selected week"}
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Reports Submitted" value={stats.submittedReports} valueClass="text-info">
          Attendance records received
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Covered Homecells" value={`${stats.coveredCount} / ${rows.length}`} valueClass="text-success">
          Submitted at least once
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Pending Homecells" value={stats.pendingCount} valueClass="text-warning">
          No report in period
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Male" value={stats.maleCount} valueClass="text-info">
          {percentage(stats.maleCount, stats.totalAttendance)}
        </StatCard>
        <StatCard borderClass="b-s-3-danger" badgeClass="text-light-danger" label="Female" value={stats.femaleCount} valueClass="text-danger">
          {percentage(stats.femaleCount, stats.totalAttendance)}
        </StatCard>
        <StatCard borderClass="b-s-3-secondary" badgeClass="text-light-secondary" label="Children" value={stats.childrenCount} valueClass="text-secondary">
          {percentage(stats.childrenCount, stats.totalAttendance)}
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Report Filters</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")} style={{ width: 140 }} value={period}>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <input className="form-control form-control-sm" onChange={(event) => setDate(event.target.value)} style={{ width: 170 }} type="date" value={date} />
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(branchId)}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  style={{ width: 220 }}
                  value={branchFilter}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <select className="form-select form-select-sm" onChange={(event) => setStatusFilter(event.target.value)} style={{ width: 170 }} value={statusFilter}>
                  <option value="">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="pending">Pending</option>
                </select>
                <input
                  className="form-control form-control-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search homecell or leader..."
                  style={{ width: 240 }}
                  type="text"
                  value={search}
                />
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Homecell</th>
                      <th>Leader</th>
                      <th>Branch</th>
                      <th className="text-center">Male</th>
                      <th className="text-center">Female</th>
                      <th className="text-center">Children</th>
                      <th className="text-center">Total</th>
                      <th>Last Meeting</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={10}>No homecell reports found for the current filters.</td>
                      </tr>
                    ) : rows.map((row) => (
                      <tr className={row.status === "pending" ? "table-warning" : ""} key={row.homecell_id}>
                        <td>
                          <strong>{row.homecell_name}</strong>
                          <div className="small text-secondary">{row.homecell_code || "--"}</div>
                        </td>
                        <td>{row.leader_name}</td>
                        <td>{row.branch_name || <span className="text-muted">Unassigned</span>}</td>
                        <td className="text-center">{row.status === "submitted" ? <span className="badge bg-light-info">{row.male_count}</span> : <span className="text-muted">--</span>}</td>
                        <td className="text-center">{row.status === "submitted" ? <span className="badge bg-light-danger">{row.female_count}</span> : <span className="text-muted">--</span>}</td>
                        <td className="text-center">{row.status === "submitted" ? <span className="badge bg-light-secondary">{row.children_count}</span> : <span className="text-muted">--</span>}</td>
                        <td className="text-center">{row.status === "submitted" ? <strong className="text-primary">{row.total_count}</strong> : <span className="text-muted">--</span>}</td>
                        <td>{formatDate(row.latest_meeting_date)}</td>
                        <td>{row.status === "submitted" ? <span className="badge bg-success">Submitted</span> : <span className="badge bg-warning">Pending</span>}</td>
                        <td>
                          <button className="btn btn-sm btn-light-primary" onClick={() => setDetailsRow(row)} type="button">
                            <i className="ti ti-eye me-1" />
                            {row.status === "submitted" ? "View" : "Review"}
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
            <strong>How it works:</strong> Submitted homecells are aggregated for the selected period. Active homecells with no attendance record in that same period are shown as pending so follow-up is visible immediately.
          </div>
        </div>
      </div>

      {detailsRow ? (
        <ModalShell
          footer={(
            <button className="btn btn-secondary" onClick={() => setDetailsRow(null)} type="button">
              Close
            </button>
          )}
          onClose={() => setDetailsRow(null)}
          size="lg"
          title="Homecell Report Details"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <div className="border rounded p-3 h-100">
                <h6 className="mb-2">{detailsRow.homecell_name}</h6>
                <div className="small text-secondary mb-1">Leader: {detailsRow.leader_name}</div>
                <div className="small text-secondary mb-1">Branch: {detailsRow.branch_name || "Unassigned"}</div>
                <div className="small text-secondary mb-1">Status: {detailsRow.status}</div>
                <div className="small text-secondary">Last Meeting: {formatDate(detailsRow.latest_meeting_date)}</div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="border rounded p-3 h-100">
                <div className="row g-2 text-center">
                  <MiniMetric label="Male" value={detailsRow.male_count} />
                  <MiniMetric label="Female" value={detailsRow.female_count} />
                  <MiniMetric label="Children" value={detailsRow.children_count} />
                  <MiniMetric label="Total" value={detailsRow.total_count} />
                </div>
              </div>
            </div>
            <div className="col-12">
              <div className="table-responsive">
                <table className="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Male</th>
                      <th>Female</th>
                      <th>Children</th>
                      <th>Total</th>
                      <th>First Timers</th>
                      <th>New Converts</th>
                      <th>Offering</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsRow.records.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={8}>No attendance record has been submitted for this homecell in the selected period.</td>
                      </tr>
                    ) : detailsRow.records.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.meeting_date)}</td>
                        <td>{record.male_count || 0}</td>
                        <td>{record.female_count || 0}</td>
                        <td>{record.children_count || 0}</td>
                        <td>{record.total_count || 0}</td>
                        <td>{record.first_timers_count || 0}</td>
                        <td>{record.new_converts_count || 0}</td>
                        <td>{formatCurrency(record.offering_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
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

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="col-6">
      <div className="border rounded p-2">
        <div className="small text-secondary">{label}</div>
        <strong>{value}</strong>
      </div>
    </div>
  );
}
