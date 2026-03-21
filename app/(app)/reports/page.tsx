"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSessionContext } from "@/components/providers/auth-guard";
import {
  fetchAttendanceSummary,
  fetchBranches,
  fetchHomecellAttendanceSummary,
  fetchMemberEntries,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  AttendanceSummaryResponse,
  BranchStats,
  GuestResponseEntryRecord,
  HomecellAttendanceSummaryResponse,
} from "@/types/api";

export default function ReportsRoute() {
  const session = useSessionContext();
  const pathname = usePathname();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const [branchStats, setBranchStats] = useState<BranchStats>();
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryResponse["data"] | null>(null);
  const [homecellSummary, setHomecellSummary] = useState<HomecellAttendanceSummaryResponse["data"] | null>(null);
  const [members, setMembers] = useState<GuestResponseEntryRecord[]>([]);
  const [error, setError] = useState("");
  const pageTitle = pathname === "/branch-report"
    ? "Branch Report"
    : pathname === "/service-report"
      ? "Service Report"
      : pathname === "/homecell-report"
        ? "Homecell Report"
        : pathname === "/member-report"
          ? "Member Report"
          : "Reports";
  const pageSubtitle = pathname === "/branch-report"
    ? "Live branch totals and structure."
    : pathname === "/service-report"
      ? "Live service attendance summaries and totals."
      : pathname === "/homecell-report"
        ? "Live homecell attendance coverage and totals."
        : pathname === "/member-report"
          ? "Live member intake and milestone summaries."
          : "Live branch, service, homecell, and member report summaries.";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [branchesResponse, attendanceResponse, homecellResponse, membersResponse] = await Promise.all([
          fetchBranches(churchId),
          fetchAttendanceSummary(churchId, branchId),
          fetchHomecellAttendanceSummary(churchId, branchId),
          fetchMemberEntries(churchId, branchId, 100),
        ]);

        if (!active) {
          return;
        }

        setBranchStats(branchesResponse.meta?.stats);
        setAttendanceSummary(attendanceResponse.data || null);
        setHomecellSummary(homecellResponse.data || null);
        setMembers(membersResponse.data || []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load reports.");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [branchId, churchId]);

  const memberStats = useMemo(() => ({
    firstTimers: members.filter((entry) => entry.entry_type === "first_timer").length,
    newConverts: members.filter((entry) => entry.entry_type === "new_convert").length,
    rededications: members.filter((entry) => entry.entry_type === "rededication").length,
  }), [members]);

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
        <div className="col-md-3"><div className="card overview-details-box b-s-3-primary"><div className="card-body"><p className="text-dark f-w-600 mb-1">Total Branches</p><h4 className="text-primary mb-0">{branchStats?.total_branches ?? 0}</h4><span className="badge text-light-primary mt-2">Created by your church</span></div></div></div>
        <div className="col-md-3"><div className="card overview-details-box b-s-3-success"><div className="card-body"><p className="text-dark f-w-600 mb-1">Service Total</p><h4 className="text-success mb-0">{attendanceSummary?.total_attendance ?? 0}</h4><span className="badge text-light-success mt-2">Weekly attendance</span></div></div></div>
        <div className="col-md-3"><div className="card overview-details-box b-s-3-warning"><div className="card-body"><p className="text-dark f-w-600 mb-1">Homecell Coverage</p><h4 className="text-warning mb-0">{homecellSummary?.homecells_covered ?? 0} / {homecellSummary?.active_homecells ?? 0}</h4><span className="badge text-light-warning mt-2">Reports this week</span></div></div></div>
        <div className="col-md-3"><div className="card overview-details-box b-s-3-info"><div className="card-body"><p className="text-dark f-w-600 mb-1">Member Entries</p><h4 className="text-info mb-0">{members.length}</h4><span className="badge text-light-info mt-2">Current registry size</span></div></div></div>

        <div className="col-xl-6">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Branch Report</h5></div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Direct Branches</span><strong>{branchStats?.direct_branches ?? 0}</strong></div>
              <div className="border rounded p-3"><span className="text-secondary small d-block mb-1">Sub-Branches</span><strong>{branchStats?.sub_branches ?? 0}</strong></div>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Member Report</h5></div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">First Timers</span><strong>{memberStats.firstTimers}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">New Converts</span><strong>{memberStats.newConverts}</strong></div>
              <div className="border rounded p-3"><span className="text-secondary small d-block mb-1">Re-dedications</span><strong>{memberStats.rededications}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
