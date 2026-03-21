"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { ModalShell } from "@/components/ui/modal-shell";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatTime } from "@/lib/format";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  createHomecell,
  fetchBranches,
  fetchChurch,
  fetchHomecell,
  fetchHomecells,
  getBranchId,
  getChurchId,
  updateHomecell,
  updateHomecellSchedule,
} from "@/lib/workspace-api";
import type { BranchRecord, ChurchApiRecord, HomecellLeaderRecord, HomecellRecord } from "@/types/api";

interface HomecellLeaderFormState {
  id: number | null;
  user_id: number | null;
  name: string;
  role: string;
  phone: string;
  email: string;
  is_primary: boolean;
}

interface HomecellFormState {
  id: string;
  name: string;
  code: string;
  branch_id: string;
  status: string;
  meeting_day: string;
  meeting_time: string;
  host_name: string;
  host_phone: string;
  city_area: string;
  address: string;
  notes: string;
  leaders: HomecellLeaderFormState[];
}

interface HomecellScheduleFormState {
  locked: boolean;
  default_day: string;
  default_time: string;
  monthly_dates: string[];
}

const DAY_OPTIONS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const emptyLeader = (): HomecellLeaderFormState => ({
  id: null,
  user_id: null,
  name: "",
  role: "Leader",
  phone: "",
  email: "",
  is_primary: false,
});

const emptyForm = (): HomecellFormState => ({
  id: "",
  name: "",
  code: "",
  branch_id: "",
  status: "active",
  meeting_day: "",
  meeting_time: "",
  host_name: "",
  host_phone: "",
  city_area: "",
  address: "",
  notes: "",
  leaders: [],
});

const emptyScheduleForm = (): HomecellScheduleFormState => ({
  locked: false,
  default_day: "",
  default_time: "",
  monthly_dates: [],
});

