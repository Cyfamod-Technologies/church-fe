"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate, formatLabel } from "@/lib/format";
import { useChurchSetupData } from "@/components/church-setup/use-church-setup-data";

export default function ChurchProfileRoute() {
  const session = useSessionContext();
  const searchParams = useSearchParams();
  const { church, branch, error } = useChurchSetupData(session);
  const workspaceTitle = branch ? "Branch Profile" : "Church Profile";
  const workspaceLabel = branch ? "Branch" : "Church";
  const workspace = branch || church;
  const primaryAdmin = branch?.local_admin || church?.users?.find((user) => user.role === "church_admin") || church?.users?.[0] || null;
  const updated = searchParams.get("updated") === "1";

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">{workspaceTitle}</h4>
                  <p className="text-secondary mb-0">
                    {branch
                      ? "Profile details for this branch workspace, separated from the branch service schedule."
                      : "Everything captured during registration, separated from the service schedule and branches pages."}
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-primary" href="/church-profile-edit">
                    <i className="ti ti-edit me-1" />
                    Edit Profile
                  </Link>
                  <Link className="btn btn-outline-secondary" href="/service-schedule">Service Schedule</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${updated ? "" : "d-none"}`}>{workspaceLabel} profile updated successfully.</div>
          <div className={`alert alert-danger ${error ? "" : "d-none"}`}>{error}</div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{workspaceLabel} Information</h5>
              <div className="d-flex gap-2 flex-wrap">
                <span className="badge bg-light-primary">{formatLabel(workspace?.status) || "Loading..."}</span>
                <span className="badge bg-light-secondary">
                  Created: {formatDate(workspace?.created_at)}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <InfoCard label={`${workspaceLabel} Name`} value={workspace?.name} />
                <InfoCard label={`${workspaceLabel} Code`} value={workspace?.code} />
                <InfoCard label="State" value={workspace?.state} smallCol />
                <InfoCard label="City" value={workspace?.city} smallCol />
                <InfoCard label="LGA / District Area" value={workspace?.district_area} smallCol />
                <InfoCard label="Address" value={workspace?.address} full />
                <InfoCard label="Email" value={workspace?.email} />
                <InfoCard label="Phone" value={workspace?.phone} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Pastor In Charge</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <InfoCard label="Full Name" value={workspace?.pastor_name} smallCol />
                <InfoCard label="Phone" value={workspace?.pastor_phone} smallCol />
                <InfoCard label="Email" value={workspace?.pastor_email} smallCol />
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Primary Admin</h5>
            </div>
            <div className="card-body">
              <SideCard label="Full Name" value={primaryAdmin?.name} />
              <SideCard label="Email" value={primaryAdmin?.email} />
              <SideCard label="Phone" value={primaryAdmin?.phone} last />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Settings</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center border rounded p-3 mb-3">
                <span>Finance Tracking</span>
                <span className={`badge ${workspace?.finance_enabled ? "bg-light-success text-success" : "bg-light-danger text-danger"}`}>
                  {workspace?.finance_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center border rounded p-3">
                <span>Special Services</span>
                <span className={`badge ${workspace?.special_services_enabled ? "bg-light-success text-success" : "bg-light-danger text-danger"}`}>
                  {workspace?.special_services_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  full = false,
  smallCol = false,
}: {
  label: string;
  value?: string | null;
  full?: boolean;
  smallCol?: boolean;
}) {
  const columnClass = full ? "col-12" : smallCol ? "col-md-4" : "col-md-6";

  return (
    <div className={columnClass}>
      <div className="border rounded p-3 h-100">
        <span className="text-secondary small d-block mb-1">{label}</span>
        <strong>{value || "--"}</strong>
      </div>
    </div>
  );
}

function SideCard({
  label,
  value,
  last = false,
}: {
  label: string;
  value?: string | null;
  last?: boolean;
}) {
  return (
    <div className={`border rounded p-3 ${last ? "" : "mb-3"}`}>
      <span className="text-secondary small d-block mb-1">{label}</span>
      <strong>{value || "--"}</strong>
    </div>
  );
}
