"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import {
  createMemberEntry,
  fetchBranches,
  fetchChurch,
  fetchChurchUnits,
  fetchMemberEntry,
  getBranchId,
  getChurchId,
  updateMemberEntry,
} from "@/lib/workspace-api";
import type {
  BranchRecord,
  ChurchUnitRecord,
  GuestResponseEntryRecord,
} from "@/types/api";

interface MemberFormState {
  entryType: string;
  serviceDate: string;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  branchId: string;
  invitedBy: string;
  address: string;
  notes: string;
  foundationCompleted: boolean;
  baptismCompleted: boolean;
  holyGhostBaptismCompleted: boolean;
  wofbiCompleted: boolean;
  wofbiLevels: string[];
  churchUnitIds: number[];
}

interface ChurchUserRecord {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
}

const todayIso = new Date().toISOString().slice(0, 10);

const defaultFormState = (branchId = ""): MemberFormState => ({
  entryType: "",
  serviceDate: todayIso,
  fullName: "",
  phone: "",
  email: "",
  gender: "",
  branchId,
  invitedBy: "",
  address: "",
  notes: "",
  foundationCompleted: false,
  baptismCompleted: false,
  holyGhostBaptismCompleted: false,
  wofbiCompleted: false,
  wofbiLevels: [],
  churchUnitIds: [],
});

