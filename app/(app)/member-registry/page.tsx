"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import {
  fetchBranches,
  fetchChurch,
  fetchChurchUnits,
  fetchMemberEntries,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  BranchRecord,
  ChurchApiRecord,
  ChurchUnitRecord,
  GuestResponseEntryRecord,
} from "@/types/api";

export default function MemberRegistryRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = getChurchId(session);
  const activeBranchId = getBranchId(session);

  const [church, setChurch] = useState<ChurchApiRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [churchUnits, setChurchUnits] = useState<ChurchUnitRecord[]>([]);
  const [entries, setEntries] = useState<GuestResponseEntryRecord[]>([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState(activeBranchId ? String(activeBranchId) : "");
  const [milestoneFilter, setMilestoneFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (searchParams.get("updated") === "1") {
      setSuccessMessage("Member record updated successfully.");
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [churchResponse, branchesResponse, unitsResponse, entriesResponse] = await Promise.all([
          fetchChurch(churchId),
          fetchBranches(churchId, activeBranchId),
          fetchChurchUnits(churchId),
          fetchMemberEntries(churchId, activeBranchId, 100),
        ]);

        if (!active) {
          return;
        }

        setChurch(churchResponse.data || null);
        setBranches((branchesResponse.data || []).filter(Boolean));
        setChurchUnits(unitsResponse.data || []);
        setEntries(entriesResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the member registry right now.");
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
  }, [activeBranchId, churchId]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const branchMatches = !branchFilter
      || (branchFilter === "main" && !entry.branch)
      || (entry.branch && String(entry.branch.id) === branchFilter);
    const typeMatches = !typeFilter || entry.entry_type === typeFilter;
    const unitMatches = !unitFilter || (entry.church_units || []).some((unit) => String(unit.id) === unitFilter);
    const dateMatches = !dateFilter || entry.service_date === dateFilter;
    const searchValue = search.trim().toLowerCase();
    const searchMatches = !searchValue || [
      entry.full_name,
      entry.phone,
      entry.email,
      entry.invited_by,
      entry.branch?.name,
      (entry.church_units || []).map((unit) => unit.name).filter(Boolean).join(" "),
    ].some((value) => String(value || "").toLowerCase().includes(searchValue));

    return branchMatches && typeMatches && unitMatches && dateMatches && searchMatches && entryMatchesMilestoneFilter(entry, milestoneFilter);
  }), [branchFilter, dateFilter, entries, milestoneFilter, search, typeFilter, unitFilter]);

  const stats = useMemo(() => ({
    visible: filteredEntries.length,
    foundationDone: filteredEntries.filter((entry) => entry.foundation_class_completed).length,
    baptised: filteredEntries.filter((entry) => entry.baptism_completed).length,
    wofbiDone: filteredEntries.filter((entry) => entry.wofbi_completed).length,
  }), [filteredEntries]);

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
                  <h4 className="mb-1">Member Registry</h4>
                  <p className="text-secondary mb-0">Filter by category, branch, milestone, unit, date, or search and reopen any member record for editing.</p>
                </div>
                <Link className="btn btn-primary" href="/add-member">
                  <i className="ti ti-user-plus me-1" />
                  Add Member
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Visible Records" value={stats.visible} valueClass="text-primary">Current filters</StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Foundation Done" value={stats.foundationDone} valueClass="text-success">Journey progress</StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Baptised" value={stats.baptised} valueClass="text-warning">Journey progress</StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="WOFBI Complete" value={stats.wofbiDone} valueClass="text-info">BCC / LCC / LDC</StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Member Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" style={{ width: 170 }} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                  <option value="">All Categories</option>
                  <option value="first_timer">First Timers</option>
                  <option value="new_convert">New Converts</option>
                  <option value="rededication">Re-Dedications</option>
                </select>
                <select className="form-select form-select-sm" disabled={Boolean(activeBranchId)} style={{ width: 170 }} value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                  <option value="">All Branches</option>
                  <option value="main">{`${church?.name || "Main Church"} (Main Church)`}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
                <select className="form-select form-select-sm" style={{ width: 190 }} value={milestoneFilter} onChange={(event) => setMilestoneFilter(event.target.value)}>
                  <option value="">All Milestones</option>
                  <option value="foundation_done">Foundation Done</option>
                  <option value="foundation_pending">Foundation Pending</option>
                  <option value="baptism_done">Baptism Done</option>
                  <option value="baptism_pending">Baptism Pending</option>
                  <option value="holy_ghost_done">Holy Ghost Baptism Done</option>
                  <option value="holy_ghost_pending">Holy Ghost Baptism Pending</option>
                  <option value="wofbi_done">WOFBI Done</option>
                  <option value="wofbi_pending">WOFBI Pending</option>
                  <option value="wofbi_bcc">WOFBI - BCC</option>
                  <option value="wofbi_lcc">WOFBI - LCC</option>
                  <option value="wofbi_ldc">WOFBI - LDC</option>
                </select>
                <select className="form-select form-select-sm" style={{ width: 170 }} value={unitFilter} onChange={(event) => setUnitFilter(event.target.value)}>
                  <option value="">All Units</option>
                  {churchUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                  ))}
                </select>
                <input className="form-control form-control-sm" style={{ width: 170 }} type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
                <input className="form-control form-control-sm" placeholder="Search name, phone..." style={{ width: 220 }} type="text" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Category</th>
                      <th>Branch</th>
                      <th>Journey</th>
                      <th>Date</th>
                      <th>Recorded By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.length > 0 ? filteredEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>
                          <strong>{entry.full_name || "--"}</strong>
                          <div className="small text-secondary">{entry.phone || entry.email || "--"}</div>
                          <div className="small text-secondary">
                            {(entry.church_units || []).map((unit) => unit.name).filter(Boolean).join(", ") || "No unit assigned"}
                          </div>
                        </td>
                        <td><span className="badge text-light-primary">{labelForEntryType(entry.entry_type)}</span></td>
                        <td>{entry.branch ? entry.branch.name : <span className="text-muted">{church?.name || "Main Church"}</span>}</td>
                        <td><div className="d-flex flex-wrap gap-1">{renderJourneyBadges(entry)}</div></td>
                        <td>{formatDate(entry.service_date)}</td>
                        <td>{resolveRecorderName(entry.recorded_by, church?.users || [])}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-light-primary"
                            onClick={() => router.push(`/add-member?edit=${encodeURIComponent(String(entry.id))}&return_to=registry`)}
                            type="button"
                          >
                            <i className="ti ti-edit me-1" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={7}>No member records found for the current filters.</td>
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

