"use client";

import { usePathname } from "next/navigation";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel } from "@/lib/format";

export default function AdministrationRoute() {
  const session = useSessionContext();
  const pathname = usePathname();
  const pageTitle = pathname === "/users" ? "Users" : "Administration";

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="mb-1">{pageTitle}</h4>
              <p className="text-secondary mb-0">Current workspace user context from the active session.</p>
            </div>
          </div>
        </div>
        <div className="col-md-4"><div className="card overview-details-box b-s-3-primary"><div className="card-body"><p className="text-dark f-w-600 mb-1">Current User</p><h4 className="text-primary mb-0">{session.user?.name || "--"}</h4><span className="badge text-light-primary mt-2">{formatLabel(session.user?.role)}</span></div></div></div>
        <div className="col-md-4"><div className="card overview-details-box b-s-3-success"><div className="card-body"><p className="text-dark f-w-600 mb-1">Church</p><h4 className="text-success mb-0">{session.church?.name || "--"}</h4><span className="badge text-light-success mt-2">{session.church?.code || "--"}</span></div></div></div>
        <div className="col-md-4"><div className="card overview-details-box b-s-3-warning"><div className="card-body"><p className="text-dark f-w-600 mb-1">Branch Scope</p><h4 className="text-warning mb-0">{session.branch?.name || "Main Church"}</h4><span className="badge text-light-warning mt-2">{formatLabel(session.branch?.status || "active")}</span></div></div></div>
      </div>
    </div>
  );
}
