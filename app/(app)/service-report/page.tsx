"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { getRangeDates, getTodayDate, looksLikeRoleLabel } from "@/lib/homecell-utils";
import {
  fetchAttendanceRecordsWithFilters,
  fetchAttendanceSummary,
  fetchBranches,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type { AttendanceRecord, AttendanceSummaryResponse, BranchRecord } from "@/types/api";

export default function ServiceReportRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);
  const activeBranchId = getBranchId(session);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryResponse["data"] | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [date, setDate] = useState(getTodayDate());
  const [branchId, setBranchId] = useState(activeBranchId ? String(activeBranchId) : "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBranches() {
      try {
        const response = activeBranchId
          ? { data: session.branch ? [session.branch as BranchRecord] : [] }
          : await fetchBranches(churchId);

        if (!active) {
          return;
        }

        setBranches(response.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the service report right now.");
        }
      }
    }

    void loadBranches();

    return () => {
      active = false;
    };
  }, [activeBranchId, churchId, session.branch]);

  useEffect(() => {
    let active = true;

    async function loadReport() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const range = getRangeDates(date, period);
        const effectiveBranchId = Number(branchId || 0) || undefined;

        const [summaryResponse, listResponse] = await Promise.all([
          fetchAttendanceSummary(churchId, effectiveBranchId, period, date),
          fetchAttendanceRecordsWithFilters({
            churchId,
            branchId: effectiveBranchId,
            dateFrom: range.start,
            dateTo: range.end,
            perPage: 50,
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
  }, [branchId, churchId, date, period]);

  const highestLabel = useMemo(() => (
    summary?.highest_service?.service_label || "No records yet"
  ), [summary]);

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
                  <p className="text-secondary mb-0">See real service attendance totals, averages, highest service, and a simple service record table.</p>
                </div>
                <Link className="btn btn-outline-primary" href="/attendance">
                  <i className="ti ti-checkup-list me-1" />
                  Record Attendance
                </Link>
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
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Average Per Service" value={summary?.average_attendance ?? 0} valueClass="text-warning">
          Selected period
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Highest Service" value={summary?.highest_service?.total_count ?? 0} valueClass="text-info">
          {highestLabel}
        </StatCard>

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
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(activeBranchId)}
                  onChange={(event) => setBranchId(event.target.value)}
                  style={{ width: 220 }}
                  value={branchId}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
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
                      <th>Branch</th>
                      <th>Service</th>
                      <th>Attendance</th>
                      <th>First Timers</th>
                      <th>New Converts</th>
                      <th>Re-Dedications</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={8}>No service records found for the selected filters.</td>
                      </tr>
                    ) : records.map((record) => {
                      const branchLabel = record.branch?.name || `${session.church?.name || "Main Church"} (Main Church)`;

                      return (
                        <tr key={record.id}>
                          <td>{formatDate(record.service_date)}</td>
                          <td>{branchLabel}</td>
                          <td>{record.service_label || "--"}</td>
                          <td className="fw-semibold">{record.total_count ?? 0}</td>
                          <td>{record.first_timers_count ?? 0}</td>
                          <td>{record.new_converts_count ?? 0}</td>
                          <td>{record.rededications_count ?? 0}</td>
                          <td>{resolveRecordedBy(record)}</td>
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
  value: number;
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
