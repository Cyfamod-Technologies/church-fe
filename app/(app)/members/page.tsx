"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { fetchChurchUnits, fetchMemberEntries, getBranchId, getChurchId } from "@/lib/workspace-api";
import type { ChurchUnitRecord, GuestResponseEntryRecord } from "@/types/api";

export default function MembersRoute() {
  const session = useSessionContext();
  const pathname = usePathname();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const [entries, setEntries] = useState<GuestResponseEntryRecord[]>([]);
  const [units, setUnits] = useState<ChurchUnitRecord[]>([]);
  const [error, setError] = useState("");
  const pageTitle = pathname === "/add-member"
    ? "Add Member"
    : pathname === "/member-registry"
      ? "Member Registry"
      : pathname === "/church-units"
        ? "Church Units"
        : "Members";
  const pageSubtitle = pathname === "/add-member"
    ? "Capture member information and journey milestones."
    : pathname === "/member-registry"
      ? "Live member journey intake and milestone visibility."
      : pathname === "/church-units"
        ? "Configured church units and member participation."
        : "Live member journey intake and milestone visibility.";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [entriesResponse, unitsResponse] = await Promise.all([
          fetchMemberEntries(churchId, branchId, 100),
          fetchChurchUnits(churchId),
        ]);

        if (!active) {
          return;
        }

        setEntries(entriesResponse.data || []);
        setUnits(unitsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load member records.");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [branchId, churchId]);

  const stats = useMemo(() => ({
    total: entries.length,
    firstTimers: entries.filter((entry) => entry.entry_type === "first_timer").length,
    newConverts: entries.filter((entry) => entry.entry_type === "new_convert").length,
    rededications: entries.filter((entry) => entry.entry_type === "rededication").length,
  }), [entries]);

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
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-primary"><div className="card-body"><p className="text-dark f-w-600 mb-1">Total Entries</p><h4 className="text-primary mb-0">{stats.total}</h4><span className="badge text-light-primary mt-2">Member intake records</span></div></div>
        </div>
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-success"><div className="card-body"><p className="text-dark f-w-600 mb-1">First Timers</p><h4 className="text-success mb-0">{stats.firstTimers}</h4><span className="badge text-light-success mt-2">Tracked in registry</span></div></div>
        </div>
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-warning"><div className="card-body"><p className="text-dark f-w-600 mb-1">New Converts</p><h4 className="text-warning mb-0">{stats.newConverts}</h4><span className="badge text-light-warning mt-2">Tracked in registry</span></div></div>
        </div>
        <div className="col-md-3">
          <div className="card overview-details-box b-s-3-info"><div className="card-body"><p className="text-dark f-w-600 mb-1">Church Units</p><h4 className="text-info mb-0">{units.length}</h4><span className="badge text-light-info mt-2">Configured units</span></div></div>
        </div>
        <div className="col-xl-4">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Milestone Snapshot</h5></div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Foundation Class</span><strong>{entries.filter((entry) => entry.foundation_class_completed).length}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Water Baptism</span><strong>{entries.filter((entry) => entry.baptism_completed).length}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Holy Ghost Baptism</span><strong>{entries.filter((entry) => entry.holy_ghost_baptism_completed).length}</strong></div>
              <div className="border rounded p-3"><span className="text-secondary small d-block mb-1">WOFBI Completed</span><strong>{entries.filter((entry) => entry.wofbi_completed).length}</strong></div>
            </div>
          </div>
        </div>
        <div className="col-xl-8">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Member Registry</h5></div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Entry Type</th>
                      <th>Date</th>
                      <th>Branch</th>
                      <th>Milestones</th>
                      <th>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length > 0 ? (
                      entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.full_name || "--"}</td>
                          <td>{entry.entry_type?.replace(/_/g, " ") || "--"}</td>
                          <td>{formatDate(entry.service_date)}</td>
                          <td>{entry.branch?.name || session.church?.name || "--"}</td>
                          <td>{buildMilestones(entry).join(", ") || "--"}</td>
                          <td>{entry.church_units?.map((unit) => unit.name).filter(Boolean).join(", ") || "--"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={6}>No member records yet</td>
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

function buildMilestones(entry: GuestResponseEntryRecord) {
  const milestones: string[] = [];

  if (entry.foundation_class_completed) milestones.push("Foundation Class");
  if (entry.baptism_completed) milestones.push("Baptism");
  if (entry.holy_ghost_baptism_completed) milestones.push("Holy Ghost Baptism");
  if (entry.wofbi_completed) milestones.push(`WOFBI${entry.wofbi_levels?.length ? ` (${entry.wofbi_levels.join(", ")})` : ""}`);

  return milestones;
}
