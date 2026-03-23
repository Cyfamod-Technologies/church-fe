"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BranchHierarchyFilter } from "@/components/filters/branch-hierarchy-filter";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { looksLikeRoleLabel } from "@/lib/homecell-utils";
import {
  fetchBranches,
  fetchMemberEntriesWithFilters,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type { BranchRecord, GuestResponseEntryRecord } from "@/types/api";

export default function MemberReportRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);
  const activeBranchId = getBranchId(session);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [entries, setEntries] = useState<GuestResponseEntryRecord[]>([]);
  const [entryType, setEntryType] = useState("");
  const [branchId, setBranchId] = useState(activeBranchId ? String(activeBranchId) : "");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBranches() {
      try {
        const response = await fetchBranches(churchId, activeBranchId);

        if (!active) {
          return;
        }

        setBranches(response.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the member report right now.");
        }
      }
    }

    void loadBranches();

    return () => {
      active = false;
    };
  }, [activeBranchId, churchId]);

  useEffect(() => {
    let active = true;

    async function loadEntries() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetchMemberEntriesWithFilters({
          churchId,
          branchId: Number(branchId || 0) || undefined,
          entryType: entryType || undefined,
          dateFrom: date || undefined,
          dateTo: date || undefined,
          search: search.trim() || undefined,
          limit: 100,
        });

        if (!active) {
          return;
        }

        setEntries(response.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the member report right now.");
          setEntries([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      active = false;
    };
  }, [branchId, churchId, date, entryType, search]);

  const stats = useMemo(() => ({
    total: entries.length,
    firstTimers: entries.filter((entry) => entry.entry_type === "first_timer").length,
    newConverts: entries.filter((entry) => entry.entry_type === "new_convert").length,
    rededications: entries.filter((entry) => entry.entry_type === "rededication").length,
  }), [entries]);

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
                  <h4 className="mb-1">Member Report</h4>
                  <p className="text-secondary mb-0">Use real guest-entry records to review first timers, new converts, and re-dedications in one place.</p>
                </div>
                <Link className="btn btn-outline-primary" href="/add-member">
                  <i className="ti ti-user-plus me-1" />
                  Add Member
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Entries" value={stats.total} valueClass="text-primary">
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="First Timers" value={stats.firstTimers} valueClass="text-success">
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="New Converts" value={stats.newConverts} valueClass="text-warning">
          Visible records
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Re-Dedications" value={stats.rededications} valueClass="text-info">
          Visible records
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Member Intake Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" onChange={(event) => setEntryType(event.target.value)} style={{ width: 170 }} value={entryType}>
                  <option value="">All Types</option>
                  <option value="first_timer">First Timers</option>
                  <option value="new_convert">New Converts</option>
                  <option value="rededication">Re-Dedications</option>
                </select>
                <BranchHierarchyFilter
                  branches={branches}
                  disabled={Boolean(activeBranchId)}
                  onChange={setBranchId}
                  value={branchId}
                />
                <input className="form-control form-control-sm" onChange={(event) => setDate(event.target.value)} style={{ width: 170 }} type="date" value={date} />
                <input
                  className="form-control form-control-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, phone..."
                  style={{ width: 220 }}
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
                      <th>Type</th>
                      <th>Name</th>
                      <th>Phone</th>
                      <th>Branch</th>
                      <th>Service Date</th>
                      <th>Invited By</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={7}>No member entries found for the current filters.</td>
                      </tr>
                    ) : entries.map((entry) => {
                      const branchLabel = entry.branch?.name || `${session.church?.name || "Main Church"} (Main Church)`;
                      const recorderName = resolveRecordedBy(entry);

                      return (
                        <tr key={entry.id}>
                          <td><span className="badge text-light-primary">{entryTypeLabel(entry.entry_type)}</span></td>
                          <td>
                            <strong>{entry.full_name || "--"}</strong>
                            <div className="small text-secondary">{entry.email || "--"}</div>
                          </td>
                          <td>{entry.phone || "--"}</td>
                          <td>{branchLabel}</td>
                          <td>{formatDate(entry.service_date)}</td>
                          <td>{entry.invited_by || "--"}</td>
                          <td>{recorderName}</td>
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

function entryTypeLabel(value?: string | null) {
  return {
    first_timer: "First Timer",
    new_convert: "New Convert",
    rededication: "Re-Dedication",
  }[value || ""] || "Entry";
}

function resolveRecordedBy(entry: GuestResponseEntryRecord) {
  const name = entry.recorded_by?.name || "";
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
