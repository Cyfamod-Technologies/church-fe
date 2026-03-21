"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  fetchHomecellAttendanceRecords,
  fetchHomecellAttendanceSummary,
  fetchHomecells,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type { HomecellAttendanceRecord, HomecellAttendanceSummaryResponse, HomecellRecord } from "@/types/api";

export default function HomecellManagementRoute() {
  const session = useSessionContext();
  const pathname = usePathname();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const homecellId = session.homecell?.id ? Number(session.homecell.id) : undefined;
  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [records, setRecords] = useState<HomecellAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<HomecellAttendanceSummaryResponse["data"] | null>(null);
  const [error, setError] = useState("");
  const isLeader = isHomecellLeaderSession(session);
  const pageTitle = pathname === "/homecells"
    ? "Homecells"
    : pathname === "/homecell-leaders"
      ? "Homecell Leaders"
      : pathname === "/homecell-attendance"
        ? "Homecell Attendance"
        : pathname === "/homecell-records"
          ? "Homecell Records"
          : pathname === "/homecell-reports"
            ? "Homecell Reports"
            : "Homecell Management";
  const pageSubtitle = isLeader
    ? "Your assigned homecell summary and attendance records."
    : pathname === "/homecell-leaders"
      ? "Leader and homecell assignment visibility from the live backend."
      : pathname === "/homecell-reports"
        ? "Live homecell coverage, attendance, and report visibility."
        : "Live homecell, leader, and attendance visibility from the backend.";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [homecellsResponse, recordsResponse, summaryResponse] = await Promise.all([
          fetchHomecells(churchId, branchId),
          fetchHomecellAttendanceRecords(churchId, branchId, homecellId, 20),
          fetchHomecellAttendanceSummary(churchId, branchId, homecellId),
        ]);

        if (!active) {
          return;
        }

        setHomecells(homecellsResponse.data || []);
        setRecords(recordsResponse.data || []);
        setSummary(summaryResponse.data || null);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load homecell records.");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [branchId, churchId, homecellId]);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="mb-1">{pageTitle}</h4>
              <p className="text-secondary mb-0">{pageSubtitle}</p>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className={`alert alert-danger ${error ? "" : "d-none"}`}>{error}</div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-primary"><div className="card-body"><p className="text-dark f-w-600 mb-1">Homecells</p><h4 className="text-primary mb-0">{homecells.length}</h4><span className="badge text-light-primary mt-2">{isLeader ? "Visible in your scope" : "Available in workspace"}</span></div></div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-success"><div className="card-body"><p className="text-dark f-w-600 mb-1">Reports Submitted</p><h4 className="text-success mb-0">{summary?.reports_submitted ?? 0}</h4><span className="badge text-light-success mt-2">This week</span></div></div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-warning"><div className="card-body"><p className="text-dark f-w-600 mb-1">Total Attendance</p><h4 className="text-warning mb-0">{summary?.total_attendance ?? 0}</h4><span className="badge text-light-warning mt-2">This week</span></div></div>
        </div>
        <div className="col-xl-5">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">{isLeader ? "My Homecell" : "Homecell Registry"}</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Homecell</th>
                      <th>Branch</th>
                      <th>Meeting</th>
                      <th>Leader</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homecells.length > 0 ? (
                      homecells.map((homecell) => (
                        <tr key={homecell.id}>
                          <td>{homecell.name}</td>
                          <td>{homecell.branch?.name || session.church?.name || "--"}</td>
                          <td>{[homecell.meeting_day, homecell.meeting_time].filter(Boolean).join(" • ") || "--"}</td>
                          <td>{homecell.leaders?.find((leader) => leader.is_primary)?.name || homecell.leaders?.[0]?.name || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="text-center text-muted py-4" colSpan={4}>No homecells yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-xl-7">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Homecell Attendance Records</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Homecell</th>
                      <th>Total</th>
                      <th>First Timers</th>
                      <th>New Converts</th>
                      <th>Recorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length > 0 ? (
                      records.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.meeting_date)}</td>
                          <td>{record.homecell?.name || "--"}</td>
                          <td>{record.total_count ?? 0}</td>
                          <td>{record.first_timers_count ?? 0}</td>
                          <td>{record.new_converts_count ?? 0}</td>
                          <td>{record.recorded_by?.name || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="text-center text-muted py-4" colSpan={6}>No homecell attendance records yet</td></tr>
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
