"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BranchHierarchyFilter } from "@/components/filters/branch-hierarchy-filter";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { formatCurrency, getRangeDates, getTodayDate, looksLikeRoleLabel } from "@/lib/homecell-utils";
import {
  deleteAttendanceRecord,
  fetchBranches,
  fetchAttendanceRecordsWithFilters,
  fetchAttendanceSummary,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type { AttendanceRecord, AttendanceSummaryResponse, BranchRecord } from "@/types/api";

export default function ServiceReportRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();
  const churchId = getChurchId(session);
  const activeBranchId = getBranchId(session);
  const reportScope = pathname === "/service-report-church" ? "church" : "current";
  const scopeBranchId = reportScope === "church" ? undefined : activeBranchId || undefined;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryResponse["data"] | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [date, setDate] = useState(getTodayDate());
  const [branchId, setBranchId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBranches() {
      if (reportScope !== "church") {
        setBranches([]);
        setBranchId("");
        return;
      }

      try {
        const response = await fetchBranches(churchId, activeBranchId);

        if (!active) {
          return;
        }

        setBranches(response.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load branch options for this report.");
        }
      }
    }

    void loadBranches();

    return () => {
      active = false;
    };
  }, [activeBranchId, churchId, reportScope]);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const range = getRangeDates(date, period);
        const effectiveBranchId = reportScope === "church"
          ? Number(branchId || 0) || undefined
          : scopeBranchId;

        const [summaryResponse, listResponse] = await Promise.all([
          fetchAttendanceSummary(churchId, effectiveBranchId, period, date, reportScope),
          fetchAttendanceRecordsWithFilters({
            churchId,
            branchId: effectiveBranchId,
            serviceType: serviceType || undefined,
            dateFrom: range.start,
            dateTo: range.end,
            perPage: 200,
            scope: reportScope,
          }),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryResponse.data || null);
        setRecords(listResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the service report right now.");
          setRecords([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadReport();

    return () => {
      active = false;
    };
  }, [branchId, churchId, date, period, reportScope, scopeBranchId, serviceType]);

  const range = useMemo(() => getRangeDates(date, period), [date, period]);

  const highestLabel = useMemo(
    () => summary?.highest_service?.service_label || "No records yet",
    [summary],
  );

  const totalFirstTimers = useMemo(
    () => records.reduce((sum, record) => sum + Number(record.first_timers_count || 0), 0),
    [records],
  );

  const totalNewConverts = useMemo(
    () => records.reduce((sum, record) => sum + Number(record.new_converts_count || 0), 0),
    [records],
  );

  const totalRededications = useMemo(
    () => records.reduce((sum, record) => sum + Number(record.rededications_count || 0), 0),
    [records],
  );

  const totalOfferings = useMemo(
    () => records.reduce(
      (sum, record) => sum + Number(record.main_offering || 0) + Number(record.tithe || 0) + Number(record.special_offering || 0),
      0,
    ),
    [records],
  );

  const breakdownEntries = useMemo(
    () => Object.entries(summary?.breakdown || {}),
    [summary?.breakdown],
  );

  function exportRecordsAsExcel() {
    if (records.length === 0) {
      setErrorMessage("There are no service records to export for the current filters.");
      return;
    }

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Branch</th>
            <th>Service</th>
            <th>Type</th>
            <th>Male</th>
            <th>Female</th>
            <th>Children</th>
            <th>Total</th>
            <th>First Timers</th>
            <th>New Converts</th>
            <th>Rededications</th>
            <th>Main Offering</th>
            <th>Tithe</th>
            <th>Special Offering</th>
            <th>Recorded By</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${records.map((record) => `
            <tr>
              <td>${formatDate(record.service_date)}</td>
              <td>${escapeHtml(record.branch?.name || `${session.church?.name || "Main Church"} (Main Church)`)}</td>
              <td>${escapeHtml(record.service_label || "--")}</td>
              <td>${escapeHtml(formatServiceType(record.service_type))}</td>
              <td>${record.male_count ?? 0}</td>
              <td>${record.female_count ?? 0}</td>
              <td>${record.children_count ?? 0}</td>
              <td>${record.total_count ?? 0}</td>
              <td>${record.first_timers_count ?? 0}</td>
              <td>${record.new_converts_count ?? 0}</td>
              <td>${record.rededications_count ?? 0}</td>
              <td>${escapeHtml(formatCurrency(record.main_offering))}</td>
              <td>${escapeHtml(formatCurrency(record.tithe))}</td>
              <td>${escapeHtml(formatCurrency(record.special_offering))}</td>
              <td>${escapeHtml(resolveRecordedBy(record))}</td>
              <td>${escapeHtml(record.notes || "--")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    const blob = new Blob([`\ufeff${tableHtml}`], { type: "application/vnd.ms-excel" });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `service-records-${period === "monthly" ? "month" : "week"}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  async function handleDeleteRecord(record: AttendanceRecord) {
    setErrorMessage("");

    if (!window.confirm(`Delete ${record.service_label || "this attendance record"}?`)) {
      return;
    }

    try {
      await deleteAttendanceRecord(record.id);

      const range = getRangeDates(date, period);
      const effectiveBranchId = reportScope === "church"
        ? Number(branchId || 0) || undefined
        : scopeBranchId;
      const [summaryResponse, listResponse] = await Promise.all([
        fetchAttendanceSummary(churchId, effectiveBranchId, period, date, reportScope),
        fetchAttendanceRecordsWithFilters({
          churchId,
          branchId: effectiveBranchId,
          serviceType: serviceType || undefined,
          dateFrom: range.start,
          dateTo: range.end,
          perPage: 200,
          scope: reportScope,
        }),
      ]);

      setSummary(summaryResponse.data || null);
      setRecords(listResponse.data || []);
    } catch (deleteError) {
      setErrorMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete the selected attendance record.");
    }
  }

  const scopeDescription = reportScope === "church"
    ? "all branches under this church"
    : activeBranchId
      ? "the current logged-in branch"
      : "the main church only";

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
                  <h4 className="mb-1">Service Report</h4>
                  <p className="text-secondary mb-0">
                    {reportScope === "church"
                      ? "Review service attendance across all branches under this church, with period filters and export."
                      : "Review service attendance for the current workspace, with period filters and export."}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-outline-success" onClick={exportRecordsAsExcel} type="button">
                    <i className="ti ti-file-spreadsheet me-1" />
                    Export Excel
                  </button>
                  <Link className="btn btn-outline-primary" href="/attendance">
                    <i className="ti ti-checkup-list me-1" />
                    Record Attendance
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Services Recorded" value={records.length} valueClass="text-primary">
          {period === "monthly" ? "Current month" : "Current week"}
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Total Attendance" value={summary?.total_attendance ?? 0} valueClass="text-success">
          {`${formatDate(range.start)} - ${formatDate(range.end)}`}
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Average Per Service" value={summary?.average_attendance ?? 0} valueClass="text-warning">
          Selected period
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Highest Service" value={summary?.highest_service?.total_count ?? 0} valueClass="text-info">
          {highestLabel}
        </StatCard>

        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="First Timers" value={totalFirstTimers} valueClass="text-success">
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="New Converts" value={totalNewConverts} valueClass="text-primary">
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Rededications" value={totalRededications} valueClass="text-warning">
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Offerings" value={formatCurrency(totalOfferings)} valueClass="text-info">
          Main, tithe, special
        </StatCard>

        <div className="col-12">
          <div className="alert alert-info">
            <i className="ti ti-info-circle me-2" />
            <strong>Coverage:</strong> This report shows service records for {scopeDescription}. The records table also applies the selected period and optional service type filter.
            {breakdownEntries.length ? (
              <span className="d-block mt-2">
                {breakdownEntries.map(([type, item]) => (
                  <span key={type} className="badge bg-light-secondary text-secondary me-2 mb-1">
                    {formatServiceType(type)}: {item.count || 0} services / {item.total || 0} attendance
                  </span>
                ))}
              </span>
            ) : null}
          </div>
        </div>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Service Records</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")} style={{ width: 140 }} value={period}>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <input className="form-control form-control-sm" onChange={(event) => setDate(event.target.value)} style={{ width: 170 }} type="date" value={date} />
                {reportScope === "church" ? (
                  <BranchHierarchyFilter
                    branches={branches}
                    onChange={setBranchId}
                    value={branchId}
                  />
                ) : null}
                <select
                  className="form-select form-select-sm"
                  onChange={(event) => setServiceType(event.target.value)}
                  style={{ width: 180 }}
                  value={serviceType}
                >
                  <option value="">All Services</option>
                  <option value="sunday">Sunday</option>
                  <option value="wednesday">Wednesday</option>
                  <option value="wose">WOSE</option>
                  <option value="special">Special</option>
                </select>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Branch</th>
                      <th>Service</th>
                      <th>Type</th>
                      <th>Male</th>
                      <th>Female</th>
                      <th>Children</th>
                      <th>Total</th>
                      <th>First Timers</th>
                      <th>New Converts</th>
                      <th>Re-Dedications</th>
                      <th>Finance</th>
                      <th>Notes</th>
                      <th>Recorded By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={15}>No service records found for the selected filters.</td>
                      </tr>
                    ) : records.map((record) => {
                      const branchLabel = record.branch?.name || `${session.church?.name || "Main Church"} (Main Church)`;

                      return (
                        <tr key={record.id}>
                          <td>{formatDate(record.service_date)}</td>
                          <td>
                            {record.branch ? (
                              <span className="badge bg-light-secondary text-secondary">{branchLabel}</span>
                            ) : (
                              <span className="text-muted">{branchLabel}</span>
                            )}
                          </td>
                          <td><span className="badge bg-primary">{record.service_label || "--"}</span></td>
                          <td>{formatServiceType(record.service_type)}</td>
                          <td>{record.male_count ?? 0}</td>
                          <td>{record.female_count ?? 0}</td>
                          <td>{record.children_count ?? 0}</td>
                          <td className="fw-semibold">{record.total_count ?? 0}</td>
                          <td><span className="text-success">{record.first_timers_count ?? 0}</span></td>
                          <td><span className="text-primary">{record.new_converts_count ?? 0}</span></td>
                          <td>{record.rededications_count ?? 0}</td>
                          <td className="small">
                            Main: {formatCurrency(record.main_offering)}<br />
                            Tithe: {formatCurrency(record.tithe)}<br />
                            Special: {formatCurrency(record.special_offering)}
                          </td>
                          <td className="small text-secondary">{record.notes || "--"}</td>
                          <td>{resolveRecordedBy(record)}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-light-primary"
                                onClick={() => router.push(`/attendance?record_id=${record.id}`)}
                                type="button"
                              >
                                <i className="ti ti-edit me-1" />
                                Edit
                              </button>
                              <button
                                className="btn btn-sm btn-light-danger"
                                onClick={() => void handleDeleteRecord(record)}
                                type="button"
                              >
                                <i className="ti ti-trash me-1" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

function resolveRecordedBy(record: AttendanceRecord) {
  const name = record.recorded_by?.name || record.recordedBy?.name || "";
  return name && !looksLikeRoleLabel(name) ? name : "System";
}

function formatServiceType(serviceType?: string | null) {
  return ({
    sunday: "Sunday",
    wednesday: "Wednesday",
    wose: "WOSE",
    special: "Special",
  } as Record<string, string>)[String(serviceType || "").toLowerCase()] || "--";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