function StatCard({
  label,
  value,
  valueClass,
  borderClass,
  badgeClass,
  children,
}: {
  label: string;
  value: number;
  valueClass: string;
  borderClass: string;
  badgeClass: string;
  children: ReactNode;
}) {
  return (
    <div className="col-md-6 col-xl-3">
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

function labelForEntryType(value?: string | null) {
  return {
    first_timer: "First Timer",
    new_convert: "New Convert",
    rededication: "Re-Dedication",
  }[value || ""] || "Member";
}

function looksLikeRoleLabel(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  return ["church_admin", "branch_admin", "admin", "church admin", "branch admin"].includes(normalized);
}

function resolveRecorderName(recorder: GuestResponseEntryRecord["recorded_by"], churchUsers: ChurchApiRecord["users"]) {
  if (!recorder) {
    return "System";
  }

  if (recorder.name && !looksLikeRoleLabel(recorder.name)) {
    return recorder.name;
  }

  const matchedUser = (churchUsers || []).find((user) => (
    recorder.id && user.id === recorder.id && user.name && !looksLikeRoleLabel(user.name)
  ));

  return matchedUser?.name || recorder.name || "System";
}

function entryMatchesMilestoneFilter(entry: GuestResponseEntryRecord, filter: string) {
  switch (filter) {
    case "foundation_done":
      return Boolean(entry.foundation_class_completed);
    case "foundation_pending":
      return !entry.foundation_class_completed;
    case "baptism_done":
      return Boolean(entry.baptism_completed);
    case "baptism_pending":
      return !entry.baptism_completed;
    case "holy_ghost_done":
      return Boolean(entry.holy_ghost_baptism_completed);
    case "holy_ghost_pending":
      return !entry.holy_ghost_baptism_completed;
    case "wofbi_done":
      return Boolean(entry.wofbi_completed);
    case "wofbi_pending":
      return !entry.wofbi_completed;
    case "wofbi_bcc":
      return Boolean(entry.wofbi_levels?.includes("BCC"));
    case "wofbi_lcc":
      return Boolean(entry.wofbi_levels?.includes("LCC"));
    case "wofbi_ldc":
      return Boolean(entry.wofbi_levels?.includes("LDC"));
    default:
      return true;
  }
}

function renderJourneyBadges(entry: GuestResponseEntryRecord) {
  const badges: string[] = [];

  badges.push(entry.foundation_class_completed ? "Foundation" : "Foundation Pending");
  badges.push(entry.baptism_completed ? "Baptism" : "Baptism Pending");
  badges.push(entry.holy_ghost_baptism_completed ? "Holy Ghost" : "Holy Ghost Pending");
  badges.push(entry.wofbi_completed ? `WOFBI${entry.wofbi_levels?.length ? ` ${entry.wofbi_levels.join(", ")}` : ""}` : "WOFBI Pending");

  return badges.map((badge) => (
    <span className={`badge ${badge.includes("Pending") ? "text-light-secondary" : badge.startsWith("Foundation") ? "text-light-success" : badge.startsWith("Baptism") ? "text-light-primary" : badge.startsWith("Holy Ghost") ? "text-light-warning" : "text-light-info"}`} key={badge}>
      {badge}
    </span>
  ));
}