export default function HomecellsRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const isHomecellLeader = isHomecellLeaderSession(session);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : "");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const [scheduleForm, setScheduleForm] = useState<HomecellScheduleFormState>(emptyScheduleForm);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<HomecellFormState>(emptyForm);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState<HomecellRecord | null>(null);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [churchResponse, branchesResponse, homecellsResponse] = await Promise.all([
          fetchChurch(churchId),
          branchId ? Promise.resolve({ data: session.branch ? [session.branch as BranchRecord] : [] }) : fetchBranches(churchId),
          fetchHomecells(churchId, branchId),
        ]);

        if (!active) {
          return;
        }

        setScheduleForm(buildScheduleForm(churchResponse.data || null));
        setBranches(branchesResponse.data || []);
        setHomecells(homecellsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecells.");
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

  const visibleHomecells = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const selectedBranchId = Number(branchFilter || 0) || null;

    return homecells.filter((homecell) => {
      const branchMatches = !selectedBranchId || homecell.branch?.id === selectedBranchId;
      const searchMatches = !normalizedSearch || [
        homecell.name,
        homecell.branch?.name,
        homecell.city_area,
        homecell.host_name,
        formatLeaderSummary(homecell.leaders),
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));

      return branchMatches && searchMatches;
    });
  }, [branchFilter, homecells, search]);

  const stats = useMemo(() => ({
    total: visibleHomecells.length,
    assigned: visibleHomecells.filter((homecell) => Boolean(homecell.branch)).length,
    leaders: visibleHomecells.reduce((sum, homecell) => sum + (homecell.leaders?.length || 0), 0),
  }), [visibleHomecells]);

  const scheduleLocked = Boolean(scheduleForm.locked);

  function resetAlerts() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function refreshHomecells() {
    const response = await fetchHomecells(churchId, branchId);
    setHomecells(response.data || []);
  }

  async function refreshChurchAndHomecells() {
    const [churchResponse, homecellsResponse] = await Promise.all([
      fetchChurch(churchId),
      fetchHomecells(churchId, branchId),
    ]);

    setScheduleForm(buildScheduleForm(churchResponse.data || null));
    setHomecells(homecellsResponse.data || []);
  }

  function openCreateModal() {
    resetAlerts();
    setForm({
      ...emptyForm(),
      branch_id: branchId ? String(branchId) : "",
      meeting_day: scheduleLocked ? scheduleForm.default_day : "",
      meeting_time: scheduleLocked ? scheduleForm.default_time : "",
    });
    setIsFormOpen(true);
  }

  function openEditModal(homecell: HomecellRecord) {
    resetAlerts();
    setForm({
      id: String(homecell.id),
      name: homecell.name || "",
      code: homecell.code || "",
      branch_id: homecell.branch?.id ? String(homecell.branch.id) : "",
      status: homecell.status || "active",
      meeting_day: scheduleLocked ? scheduleForm.default_day : (homecell.meeting_day || ""),
      meeting_time: scheduleLocked ? scheduleForm.default_time : (homecell.meeting_time ? homecell.meeting_time.slice(0, 5) : ""),
      host_name: homecell.host_name || "",
      host_phone: homecell.host_phone || "",
      city_area: homecell.city_area || "",
      address: homecell.address || "",
      notes: homecell.notes || "",
      leaders: (homecell.leaders || []).map((leader) => ({
        id: leader.id,
        user_id: leader.user_id || null,
        name: leader.name || "",
        role: leader.role || "Leader",
        phone: leader.phone || "",
        email: leader.email || "",
        is_primary: Boolean(leader.is_primary),
      })),
    });
    setIsFormOpen(true);
  }

  async function openDetails(homecellId: number) {
    resetAlerts();
    setIsLoadingDetails(true);
    setIsDetailsOpen(true);

    try {
      const response = await fetchHomecell(homecellId);
      setSelectedDetails(response.data || null);
    } catch (loadError) {
      setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell details.");
      setSelectedDetails(null);
    } finally {
      setIsLoadingDetails(false);
      setActionMenuId(null);
    }
  }

  function updateForm<Key extends keyof HomecellFormState>(key: Key, value: HomecellFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateLeader(index: number, field: keyof HomecellLeaderFormState, value: string | boolean) {
    setForm((current) => ({
      ...current,
      leaders: current.leaders.map((leader, leaderIndex) => {
        if (leaderIndex !== index) {
          return leader;
        }

        return {
          ...leader,
          [field]: value,
        };
      }),
    }));
  }

  function togglePrimaryLeader(index: number, checked: boolean) {
    setForm((current) => ({
      ...current,
      leaders: current.leaders.map((leader, leaderIndex) => ({
        ...leader,
        is_primary: leaderIndex === index ? checked : (checked ? false : leader.is_primary),
      })),
    }));
  }

  function addLeaderRow() {
    setForm((current) => ({
      ...current,
      leaders: [...current.leaders, emptyLeader()],
    }));
  }

  function removeLeaderRow(index: number) {
    setForm((current) => ({
      ...current,
      leaders: current.leaders.filter((_, leaderIndex) => leaderIndex !== index),
    }));
  }

  function updateSchedule<Key extends keyof HomecellScheduleFormState>(key: Key, value: HomecellScheduleFormState[Key]) {
    setScheduleForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function addMonthlyDate() {
    setScheduleForm((current) => ({
      ...current,
      monthly_dates: [...current.monthly_dates, ""],
    }));
  }

  function updateMonthlyDate(index: number, value: string) {
    setScheduleForm((current) => ({
      ...current,
      monthly_dates: current.monthly_dates.map((entry, entryIndex) => entryIndex === index ? value : entry),
    }));
  }

  function removeMonthlyDate(index: number) {
    setScheduleForm((current) => ({
      ...current,
      monthly_dates: current.monthly_dates.filter((_, entryIndex) => entryIndex !== index),
    }));
  }

  async function handleScheduleSave() {
    resetAlerts();

    if (scheduleForm.locked && !scheduleForm.default_day) {
      setErrorMessage("Default meeting day is required when the schedule is locked.");
      return;
    }

    if (scheduleForm.locked && !scheduleForm.default_time) {
      setErrorMessage("Default meeting time is required when the schedule is locked.");
      return;
    }

    setIsSavingSchedule(true);

    try {
      const monthlyDates = Array.from(new Set(scheduleForm.monthly_dates.map((value) => value.trim()).filter(Boolean)));

      await updateHomecellSchedule(churchId, {
        homecell_schedule: {
          locked: scheduleForm.locked,
          default_day: scheduleForm.default_day || null,
          default_time: scheduleForm.default_time || null,
          monthly_dates: monthlyDates,
        },
      });

      await refreshChurchAndHomecells();
      setSuccessMessage("Homecell schedule updated successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to update the homecell schedule.");
    } finally {
      setIsSavingSchedule(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetAlerts();

    if (!form.name.trim()) {
      setErrorMessage("Homecell name is required.");
      return;
    }

    const leaders = form.leaders
      .map((leader, index) => ({
        ...leader,
        name: leader.name.trim(),
        role: leader.role.trim() || "Leader",
        phone: leader.phone.trim(),
        email: leader.email.trim(),
        is_primary: leader.is_primary || (!form.leaders.some((item) => item.is_primary) && index === 0),
      }))
      .filter((leader) => leader.name || leader.phone || leader.email);

    const invalidLeader = leaders.findIndex((leader) => !leader.name);

    if (invalidLeader >= 0) {
      setErrorMessage(`Leader ${invalidLeader + 1} name is required.`);
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        church_id: churchId,
        name: form.name.trim(),
        code: form.code.trim() || null,
        branch_id: Number(form.branch_id || 0) || null,
        status: form.status || "active",
        meeting_day: scheduleLocked ? (scheduleForm.default_day || null) : (form.meeting_day || null),
        meeting_time: scheduleLocked ? (scheduleForm.default_time || null) : (form.meeting_time || null),
        host_name: form.host_name.trim() || null,
        host_phone: form.host_phone.trim() || null,
        city_area: form.city_area.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        leaders: leaders.map((leader) => ({
          id: leader.id,
          user_id: leader.user_id,
          name: leader.name,
          role: leader.role,
          phone: leader.phone || null,
          email: leader.email || null,
          is_primary: Boolean(leader.is_primary),
        })),
      };

      if (form.id) {
        await updateHomecell(Number(form.id), payload);
        setSuccessMessage("Homecell updated successfully.");
      } else {
        await createHomecell(payload);
        setSuccessMessage("Homecell created successfully.");
      }

      await refreshHomecells();
      setIsFormOpen(false);
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to save homecell.");
    } finally {
      setIsSaving(false);
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
                  <h4 className="mb-1">Homecells</h4>
                  <p className="text-secondary mb-0">Create homecells, assign them to branches, and keep their meeting, host, and leader details organised.</p>
                </div>
                {!isHomecellLeader ? (
                  <button className="btn btn-primary" onClick={openCreateModal} type="button">
                    <i className="ti ti-plus me-1" />
                    Create Homecell
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        {!isHomecellLeader ? (
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <h5 className="mb-1">Global Homecell Schedule</h5>
                  <p className="text-secondary mb-0">Set one monthly meeting schedule for all homecells and lock it so individual cells cannot change it.</p>
                </div>
                <button className="btn btn-primary" disabled={isSavingSchedule} onClick={() => void handleScheduleSave()} type="button">
                  <i className={`ti ${isSavingSchedule ? "ti-loader" : "ti-device-floppy"} me-1`} />
                  {isSavingSchedule ? "Saving..." : "Save Schedule"}
                </button>
              </div>
              <div className="card-body">
                <div className="alert alert-info mb-3">
                  <i className="ti ti-lock me-2" />
                  {scheduleLocked
                    ? `The church-wide homecell schedule is locked. All homecells inherit ${scheduleForm.default_day || "--"} at ${scheduleForm.default_time ? formatTime(scheduleForm.default_time) : "--"}.`
                    : "Homecells can manage their own meeting day and time until you lock a church-wide schedule."}
                </div>
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="globalHomecellDay">Default Meeting Day</label>
                      <select
                        className="form-select"
                        id="globalHomecellDay"
                        onChange={(event) => updateSchedule("default_day", event.target.value)}
                        value={scheduleForm.default_day}
                      >
                        <option value="">Select day</option>
                        {DAY_OPTIONS.map((day) => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="globalHomecellTime">Default Meeting Time</label>
                      <input
                        className="form-control"
                        id="globalHomecellTime"
                        onChange={(event) => updateSchedule("default_time", event.target.value)}
                        type="time"
                        value={scheduleForm.default_time}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label d-block">&nbsp;</label>
                      <div className="form-check mt-2">
                        <input
                          checked={scheduleForm.locked}
                          className="form-check-input"
                          id="globalHomecellLocked"
                          onChange={(event) => updateSchedule("locked", event.target.checked)}
                          type="checkbox"
                        />
                        <label className="form-check-label" htmlFor="globalHomecellLocked">
                          Lock this schedule for all homecells
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                      <div>
                        <label className="form-label mb-0">Monthly Meeting Dates</label>
                        <p className="text-secondary small mb-0">Add the approved dates for this month. All homecells will follow these dates when the schedule is locked.</p>
                      </div>
                      <button className="btn btn-sm btn-light-primary" onClick={addMonthlyDate} type="button">
                        <i className="ti ti-plus me-1" />
                        Add Date
                      </button>
                    </div>
                    {scheduleForm.monthly_dates.length === 0 ? (
                      <div className="text-secondary">No monthly dates fixed yet.</div>
                    ) : (
                      <div className="d-grid gap-2">
                        {scheduleForm.monthly_dates.map((value, index) => (
                          <div className="d-flex align-items-center gap-2" key={`monthly-date-${index}`}>
                            <input
                              className="form-control"
                              onChange={(event) => updateMonthlyDate(index, event.target.value)}
                              type="date"
                              value={value}
                            />
                            <button className="btn btn-sm btn-link text-danger" onClick={() => removeMonthlyDate(index)} type="button">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Homecells" value={stats.total} valueClass="text-primary">
          In the current view
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Assigned To Branches" value={stats.assigned} valueClass="text-success">
          Linked to a branch
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Leaders Assigned" value={stats.leaders} valueClass="text-warning">
          Total assigned leaders
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Homecell Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(branchId)}
                  onChange={(event) => setBranchFilter(event.target.value)}
                  style={{ width: 220 }}
                  value={branchFilter}
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <input
                  className="form-control form-control-sm"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search homecells..."
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
                      <th>Homecell</th>
                      <th>Branch</th>
                      <th>Leaders</th>
                      <th>Meeting</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleHomecells.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={7}>No homecells found for the current filters.</td>
                      </tr>
                    ) : visibleHomecells.map((homecell) => (
                      <tr key={homecell.id}>
                        <td>
                          <strong>{homecell.name}</strong>
                          <div className="small text-secondary">{homecell.code || "--"}</div>
                        </td>
                        <td>{homecell.branch?.name || <span className="text-muted">Unassigned</span>}</td>
                        <td><span className="small">{formatLeaderSummary(homecell.leaders)}</span></td>
                        <td>{formatMeeting(homecell)}</td>
                        <td>{[homecell.city_area, homecell.address].filter(Boolean).join(" / ") || "--"}</td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(homecell.status)}`}>
                            {homecell.status || "active"}
                          </span>
                        </td>
                        <td>
                          <div className="dropdown position-relative">
                            <button
                              className="btn btn-sm btn-light-secondary dropdown-toggle"
                              onClick={() => setActionMenuId((current) => current === homecell.id ? null : homecell.id)}
                              type="button"
                            >
                              Actions
                            </button>
                            <ul className={`dropdown-menu ${actionMenuId === homecell.id ? "show" : ""}`} style={{ right: 0, left: "auto" }}>
                              <li>
                                <button className="dropdown-item" onClick={() => void openDetails(homecell.id)} type="button">
                                  <i className="ti ti-eye me-2" />
                                  View Details
                                </button>
                              </li>
                              {!isHomecellLeader ? (
                                <li>
                                  <button className="dropdown-item" onClick={() => openEditModal(homecell)} type="button">
                                    <i className="ti ti-edit me-2" />
                                    Edit
                                  </button>
                                </li>
                              ) : null}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    ))}
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
                <button className="btn btn-primary" disabled={isSaving} form="homecellForm" type="submit">
                  <i className={`ti ${isSaving ? "ti-loader" : "ti-device-floppy"} me-1`} />
                  {form.id ? (isSaving ? "Updating..." : "Update Homecell") : (isSaving ? "Saving..." : "Save Homecell")}
                </button>
              </>
            )}
            onClose={() => setIsFormOpen(false)}
            size="lg"
            title={form.id ? "Edit Homecell" : "Create Homecell"}
          >
            <form id="homecellForm" onSubmit={handleSubmit}>
              <div className="row">
                <Field className="col-md-6" label="Homecell Name *" value={form.name} onChange={(value) => updateForm("name", value)} />
                <Field className="col-md-6" helpText="Leave blank to auto-generate." label="Homecell Code" value={form.code} onChange={(value) => updateForm("code", value)} />
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="homecellBranchInput">Assign To Branch</label>
                    <select
                      className="form-select"
                      disabled={Boolean(branchId)}
                      id="homecellBranchInput"
                      onChange={(event) => updateForm("branch_id", event.target.value)}
                      value={form.branch_id}
                    >
                      <option value="">No branch assigned</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="homecellStatusInput">Status</label>
                    <select
                      className="form-select"
                      id="homecellStatusInput"
                      onChange={(event) => updateForm("status", event.target.value)}
                      value={form.status}
                    >
                      <option value="active">Active</option>
                      <option value="review">Review</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="homecellMeetingDayInput">Meeting Day</label>
                    <select
                      className="form-select"
                      disabled={scheduleLocked}
                      id="homecellMeetingDayInput"
                      onChange={(event) => updateForm("meeting_day", event.target.value)}
                      value={scheduleLocked ? scheduleForm.default_day : form.meeting_day}
                    >
                      <option value="">Select day</option>
                      {DAY_OPTIONS.map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                    {scheduleLocked ? <small className="text-muted">Inherited from the locked church-wide homecell schedule.</small> : null}
                  </div>
                </div>
                <Field
                  className="col-md-6"
                  helpText={scheduleLocked ? "Inherited from the locked church-wide homecell schedule." : undefined}
                  label="Meeting Time"
                  type="time"
                  value={scheduleLocked ? scheduleForm.default_time : form.meeting_time}
                  onChange={(value) => updateForm("meeting_time", value)}
                  disabled={scheduleLocked}
                />
                <Field className="col-md-6" label="Host Name" value={form.host_name} onChange={(value) => updateForm("host_name", value)} />
                <Field className="col-md-6" label="Host Phone" value={form.host_phone} onChange={(value) => updateForm("host_phone", value)} />
                <Field className="col-md-6" label="City / Area" value={form.city_area} onChange={(value) => updateForm("city_area", value)} />
                <Field className="col-md-6" label="Address" value={form.address} onChange={(value) => updateForm("address", value)} />
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="homecellNotesInput">Notes</label>
                    <textarea
                      className="form-control"
                      id="homecellNotesInput"
                      onChange={(event) => updateForm("notes", event.target.value)}
                      rows={3}
                      value={form.notes}
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="border rounded p-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="mb-1">Assigned Leaders</h6>
                        <p className="text-secondary small mb-0">Add the homecell leader team here. Use the leaders page for login enablement and re-assignment.</p>
                      </div>
                      <button className="btn btn-outline-primary btn-sm" onClick={addLeaderRow} type="button">
                        <i className="ti ti-plus me-1" />
                        Add Leader
                      </button>
                    </div>

                    {form.leaders.length === 0 ? (
                      <div className="text-secondary">No leaders added yet.</div>
                    ) : (
                      <div className="d-grid gap-3">
                        {form.leaders.map((leader, index) => (
                          <div className="border rounded p-3" key={`leader-${index}`}>
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <strong>Leader {index + 1}</strong>
                              <button className="btn btn-sm btn-link text-danger p-0" onClick={() => removeLeaderRow(index)} type="button">
                                Remove
                              </button>
                            </div>
                            <div className="row">
                              <Field className="col-md-6" label="Name" value={leader.name} onChange={(value) => updateLeader(index, "name", value)} />
                              <Field className="col-md-6" label="Role" value={leader.role} onChange={(value) => updateLeader(index, "role", value)} />
                              <Field className="col-md-6" label="Phone" value={leader.phone} onChange={(value) => updateLeader(index, "phone", value)} />
                              <Field className="col-md-6" label="Email" type="email" value={leader.email} onChange={(value) => updateLeader(index, "email", value)} />
                              <div className="col-12">
                                <div className="form-check">
                                  <input
                                    checked={leader.is_primary}
                                    className="form-check-input"
                                    id={`leaderPrimary${index}`}
                                    onChange={(event) => togglePrimaryLeader(index, event.target.checked)}
                                    type="checkbox"
                                  />
                                  <label className="form-check-label" htmlFor={`leaderPrimary${index}`}>Primary leader for this homecell</label>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </ModalShell>
        ) : null}

        {isDetailsOpen ? (
          <ModalShell
            footer={(
              <button className="btn btn-secondary" onClick={() => setIsDetailsOpen(false)} type="button">
                Close
              </button>
            )}
            onClose={() => setIsDetailsOpen(false)}
            size="lg"
            title="Homecell Details"
          >
            {isLoadingDetails ? (
              <div className="text-secondary">Loading homecell details...</div>
            ) : selectedDetails ? (
              <div className="row g-3">
                <DetailCard label="Homecell" value={selectedDetails.name} />
                <DetailCard label="Assigned Branch" value={selectedDetails.branch?.name || "Unassigned"} />
                <DetailCard label="Meeting" value={formatMeeting(selectedDetails)} />
                <DetailCard label="Host" value={[selectedDetails.host_name, selectedDetails.host_phone].filter(Boolean).join(" / ") || "--"} />
                <DetailCard label="Location" value={[selectedDetails.city_area, selectedDetails.address].filter(Boolean).join(" / ") || "--"} />
                <DetailCard label="Status" value={selectedDetails.status || "active"} />
                <DetailCard
                  full
                  label="Monthly Dates"
                  value={selectedDetails.schedule_config?.monthly_dates?.length
                    ? selectedDetails.schedule_config.monthly_dates.join(", ")
                    : "--"}
                />
                <div className="col-12">
                  <div className="border rounded p-3 h-100">
                    <span className="text-secondary small d-block mb-2">Leaders</span>
                    {(selectedDetails.leaders || []).length > 0 ? (
                      <div className="d-grid gap-2">
                        {selectedDetails.leaders?.map((leader) => (
                          <div className="border rounded p-2" key={leader.id}>
                            <strong>{leader.name || "--"}</strong>
                            <div className="small text-secondary">{[leader.role, leader.phone, leader.email].filter(Boolean).join(" / ") || "--"}</div>
                            {leader.is_primary ? <span className="badge bg-light-success text-success mt-2">Primary</span> : null}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-secondary">No leaders assigned yet.</div>
                    )}
                  </div>
                </div>
                {selectedDetails.notes ? <DetailCard full label="Notes" value={selectedDetails.notes} /> : null}
              </div>
            ) : (
              <div className="text-danger">Unable to load homecell details.</div>
            )}
          </ModalShell>
        ) : null}
      </div>
    </div>
  );
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
  className = "col-md-6",
  helpText,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  helpText?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input className="form-control" disabled={disabled} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
        {helpText ? <small className="text-muted">{helpText}</small> : null}
      </div>
    </div>
  );
}

function DetailCard({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-12" : "col-md-6"}>
      <div className="border rounded p-3 h-100">
        <span className="text-secondary small d-block mb-1">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function buildScheduleForm(church: ChurchApiRecord | null): HomecellScheduleFormState {
  return {
    locked: Boolean(church?.homecell_schedule_locked),
    default_day: church?.homecell_default_day || "",
    default_time: church?.homecell_default_time ? church.homecell_default_time.slice(0, 5) : "",
    monthly_dates: Array.isArray(church?.homecell_monthly_dates) ? church.homecell_monthly_dates : [],
  };
}

function formatMeeting(homecell: HomecellRecord) {
  if (!homecell.meeting_day && !homecell.meeting_time) {
    return "--";
  }

  return [
    homecell.meeting_day,
    homecell.meeting_time ? formatTime(homecell.meeting_time) : null,
    homecell.schedule_config?.locked ? "Locked" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatLeaderSummary(leaders?: HomecellLeaderRecord[]) {
  if (!leaders || leaders.length === 0) {
    return "No leaders assigned";
  }

  return leaders
    .map((leader) => `${leader.name || "--"}${leader.role ? ` (${leader.role})` : ""}`)
    .join(", ");
}

function getStatusBadgeClass(status?: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "active") {
    return "bg-success";
  }

  if (normalized === "review") {
    return "bg-warning text-dark";
  }

  if (normalized === "inactive") {
    return "bg-danger";
  }

  return "bg-secondary";
}
