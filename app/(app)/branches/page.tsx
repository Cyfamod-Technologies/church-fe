"use client";

import { useMemo, useState } from "react";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel } from "@/lib/format";
import { useChurchSetupData } from "@/components/church-setup/use-church-setup-data";

export default function BranchesRoute() {
  const session = useSessionContext();
  const { branches, branchStats, error } = useChurchSetupData(session);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const tagOptions = useMemo(
    () => Array.from(
      new Set(
        branches
          .map((branch) => branch.tag?.name)
          .filter((tag): tag is string => Boolean(tag)),
      ),
    ),
    [branches],
  );

  const filteredBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const matchesTag = !tagFilter || branch.tag?.name === tagFilter;
      const matchesSearch = !normalizedSearch || [
        branch.name,
        branch.city,
        branch.state,
        branch.district_area,
        branch.pastor_name,
        branch.local_admin?.name,
        branch.current_parent?.name,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));

      return matchesTag && matchesSearch;
    });
  }, [branches, search, tagFilter]);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Church Branches</h4>
                  <p className="text-secondary mb-0">
                    Branch registry, hierarchy, tags, and reassignment visibility, separated from profile and schedule.
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <a className="btn btn-primary disabled" aria-disabled="true" href="#add-branch">Add Branch</a>
                  <a className="btn btn-outline-secondary disabled" aria-disabled="true" href="#manage-tags">Manage Tags</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${error ? "" : "d-none"}`}>{error}</div>
        </div>

        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-primary">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Total Branches</p>
              <h3 className="text-primary mb-0">{branchStats?.total_branches ?? 0}</h3>
              <span className="badge text-light-primary mt-2">Created by your church</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-success">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Direct Branches</p>
              <h3 className="text-success mb-0">{branchStats?.direct_branches ?? 0}</h3>
              <span className="badge text-light-success mt-2">Currently under your church</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card overview-details-box b-s-3-warning">
            <div className="card-body">
              <p className="text-dark f-w-600 mb-1">Sub-Branches</p>
              <h3 className="text-warning mb-0">{branchStats?.sub_branches ?? 0}</h3>
              <span className="badge text-light-warning mt-2">Currently under another branch</span>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Branch Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select form-select-sm"
                  onChange={(event) => setTagFilter(event.target.value)}
                  style={{ width: 220 }}
                  value={tagFilter}
                >
                  <option value="">All Tags</option>
                  {tagOptions.map((tag) => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
                <input
                  className="form-control form-control-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search branches..."
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
                      <th>Branch Name</th>
                      <th>Tag</th>
                      <th>Assigned Under</th>
                      <th>Created By</th>
                      <th>Last Reassigned</th>
                      <th>Pastor in Charge</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBranches.length > 0 ? (
                      filteredBranches.map((branch) => (
                        <tr key={branch.id}>
                          <td>{branch.name}</td>
                          <td>{branch.tag?.name || "--"}</td>
                          <td>{branch.current_parent?.name || "--"}</td>
                          <td>{branch.creator_church?.name || branch.creator_user?.name || "--"}</td>
                          <td>{branch.last_assignment?.user?.name || branch.last_assignment?.church?.name || "--"}</td>
                          <td>{branch.pastor_name || branch.local_admin?.name || "--"}</td>
                          <td>{[branch.city, branch.district_area, branch.state].filter(Boolean).join(", ") || "--"}</td>
                          <td>{formatLabel(branch.status)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={8}>No branches found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="alert alert-info mb-0">
            <strong>How it works:</strong> A branch is first created under the church that created it, can later be reassigned, and the system keeps creator and reassignment visibility.
          </div>
        </div>
      </div>
    </div>
  );
}
