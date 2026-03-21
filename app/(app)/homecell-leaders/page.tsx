"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TemplateLoader } from "@/components/ui/template-loader";
import { ModalShell } from "@/components/ui/modal-shell";
import { useSessionContext } from "@/components/providers/auth-guard";
import { isHomecellLeaderSession } from "@/lib/session";
import { flattenHomecellLeaders, type FlattenedHomecellLeader } from "@/lib/homecell-utils";
import {
  fetchBranches,
  fetchHomecells,
  getBranchId,
  getChurchId,
  updateHomecell,
} from "@/lib/workspace-api";
import type { BranchRecord, HomecellLeaderRecord, HomecellRecord } from "@/types/api";

interface LeaderFormState {
  leader_id: number | null;
  user_id: number | null;
  source_homecell_id: number | null;
  homecell_id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  password: string;
  is_primary: boolean;
}

const emptyForm = (): LeaderFormState => ({
  leader_id: null,
  user_id: null,
  source_homecell_id: null,
  homecell_id: "",
  name: "",
  role: "Leader",
  phone: "",
  email: "",
  password: "",
  is_primary: false,
});

export default function HomecellLeadersRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const isHomecellLeader = isHomecellLeaderSession(session);
  const activeHomecellId = session.homecell?.id ? Number(session.homecell.id) : null;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : "");
  const [homecellFilter, setHomecellFilter] = useState(activeHomecellId ? String(activeHomecellId) : "");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMenuKey, setActionMenuKey] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<LeaderFormState>(emptyForm);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [branchesResponse, homecellsResponse] = await Promise.all([
          branchId ? Promise.resolve({ data: session.branch ? [session.branch as BranchRecord] : [] }) : fetchBranches(churchId),
          fetchHomecells(churchId, branchId),
        ]);

        if (!active) {
          return;
        }

        setBranches(branchesResponse.data || []);
        setHomecells(homecellsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell leaders.");
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
  }, [branchId, churchId, session.branch]);

  const filteredHomecells = useMemo(() => {
    const selectedBranchId = Number(branchFilter || 0) || null;

    return homecells.filter((homecell) => !selectedBranchId || homecell.branch?.id === selectedBranchId);
  }, [branchFilter, homecells]);

  const visibleLeaders = useMemo(() => {
    const selectedHomecellId = Number(homecellFilter || 0) || null;
    const normalizedSearch = search.trim().toLowerCase();

    return flattenHomecellLeaders(filteredHomecells).filter((leader) => {
      const homecellMatches = !selectedHomecellId || leader.homecell_id === selectedHomecellId;
      const searchMatches = !normalizedSearch || [
        leader.name,
        leader.role,
        leader.homecell_name,
        leader.branch_name,
        leader.phone,
        leader.email,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));

      return homecellMatches && searchMatches;
    });
  }, [filteredHomecells, homecellFilter, search]);

  const stats = useMemo(() => ({
    total: visibleLeaders.length,
    primary: visibleLeaders.filter((leader) => Boolean(leader.is_primary)).length,
    coveredHomecells: filteredHomecells.filter((homecell) => Boolean(homecell.leaders?.length)).length,
  }), [filteredHomecells, visibleLeaders]);

  function resetAlerts() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function refreshHomecells() {
    const response = await fetchHomecells(churchId, branchId);
    setHomecells(response.data || []);
  }

  function openCreateModal() {
    resetAlerts();
    setForm({
      ...emptyForm(),
      homecell_id: homecellFilter || (activeHomecellId ? String(activeHomecellId) : ""),
    });
    setIsFormOpen(true);
  }

  function openEditModal(leader: FlattenedHomecellLeader) {
    resetAlerts();
    setForm({
      leader_id: leader.id,
      user_id: leader.user_id || null,
      source_homecell_id: leader.homecell_id,
      homecell_id: String(leader.homecell_id),
      name: leader.name || "",
      role: leader.role || "Leader",
      phone: leader.phone || "",
      email: leader.email || "",
      password: "",
      is_primary: Boolean(leader.is_primary),
    });
    setIsFormOpen(true);
  }

  function buildLeaderPayload(leader: HomecellLeaderRecord, overrides?: Partial<LeaderFormState>) {
    return {
      id: overrides?.leader_id ?? leader.id,
      user_id: overrides?.user_id ?? leader.user_id ?? null,
      name: overrides?.name ?? leader.name ?? "",
      role: overrides?.role ?? leader.role ?? "Leader",
      phone: overrides?.phone ?? leader.phone ?? null,
      email: overrides?.email ?? leader.email ?? null,
      password: overrides?.password || null,
      is_primary: overrides?.is_primary ?? Boolean(leader.is_primary),
    };
  }

  async function saveHomecellLeaders(homecell: HomecellRecord, nextLeaders: Array<Record<string, unknown>>) {
    await updateHomecell(homecell.id, {
      branch_id: homecell.branch?.id || null,
      name: homecell.name,
      code: homecell.code || null,
      meeting_day: homecell.meeting_day || null,
      meeting_time: homecell.meeting_time ? homecell.meeting_time.slice(0, 5) : null,
      host_name: homecell.host_name || null,
      host_phone: homecell.host_phone || null,
      city_area: homecell.city_area || null,
      address: homecell.address || null,
      notes: homecell.notes || null,
      status: homecell.status || "active",
      leaders: normalizeLeadersForSave(nextLeaders),
    });
  }

  async function handleSaveLeader() {
    resetAlerts();

    if (!form.homecell_id) {
      setErrorMessage("Select a homecell first.");
      return;
    }

    if (!form.name.trim()) {
      setErrorMessage("Leader name is required.");
      return;
    }

    setIsSaving(true);

    try {
      const targetHomecell = homecells.find((homecell) => homecell.id === Number(form.homecell_id));

      if (!targetHomecell) {
        throw new Error("Selected homecell was not found.");
      }

      const nextLeader = {
        id: form.leader_id,
        user_id: form.user_id || null,
        name: form.name.trim(),
        role: form.role.trim() || "Leader",
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        password: form.password || null,
        is_primary: form.is_primary,
      };

      if (!form.leader_id) {
        await saveHomecellLeaders(targetHomecell, [
          ...(targetHomecell.leaders || []).map((leader) => buildLeaderPayload(leader, {
            is_primary: form.is_primary ? false : Boolean(leader.is_primary),
          })),
          nextLeader,
        ]);
      } else {
        const sourceHomecell = homecells.find((homecell) => homecell.id === form.source_homecell_id);

        if (!sourceHomecell) {
          throw new Error("Source homecell was not found.");
        }

        if (sourceHomecell.id === targetHomecell.id) {
          await saveHomecellLeaders(targetHomecell, (targetHomecell.leaders || []).map((leader) => (
            leader.id === form.leader_id
              ? nextLeader
              : buildLeaderPayload(leader, { is_primary: form.is_primary ? false : Boolean(leader.is_primary) })
          )));
        } else {
          await saveHomecellLeaders(sourceHomecell, (sourceHomecell.leaders || [])
            .filter((leader) => leader.id !== form.leader_id)
            .map((leader) => buildLeaderPayload(leader)));

          await saveHomecellLeaders(targetHomecell, [
            ...(targetHomecell.leaders || []).map((leader) => buildLeaderPayload(leader, {
              is_primary: form.is_primary ? false : Boolean(leader.is_primary),
            })),
            nextLeader,
          ]);
        }
      }

      await refreshHomecells();
      setIsFormOpen(false);
      setSuccessMessage(form.leader_id ? "Homecell leader updated successfully." : "Homecell leader assigned successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to save the leader assignment.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveLeader(leader: FlattenedHomecellLeader) {
    resetAlerts();

    if (!window.confirm(`Remove ${leader.name || "this leader"} from ${leader.homecell_name}?`)) {
      return;
    }

    const homecell = homecells.find((entry) => entry.id === leader.homecell_id);

    if (!homecell) {
      setErrorMessage("Homecell not found.");
      return;
    }

    try {
      await saveHomecellLeaders(homecell, (homecell.leaders || [])
        .filter((entry) => entry.id !== leader.id)
        .map((entry) => buildLeaderPayload(entry)));
      await refreshHomecells();
      setSuccessMessage("Homecell leader removed successfully.");
      setActionMenuKey(null);
    } catch (removeError) {
      setErrorMessage(removeError instanceof Error ? removeError.message : "Unable to remove the leader.");
    }
  }

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
                  <h4 className="mb-1">Homecell Leaders</h4>
                  <p className="text-secondary mb-0">Assign leaders to homecells, move them between homecells, and enable login for the leaders who should submit attendance.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-outline-secondary" href="/homecells">
                    <i className="ti ti-home me-1" />
                    Manage Homecells
                  </Link>
                  {!isHomecellLeader ? (
                    <button className="btn btn-primary" onClick={openCreateModal} type="button">
                      <i className="ti ti-user-plus me-1" />
                      Assign Leader
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Leaders" value={stats.total} valueClass="text-primary">
          In the current view
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Primary Leaders" value={stats.primary} valueClass="text-success">
          Marked as primary
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Covered Homecells" value={stats.coveredHomecells} valueClass="text-warning">
          Homecells with leaders
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Leader Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(branchId)}
                  onChange={(event) => {
                    setBranchFilter(event.target.value);
                    if (!event.target.value) {
                      setHomecellFilter(activeHomecellId ? String(activeHomecellId) : "");
                    }
                  }}
                  style={{ width: 200 }}
                  value={branchFilter}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(activeHomecellId)}
                  onChange={(event) => setHomecellFilter(event.target.value)}
                  style={{ width: 220 }}
                  value={homecellFilter}
                >
                  <option value="">All Homecells</option>
                  {filteredHomecells.map((homecell) => (
                    <option key={homecell.id} value={homecell.id}>
                      {homecell.name}{homecell.branch?.name ? ` - ${homecell.branch.name}` : ""}
                    </option>
                  ))}
                </select>
                <input
                  className="form-control form-control-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leaders..."
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
                      <th>Leader</th>
                      <th>Role</th>
                      <th>Homecell</th>
                      <th>Branch</th>
                      <th>Contact</th>
                      <th>Primary</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleLeaders.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={7}>No homecell leaders found for the current filters.</td>
                      </tr>
                    ) : visibleLeaders.map((leader) => {
                      const actionKey = `${leader.homecell_id}-${leader.id}`;

                      return (
                        <tr key={actionKey}>
                          <td><strong>{leader.name || "--"}</strong></td>
                          <td>{leader.role || "Leader"}</td>
                          <td>{leader.homecell_name}</td>
                          <td>{leader.branch_name || <span className="text-muted">Unassigned</span>}</td>
                          <td>
                            <span className="small d-block">{[leader.phone, leader.email].filter(Boolean).join(" / ") || "--"}</span>
                            <span className={`badge ${leader.can_login ? "bg-light-success text-success" : "bg-light-secondary text-secondary"} mt-1`}>
                              {leader.can_login ? "Login Enabled" : "No Login"}
                            </span>
                          </td>
                          <td>{leader.is_primary ? <span className="badge bg-light-success text-success">Primary</span> : <span className="text-muted">No</span>}</td>
                          <td>
                            <div className="dropdown position-relative">
                              <button
                                className="btn btn-sm btn-light-secondary dropdown-toggle"
                                onClick={() => setActionMenuKey((current) => current === actionKey ? null : actionKey)}
                                type="button"
                              >
                                Actions
                              </button>
                              <ul className={`dropdown-menu ${actionMenuKey === actionKey ? "show" : ""}`} style={{ right: 0, left: "auto" }}>
                                {!isHomecellLeader ? (
                                  <>
                                    <li>
                                      <button className="dropdown-item" onClick={() => openEditModal(leader)} type="button">
                                        <i className="ti ti-edit me-2" />
                                        Edit
                                      </button>
                                    </li>
                                    <li>
                                      <button className="dropdown-item text-danger" onClick={() => void handleRemoveLeader(leader)} type="button">
                                        <i className="ti ti-trash me-2" />
                                        Remove
                                      </button>
                                    </li>
                                  </>
                                ) : null}
                                <li>
                                  <button className="dropdown-item" onClick={() => router.push("/homecells")} type="button">
                                    <i className="ti ti-home me-2" />
                                    Open Homecell
                                  </button>
                                </li>
                              </ul>
                            </div>
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

        {isFormOpen ? (
          <ModalShell
            footer={(
              <>
                <button className="btn btn-secondary" onClick={() => setIsFormOpen(false)} type="button">
                  Cancel
                </button>
                <button className="btn btn-primary" disabled={isSaving} onClick={() => void handleSaveLeader()} type="button">
                  <i className={`ti ${isSaving ? "ti-loader" : "ti-device-floppy"} me-1`} />
                  {form.leader_id ? (isSaving ? "Updating..." : "Update Leader") : (isSaving ? "Saving..." : "Save Leader")}
                </button>
              </>
            )}
            onClose={() => setIsFormOpen(false)}
            title={form.leader_id ? "Edit Homecell Leader" : "Assign Homecell Leader"}
          >
            <div className="row">
              <div className="col-12">
                <div className="mb-3">
                  <label className="form-label" htmlFor="leaderHomecellInput">Homecell</label>
                  <select
                    className="form-select"
                    disabled={Boolean(activeHomecellId)}
                    id="leaderHomecellInput"
                    onChange={(event) => setForm((current) => ({ ...current, homecell_id: event.target.value }))}
                    value={form.homecell_id}
                  >
                    <option value="">Select homecell</option>
                    {filteredHomecells.map((homecell) => (
                      <option key={homecell.id} value={homecell.id}>
                        {homecell.name}{homecell.branch?.name ? ` - ${homecell.branch.name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Field label="Leader Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
              <Field label="Role" value={form.role} onChange={(value) => setForm((current) => ({ ...current, role: value }))} />
              <Field label="Phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} />
              <Field label="Email" type="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} />
              <Field
                helpText={form.leader_id ? "Leave blank to keep the existing password." : "Set a password if this leader should log in directly."}
                label="Login Password"
                type="password"
                value={form.password}
                onChange={(value) => setForm((current) => ({ ...current, password: value }))}
              />
              <div className="col-12">
                <div className="form-check">
                  <input
                    checked={form.is_primary}
                    className="form-check-input"
                    id="leaderPrimaryInput"
                    onChange={(event) => setForm((current) => ({ ...current, is_primary: event.target.checked }))}
                    type="checkbox"
                  />
                  <label className="form-check-label" htmlFor="leaderPrimaryInput">Primary leader for this homecell</label>
                </div>
              </div>
            </div>
          </ModalShell>
        ) : null}
      </div>
    </div>
  );
}

function normalizeLeadersForSave(leaders: Array<Record<string, unknown>>) {
  let primaryAssigned = false;

  return leaders
    .filter((leader) => leader.name || leader.phone || leader.email)
    .map((leader, index) => {
      const nextLeader = {
        id: leader.id || null,
        user_id: leader.user_id || null,
        name: leader.name,
        role: leader.role || "Leader",
        phone: leader.phone || null,
        email: leader.email || null,
        password: leader.password || null,
        is_primary: Boolean(leader.is_primary) && !primaryAssigned,
      };

      if (nextLeader.is_primary) {
        primaryAssigned = true;
      }

      if (!primaryAssigned && index === 0) {
        nextLeader.is_primary = true;
        primaryAssigned = true;
      }

      return nextLeader;
    });
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
    <div className="col-md-4">
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

function Field({
  label,
  value,
  onChange,
  helpText,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  type?: string;
}) {
  return (
    <div className="col-md-6">
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input className="form-control" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
        {helpText ? <small className="text-muted">{helpText}</small> : null}
      </div>
    </div>
  );
}
