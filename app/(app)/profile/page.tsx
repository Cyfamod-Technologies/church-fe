"use client";

import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel } from "@/lib/format";
import { isHomecellLeaderSession } from "@/lib/session";

export default function ProfileRoute() {
  const session = useSessionContext();
  const isLeader = isHomecellLeaderSession(session);

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="mb-1">{isLeader ? "My Profile" : "Profile"}</h4>
              <p className="text-secondary mb-0">Current signed-in user details from the active workspace session.</p>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Account</h5></div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Name</span><strong>{session.user?.name || session.homecell_leader?.name || "--"}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Email</span><strong>{session.user?.email || session.homecell_leader?.email || "--"}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Phone</span><strong>{session.user?.phone || session.homecell_leader?.phone || "--"}</strong></div>
              <div className="border rounded p-3"><span className="text-secondary small d-block mb-1">Role</span><strong>{formatLabel(session.user?.role)}</strong></div>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Workspace</h5></div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Church</span><strong>{session.church?.name || "--"}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Branch</span><strong>{session.branch?.name || "Main Church"}</strong></div>
              <div className="border rounded p-3"><span className="text-secondary small d-block mb-1">Homecell</span><strong>{session.homecell?.name || "--"}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
