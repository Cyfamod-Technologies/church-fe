"use client";

import Link from "next/link";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel } from "@/lib/format";
import { useChurchSetupData } from "@/components/church-setup/use-church-setup-data";

export default function ChurchSetupRoute() {
  const session = useSessionContext();
  const { church, branchStats, serviceSchedules, error } = useChurchSetupData(session);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Church Setup</h4>
                  <p className="text-secondary mb-0">
                    Open the specific setup page you want to work on, just like the HTML structure.
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-primary" href="/church-profile">Church Profile</Link>
                  <Link className="btn btn-outline-secondary" href="/service-schedule">Service Schedule</Link>
                  <Link className="btn btn-light-primary" href="/branches">Branches</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${error ? "" : "d-none"}`}>{error}</div>
        </div>

        <div className="col-md-4">
          <Link className="text-decoration-none" href="/church-profile">
            <div className="card overview-details-box b-s-3-primary">
              <div className="card-body">
                <p className="text-dark f-w-600 mb-1">Church Profile</p>
                <h4 className="text-primary mb-0">{church?.name || "--"}</h4>
                <span className="badge text-light-primary mt-2">
                  {formatLabel(church?.status) || "Profile details"}
                </span>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link className="text-decoration-none" href="/service-schedule">
            <div className="card overview-details-box b-s-3-success">
              <div className="card-body">
                <p className="text-dark f-w-600 mb-1">Service Schedule</p>
                <h4 className="text-success mb-0">{serviceSchedules.length}</h4>
                <span className="badge text-light-success mt-2">Configured services</span>
              </div>
            </div>
          </Link>
        </div>
        <div className="col-md-4">
          <Link className="text-decoration-none" href="/branches">
            <div className="card overview-details-box b-s-3-warning">
              <div className="card-body">
                <p className="text-dark f-w-600 mb-1">Branches</p>
                <h4 className="text-warning mb-0">{branchStats?.total_branches ?? 0}</h4>
                <span className="badge text-light-warning mt-2">Branch registry</span>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
