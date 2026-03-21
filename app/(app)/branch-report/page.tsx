"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import {
  fetchBranches,
  fetchBranchTags,
  getChurchId,
} from "@/lib/workspace-api";
import type { BranchRecord, BranchStats, BranchTagRecord } from "@/types/api";

export default function BranchReportRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchTags, setBranchTags] = useState<BranchTagRecord[]>([]);
  const [tagFilter, setTagFilter] = useState("");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [tagsResponse, branchesResponse] = await Promise.all([
          fetchBranchTags(churchId),
          fetchBranches(churchId),
        ]);

        if (!active) {
          return;
        }

        setBranchTags(tagsResponse.data || []);
        setBranches(branchesResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the branch report right now.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [churchId]);

  const visibleBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const tagMatches = !tagFilter || (branch.tag?.slug || String(branch.tag?.id || "")) === tagFilter;
      const searchMatches = !normalizedSearch || [
        branch.name,
        branch.city,
        branch.pastor_name,
        branch.current_parent?.name,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));

      return tagMatches && searchMatches;
    });
  }, [branches, search, tagFilter]);

  const stats = useMemo<BranchStats>(() => ({
    total_branches: visibleBranches.length,
    direct_branches: visibleBranches.filter((branch) => branch.current_parent?.type === "church" || branch.current_parent == null).length,
    sub_branches: visibleBranches.filter((branch) => branch.current_parent?.type === "branch").length,
  }), [visibleBranches]);

  const activeCount = useMemo(() => (
    visibleBranches.filter((branch) => String(branch.status || "").toLowerCase() === "active").length
  ), [visibleBranches]);

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
                  <h4 className="mb-1">Branch Report</h4>
                  <p className="text-secondary mb-0">See how many branches your church has created, how many are still directly under the church, and how many are now under other branches.</p>
                </div>
                <Link className="btn btn-outline-primary" href="/branches">
                  <i className="ti ti-building-arch me-1" />
                  Manage Branches
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Branches" value={stats?.total_branches ?? 0} valueClass="text-primary">
          Created by your church
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Direct Branches" value={stats?.direct_branches ?? 0} valueClass="text-success">
          Currently under your church
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Sub-Branches" value={stats?.sub_branches ?? 0} valueClass="text-warning">
          Currently under another branch
        </StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Active Branches" value={activeCount} valueClass="text-info">
          Registry status
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Branch Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" onChange={(event) => setTagFilter(event.target.value)} style={{ width: 180 }} value={tagFilter}>
                  <option value="">All Tags</option>
                  {branchTags.map((tag) => (
                    <option key={tag.id} value={tag.slug || String(tag.id)}>
                      {tag.name}
                    </option>
                  ))}
                </select>
                <input
                  className="form-control form-control-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search branch, city, pastor..."
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
                      <th>Branch</th>
                      <th>Tag</th>
                      <th>Current Parent</th>
                      <th>Lead</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleBranches.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={5}>No branches found for the current filters.</td>
                      </tr>
                    ) : visibleBranches.map((branch) => {
                      const currentParent = branch.current_parent?.name || `${session.church?.name || "Main Church"} (Main Church)`;
                      const leadName = branch.local_admin?.name || branch.pastor_name || "--";

                      return (
                        <tr key={branch.id}>
                          <td>
                            <strong>{branch.name}</strong>
                            <div className="small text-secondary">{branch.code || "--"}</div>
                          </td>
                          <td>{branch.tag?.name || "--"}</td>
                          <td>{currentParent}</td>
                          <td>{leadName}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(branch.status)}`}>
                              {branch.status || "unknown"}
                            </span>
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

function getStatusBadgeClass(status?: string | null) {
  return String(status || "").toLowerCase() === "active"
    ? "text-light-success"
    : "text-light-warning";
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