export default function AddMemberRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = getChurchId(session);
  const activeBranchId = getBranchId(session);
  const editEntryId = Number(searchParams.get("edit") || 0) || null;
  const returnTo = searchParams.get("return_to") || "";

  const [form, setForm] = useState<MemberFormState>(defaultFormState(activeBranchId ? String(activeBranchId) : ""));
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [churchUnits, setChurchUnits] = useState<ChurchUnitRecord[]>([]);
  const [currentRecorder, setCurrentRecorder] = useState<ChurchUserRecord | null>(null);
  const [currentEditEntryId, setCurrentEditEntryId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(currentEditEntryId);
  const mainChurchLabel = `${session.church?.name || "Main Church"} (Main Church)`;

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const [churchResponse, branchesResponse, unitsResponse] = await Promise.all([
          fetchChurch(churchId),
          fetchBranches(churchId, activeBranchId),
          fetchChurchUnits(churchId),
        ]);

        if (!active) {
          return;
        }

        const loadedChurch = churchResponse.data || null;
        const churchUsers = loadedChurch?.users || [];

        setBranches((branchesResponse.data || []).filter(Boolean));
        setChurchUnits(unitsResponse.data || []);

        const resolvedRecorder = churchUsers.find((user) => (
          session.user?.id === user.id && user.name && !looksLikeRoleLabel(user.name)
        )) || churchUsers.find((user) => (
          user.role === "church_admin" && user.name && !looksLikeRoleLabel(user.name)
        )) || (session.user ? {
          id: session.user.id,
          name: session.user.name || null,
          email: session.user.email || null,
          phone: session.user.phone || null,
          role: session.user.role || null,
        } : null);

        setCurrentRecorder(resolvedRecorder || null);

        if (editEntryId) {
          const entryResponse = await fetchMemberEntry(editEntryId);

          if (!active) {
            return;
          }

          fillFormFromEntry(entryResponse.data, setForm);
          setCurrentEditEntryId(entryResponse.data.id);
          setSuccessMessage("Member record loaded for editing.");
        } else {
          setCurrentEditEntryId(null);
          setForm(defaultFormState(activeBranchId ? String(activeBranchId) : ""));
        }
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the member page right now.");
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
  }, [activeBranchId, churchId, editEntryId, session.user]);

  const recorderLabel = useMemo(() => (
    currentRecorder?.name ? `Recorder: ${currentRecorder.name}` : "Recorder: Active session"
  ), [currentRecorder]);

  function updateField<Key extends keyof MemberFormState>(key: Key, value: MemberFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleWofbiLevel(level: string) {
    setForm((current) => ({
      ...current,
      wofbiLevels: current.wofbiLevels.includes(level)
        ? current.wofbiLevels.filter((item) => item !== level)
        : [...current.wofbiLevels, level],
    }));
  }

  function toggleChurchUnit(unitId: number) {
    setForm((current) => ({
      ...current,
      churchUnitIds: current.churchUnitIds.includes(unitId)
        ? current.churchUnitIds.filter((item) => item !== unitId)
        : [...current.churchUnitIds, unitId],
    }));
  }

  function handleWofbiCompletedChange(nextValue: boolean) {
    setForm((current) => ({
      ...current,
      wofbiCompleted: nextValue,
      wofbiLevels: nextValue ? current.wofbiLevels : [],
    }));
  }

  function resetForm() {
    setForm(defaultFormState(activeBranchId ? String(activeBranchId) : ""));
    setCurrentEditEntryId(null);
    setSuccessMessage("");
    setErrorMessage("");
  }

  async function handleSave() {
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      church_id: churchId,
      branch_id: activeBranchId ? activeBranchId : (Number(form.branchId || 0) || null),
      recorded_by_user_id: currentRecorder?.id || null,
      entry_type: form.entryType,
      full_name: form.fullName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      gender: form.gender || null,
      service_date: form.serviceDate,
      invited_by: form.invitedBy.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      foundation_class_completed: form.foundationCompleted,
      baptism_completed: form.baptismCompleted,
      holy_ghost_baptism_completed: form.holyGhostBaptismCompleted,
      wofbi_completed: form.wofbiCompleted,
      wofbi_levels: form.wofbiCompleted ? form.wofbiLevels : [],
      church_unit_ids: form.churchUnitIds,
    };

    if (!payload.entry_type) {
      setErrorMessage("Select whether this record is a first timer, new convert, or re-dedication.");
      return;
    }

    if (!payload.full_name) {
      setErrorMessage("Enter the full name for this record.");
      return;
    }

    if (!payload.service_date) {
      setErrorMessage("Select the service date for this record.");
      return;
    }

    if (payload.wofbi_completed && payload.wofbi_levels.length === 0) {
      setErrorMessage("Select at least one completed WOFBI level.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (currentEditEntryId) {
        await updateMemberEntry(currentEditEntryId, payload);
      } else {
        await createMemberEntry(payload);
      }

      if (returnTo === "registry") {
        router.replace("/member-registry?updated=1");
        return;
      }

      resetForm();
      setSuccessMessage(currentEditEntryId ? "Member record updated successfully." : "Member record saved successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to save this member record right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <TemplateLoader />;
  }

  return (
    <div className="container-fluid">
      <div className="row justify-content-center">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">{isEditing ? "Edit Member" : "Add Member"}</h4>
                  <p className="text-secondary mb-0">
                    Capture first timers, new converts, and re-dedications once, then keep their milestones and unit assignments updated over time.
                  </p>
                </div>
                <Link className="btn btn-outline-primary" href="/member-registry">
                  <i className="ti ti-table me-1" />
                  Open Member Registry
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <div className="col-xl-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">{isEditing ? "Edit Member Record" : "Add Member Record"}</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <SelectField
                    label="Member Category *"
                    options={[
                      { value: "", label: "Select category" },
                      { value: "first_timer", label: "First Timer" },
                      { value: "new_convert", label: "New Convert" },
                      { value: "rededication", label: "Re-Dedication" },
                    ]}
                    value={form.entryType}
                    onChange={(value) => updateField("entryType", value)}
                  />
                </div>
                <div className="col-md-6">
                  <InputField label="Service Date *" type="date" value={form.serviceDate} onChange={(value) => updateField("serviceDate", value)} />
                </div>
                <div className="col-12">
                  <InputField label="Full Name *" placeholder="Enter full name" value={form.fullName} onChange={(value) => updateField("fullName", value)} />
                </div>
                <div className="col-md-6">
                  <InputField label="Phone" placeholder="+234..." value={form.phone} onChange={(value) => updateField("phone", value)} />
                </div>
                <div className="col-md-6">
                  <InputField label="Email" placeholder="name@example.com" type="email" value={form.email} onChange={(value) => updateField("email", value)} />
                </div>
                <div className="col-md-6">
                  <SelectField
                    label="Gender"
                    options={[
                      { value: "", label: "Select gender" },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                    value={form.gender}
                    onChange={(value) => updateField("gender", value)}
                  />
                </div>
                <div className="col-md-6">
                  <SelectField
                    disabled={Boolean(activeBranchId)}
                    label="Branch"
                    options={[
                      { value: "", label: mainChurchLabel },
                      ...branches.map((branch) => ({
                        value: String(branch.id),
                        label: branch.name,
                      })),
                    ]}
                    value={form.branchId}
                    onChange={(value) => updateField("branchId", value)}
                  />
                </div>
                <div className="col-12">
                  <InputField label="Invited By / Contact Person" placeholder="Who brought or followed up this person?" value={form.invitedBy} onChange={(value) => updateField("invitedBy", value)} />
                </div>
                <div className="col-12">
                  <InputField label="Address" placeholder="Address or area" value={form.address} onChange={(value) => updateField("address", value)} />
                </div>
                <div className="col-12">
                  <div className="p-3 rounded border bg-light mb-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                      <div>
                        <h6 className="mb-1">Journey Milestones</h6>
                        <p className="text-secondary small mb-0">Tick what this person has already completed. WOFBI can carry one level or all three.</p>
                      </div>
                      <span className="badge text-light-primary">Editable anytime</span>
                    </div>
                    <CheckField label="Foundation Class Completed" checked={form.foundationCompleted} onChange={(checked) => updateField("foundationCompleted", checked)} />
                    <CheckField label="Baptism Completed" checked={form.baptismCompleted} onChange={(checked) => updateField("baptismCompleted", checked)} />
                    <CheckField label="Holy Ghost Baptism Completed" checked={form.holyGhostBaptismCompleted} onChange={(checked) => updateField("holyGhostBaptismCompleted", checked)} />
                    <CheckField label="WOFBI Completed" checked={form.wofbiCompleted} onChange={handleWofbiCompletedChange} />
                    <div>
                      <label className="form-label mb-2">WOFBI Levels</label>
                      <div className="d-flex flex-wrap gap-3">
                        {["BCC", "LCC", "LDC"].map((level) => (
                          <div className="form-check" key={level}>
                            <input
                              checked={form.wofbiLevels.includes(level)}
                              className="form-check-input"
                              disabled={!form.wofbiCompleted}
                              id={`wofbi-${level}`}
                              onChange={() => toggleWofbiLevel(level)}
                              type="checkbox"
                            />
                            <label className="form-check-label" htmlFor={`wofbi-${level}`}>{level}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="p-3 rounded border bg-light mb-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                      <div>
                        <h6 className="mb-1">Church Units</h6>
                        <p className="text-secondary small mb-0">Select one or more units for this member. Add new units from the Church Units page.</p>
                      </div>
                      <Link className="btn btn-sm btn-outline-primary" href="/church-units">Manage Units</Link>
                    </div>
                    <div className="row g-2">
                      {churchUnits.length > 0 ? churchUnits.map((unit) => (
                        <div className="col-md-6" key={unit.id}>
                          <label className="border rounded p-3 d-flex align-items-start gap-2 h-100">
                            <input
                              checked={form.churchUnitIds.includes(unit.id)}
                              className="form-check-input mt-1"
                              onChange={() => toggleChurchUnit(unit.id)}
                              type="checkbox"
                            />
                            <span>
                              <strong className="d-block">{unit.name}</strong>
                              <span className="text-secondary small">{unit.description || unit.code || "Church unit"}</span>
                              {unit.status === "inactive" ? <span className="badge text-light-warning mt-2">Inactive</span> : null}
                            </span>
                          </label>
                        </div>
                      )) : (
                        <div className="col-12">
                          <div className="border rounded p-3 text-muted small">
                            No church units yet. Create units first, then return here to assign members.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-0">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      placeholder="Follow-up, counselling, or growth notes."
                      rows={3}
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="text-secondary small">{recorderLabel}</div>
              <div className="d-flex gap-2">
                <button
                  className={`btn btn-outline-secondary ${isEditing ? "" : "d-none"}`}
                  onClick={() => {
                    if (returnTo === "registry") {
                      router.replace("/member-registry");
                      return;
                    }

                    resetForm();
                  }}
                  type="button"
                >
                  Cancel Edit
                </button>
                <button className="btn btn-primary" disabled={isSubmitting} onClick={() => void handleSave()} type="button">
                  <i className={`ti ${isSubmitting ? "ti-loader" : "ti-device-floppy"} me-1`} />
                  {isEditing ? "Update Member" : "Save Member"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="alert alert-info mb-0">
            <i className="ti ti-info-circle me-2" />
            <strong>Workflow:</strong> add the person once, then return later to update milestones and units as they progress.
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input
        className="form-control"
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <select className="form-select" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="form-check mb-2">
      <input checked={checked} className="form-check-input" onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <label className="form-check-label">{label}</label>
    </div>
  );
}

function looksLikeRoleLabel(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();

  return [
    "church_admin",
    "branch_admin",
    "admin",
    "church admin",
    "branch admin",
  ].includes(normalized);
}

function fillFormFromEntry(entry: GuestResponseEntryRecord, setForm: Dispatch<SetStateAction<MemberFormState>>) {
  setForm({
    entryType: entry.entry_type || "",
    serviceDate: entry.service_date || todayIso,
    fullName: entry.full_name || "",
    phone: entry.phone || "",
    email: entry.email || "",
    gender: entry.gender || "",
    branchId: entry.branch?.id ? String(entry.branch.id) : "",
    invitedBy: entry.invited_by || "",
    address: entry.address || "",
    notes: entry.notes || "",
    foundationCompleted: Boolean(entry.foundation_class_completed),
    baptismCompleted: Boolean(entry.baptism_completed),
    holyGhostBaptismCompleted: Boolean(entry.holy_ghost_baptism_completed),
    wofbiCompleted: Boolean(entry.wofbi_completed),
    wofbiLevels: entry.wofbi_levels || [],
    churchUnitIds: (entry.church_units || []).map((unit) => unit.id),
  });
}
