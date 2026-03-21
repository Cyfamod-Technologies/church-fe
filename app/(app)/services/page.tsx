"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import {
  fetchAttendanceRecords,
  fetchAttendanceSummary,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type { AttendanceRecord, AttendanceSummaryResponse } from "@/types/api";

export default function ServicesRoute() {
  const session = useSessionContext();
  const pathname = usePathname();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const [summary, setSummary] = useState<AttendanceSummaryResponse["data"] | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [error, setError] = useState("");
  const pageTitle = pathname === "/attendance" ? "Record Attendance" : "Services";
  const pageSubtitle = pathname === "/attendance"
    ? "Live attendance entry visibility and recent attendance records."
    : "Live service attendance summary and recent records.";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [summaryResponse, recordsResponse] = await Promise.all([
          fetchAttendanceSummary(churchId, branchId),
          fetchAttendanceRecords(churchId, branchId, 20),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryResponse.data || null);
        setRecords(recordsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load service records.");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [branchId, churchId]);

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
          <div className="card overview-details-box b-s-3-primary">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Weekly Total</p>
              <h4 className="text-primary mb-0">{summary?.total_attendance ?? 0}</h4>
              <span className="badge text-light-primary mt-2">Attendance this week</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-success">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Average</p>
              <h4 className="text-success mb-0">{summary?.average_attendance ?? 0}</h4>
              <span className="badge text-light-success mt-2">Per recorded service</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-warning">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Highest Service</p>
              <h4 className="text-warning mb-0">{summary?.highest_service?.total_count ?? 0}</h4>
              <span className="badge text-light-warning mt-2">{summary?.highest_service?.service_label || "No records yet"}</span>
            </div>
          </div>
        </div>
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Recent Attendance Records</h5>
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
                      <th>First Timers</th>
                      <th>New Converts</th>
                      <th>Recorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length > 0 ? (
                      records.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.service_date)}</td>
                          <td>{record.service_label || "--"}</td>
                          <td>{record.branch?.name || session.church?.name || "--"}</td>
                          <td>{record.total_count ?? 0}</td>
                          <td>{record.first_timers_count ?? 0}</td>
                          <td>{record.new_converts_count ?? 0}</td>
                          <td>{record.recorded_by?.name || record.recordedBy?.name || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={7}>No attendance records yet</td>
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
