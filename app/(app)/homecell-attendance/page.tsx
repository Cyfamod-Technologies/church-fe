"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { getTodayDate, looksLikeRoleLabel } from "@/lib/homecell-utils";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  createHomecellAttendance,
  fetchChurch,
  fetchHomecellAttendanceRecord,
  fetchHomecellAttendanceRecordsWithFilters,
  fetchHomecellAttendanceSummary,
  fetchHomecells,
  getBranchId,
  getChurchId,
  updateHomecellAttendance,
} from "@/lib/workspace-api";
import type { HomecellAttendanceRecord, HomecellAttendanceSummaryResponse, HomecellRecord } from "@/types/api";

interface AttendanceFormState {
  homecell_id: string;
  meeting_date: string;
  male_count: string;
  female_count: string;
  children_count: string;
  first_timers_count: string;
  new_converts_count: string;
  offering_amount: string;
  notes: string;
}

interface RecorderRecord {
  id?: number | null;
  name?: string | null;
  role?: string | null;
}

const emptyForm = (homecellId = ""): AttendanceFormState => ({
  homecell_id: homecellId,
  meeting_date: getTodayDate(),
  male_count: "0",
  female_count: "0",
  children_count: "0",
  first_timers_count: "0",
  new_converts_count: "0",
  offering_amount: "",
  notes: "",
});

export default function HomecellAttendanceRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const isHomecellLeader = isHomecellLeaderSession(session);
  const activeHomecellId = session.homecell?.id ? Number(session.homecell.id) : null;
  const preloadRecordId = Number(searchParams.get("record_id") || 0) || null;
  const returnTo = searchParams.get("return_to") || "";

  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [currentRecorder, setCurrentRecorder] = useState<RecorderRecord | null>(null);
  const [form, setForm] = useState<AttendanceFormState>(emptyForm(activeHomecellId ? String(activeHomecellId) : ""));
  const [currentEditRecordId, setCurrentEditRecordId] = useState<number | null>(null);
  const [summary, setSummary] = useState<HomecellAttendanceSummaryResponse["data"] | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedHomecell = useMemo(() => (
    homecells.find((homecell) => homecell.id === Number(form.homecell_id || 0)) || null
  ), [form.homecell_id, homecells]);

  const totalAttendance = useMemo(() => (
    toPositiveNumber(form.male_count) + toPositiveNumber(form.female_count) + toPositiveNumber(form.children_count)
  ), [form.children_count, form.female_count, form.male_count]);

  const isEditing = Boolean(currentEditRecordId);
  const recorderLabel = currentRecorder?.name ? `Recorder: ${currentRecorder.name}` : "Recorder: Active session";
  const branchDisplay = selectedHomecell
    ? (selectedHomecell.branch?.name || "No branch assigned")
    : "Select a homecell";

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [homecellsResponse, churchResponse, summaryResponse] = await Promise.all([
          isHomecellLeader && session.homecell
            ? Promise.resolve({ data: [session.homecell as unknown as HomecellRecord] })
            : fetchHomecells(churchId, branchId),
          fetchChurch(churchId),
          fetchHomecellAttendanceSummary(churchId, branchId, activeHomecellId || undefined, "weekly"),
        ]);

        if (!active) {
          return;
        }

        const nextHomecells = homecellsResponse.data || [];
        const churchUsers = churchResponse.data?.users || [];

        setHomecells(nextHomecells);
        setSummary(summaryResponse.data || null);
        setCurrentRecorder(resolveRecorder(session, churchUsers));

        if (preloadRecordId) {
          const recordResponse = await fetchHomecellAttendanceRecord(preloadRecordId);

          if (!active) {
            return;
          }

          fillFormFromRecord(recordResponse.data, setForm, setCurrentEditRecordId);
          setSuccessMessage("Selected attendance record loaded for editing.");
        } else {
          setForm(emptyForm(activeHomecellId ? String(activeHomecellId) : ""));
          setCurrentEditRecordId(null);
        }
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell attendance.");
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
  }, [activeHomecellId, branchId, churchId, isHomecellLeader, preloadRecordId, session, session.homecell]);

  useEffect(() => {
    if (!form.homecell_id || !form.meeting_date || preloadRecordId) {
      return;
    }

    let active = true;

    async function syncExistingRecord() {
      try {
        const existing = await findExistingRecord(
          churchId,
          Number(form.homecell_id),
          selectedHomecell?.branch?.id,
          form.meeting_date,
        );

        if (!active || !existing) {
          return;
        }

        fillFormFromRecord(existing, setForm, setCurrentEditRecordId);
        setSuccessMessage("Existing record loaded for editing for this homecell and date.");
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the selected homecell record.");
        }
      }
    }

    void syncExistingRecord();

    return () => {
      active = false;
    };
  }, [churchId, form.homecell_id, form.meeting_date, preloadRecordId, selectedHomecell?.branch?.id]);

  async function reloadSummary() {
    const summaryResponse = await fetchHomecellAttendanceSummary(
      churchId,
      isHomecellLeader ? (selectedHomecell?.branch?.id || branchId) : branchId,
      isHomecellLeader ? (activeHomecellId || undefined) : undefined,
      "weekly",
    );
    setSummary(summaryResponse.data || null);
  }

  function updateField<Key extends keyof AttendanceFormState>(key: Key, value: AttendanceFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm(activeHomecellId ? String(activeHomecellId) : ""));
    setCurrentEditRecordId(null);
    if (preloadRecordId || returnTo) {
      router.replace("/homecell-attendance");
    }
  }

  async function handleHomecellOrDateChange(key: "homecell_id" | "meeting_date", value: string) {
    updateField(key, value as AttendanceFormState[typeof key]);
    setSuccessMessage("");
    setErrorMessage("");

    const nextHomecellId = key === "homecell_id" ? value : form.homecell_id;
    const nextMeetingDate = key === "meeting_date" ? value : form.meeting_date;

    if (!nextHomecellId || !nextMeetingDate || preloadRecordId) {
      return;
    }

    try {
      const homecell = homecells.find((entry) => entry.id === Number(nextHomecellId));
      const existing = await findExistingRecord(
        churchId,
        Number(nextHomecellId),
        homecell?.branch?.id,
        nextMeetingDate,
      );

      if (existing) {
        fillFormFromRecord(existing, setForm, setCurrentEditRecordId);
        setSuccessMessage("Existing record loaded for editing for this homecell and date.");
      } else {
        setCurrentEditRecordId(null);
        setForm({
          ...emptyForm(activeHomecellId ? String(activeHomecellId) : ""),
          homecell_id: nextHomecellId,
          meeting_date: nextMeetingDate,
        });
      }
    } catch (loadError) {
      setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the selected homecell record.");
    }
  }

  async function handleSubmit() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedHomecell) {
      setErrorMessage("Select the homecell you want to record attendance for.");
      return;
    }

    if (!form.meeting_date) {
      setErrorMessage("Choose the meeting date for this record.");
      return;
    }

    setIsSubmitting(true);

    try {
      let targetRecordId = currentEditRecordId;

      if (!targetRecordId) {
        const existing = await findExistingRecord(
          churchId,
          selectedHomecell.id,
          selectedHomecell.branch?.id,
          form.meeting_date,
        );

        if (existing) {
          fillFormFromRecord(existing, setForm, setCurrentEditRecordId);
          targetRecordId = existing.id;
        }
      }

      const payload = {
        church_id: churchId,
        branch_id: selectedHomecell.branch?.id || null,
        homecell_id: selectedHomecell.id,
        recorded_by_user_id: session.user?.id || currentRecorder?.id || null,
        meeting_date: form.meeting_date,
        male_count: toPositiveNumber(form.male_count),
        female_count: toPositiveNumber(form.female_count),
        children_count: toPositiveNumber(form.children_count),
        first_timers_count: toPositiveNumber(form.first_timers_count),
        new_converts_count: toPositiveNumber(form.new_converts_count),
        offering_amount: form.offering_amount === "" ? null : Number(form.offering_amount),
        notes: form.notes.trim() || null,
      };

      if (targetRecordId) {
        await updateHomecellAttendance(targetRecordId, payload);
      } else {
        await createHomecellAttendance(payload);
      }

      if (targetRecordId && returnTo === "records") {
        router.replace("/homecell-records?updated=1");
        return;
      }

      await reloadSummary();
      resetForm();
      setSuccessMessage(targetRecordId ? "Homecell attendance updated successfully." : "Homecell attendance saved successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to save homecell attendance.");
    } finally {
      setIsSubmitting(false);
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
                  <h4 className="mb-1">Record Homecell Attendance</h4>
                  <p className="text-secondary mb-0">Submit a single attendance record per homecell per day. Existing same-day records switch into edit mode automatically.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {!isHomecellLeader ? (
                    <Link className="btn btn-outline-secondary" href="/homecells">
                      <i className="ti ti-home me-1" />
                      Manage Homecells
                    </Link>
                  ) : null}
                  <Link className="btn btn-primary" href="/homecell-records">
                    <i className="ti ti-table me-1" />
                    {isHomecellLeader ? "View My Homecell Records" : "View Homecell Records"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Attendance" value={Number(summary?.total_attendance || 0)} valueClass="text-primary">
          Current week
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Reports Submitted" value={Number(summary?.reports_submitted || 0)} valueClass="text-success">
          Weekly submissions
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Average Attendance" value={Number(summary?.average_attendance || 0)} valueClass="text-warning">
          Per homecell meeting
        </StatCard>
        <StatCard
          borderClass="b-s-3-info"
          badgeClass="text-light-info"
          label="Coverage"
          value={`${summary?.homecells_covered || 0} / ${summary?.active_homecells || 0}`}
          valueClass="text-info"
        >
          {`${summary?.pending_homecells || 0} pending`}
        </StatCard>

        <div className="col-xl-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">{isEditing ? "Edit Attendance Record" : "Add Attendance Record"}</h5>
              {isEditing ? (
                <button className="btn btn-outline-secondary btn-sm" onClick={resetForm} type="button">
                  Cancel Edit
                </button>
              ) : null}
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="attendanceHomecellInput">Homecell</label>
                    <select
                      className="form-select"
                      disabled={Boolean(activeHomecellId)}
                      id="attendanceHomecellInput"
                      onChange={(event) => void handleHomecellOrDateChange("homecell_id", event.target.value)}
                      value={form.homecell_id}
                    >
                      <option value="">Select homecell</option>
                      {homecells.map((homecell) => (
                        <option key={homecell.id} value={homecell.id}>
                          {homecell.name}{homecell.branch?.name ? ` - ${homecell.branch.name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Field className="col-md-6" label="Meeting Date" type="date" value={form.meeting_date} onChange={(value) => void handleHomecellOrDateChange("meeting_date", value)} />
                <Field className="col-md-6" disabled label="Assigned Branch" value={branchDisplay} onChange={() => undefined} />
                <Field className="col-md-6" disabled label="Total Attendance" value={String(totalAttendance)} onChange={() => undefined} />
                <CountField className="col-md-4" label="Male" value={form.male_count} onChange={(value) => updateField("male_count", value)} />
                <CountField className="col-md-4" label="Female" value={form.female_count} onChange={(value) => updateField("female_count", value)} />
                <CountField className="col-md-4" label="Children" value={form.children_count} onChange={(value) => updateField("children_count", value)} />
                <CountField className="col-md-6" label="First Timers" value={form.first_timers_count} onChange={(value) => updateField("first_timers_count", value)} />
                <CountField className="col-md-6" label="New Converts" value={form.new_converts_count} onChange={(value) => updateField("new_converts_count", value)} />
                <Field className="col-md-6" label="Offering / Value (Optional)" type="number" value={form.offering_amount} onChange={(value) => updateField("offering_amount", value)} />
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label" htmlFor="attendanceNotesInput">Notes</label>
                    <textarea
                      className="form-control"
                      id="attendanceNotesInput"
                      onChange={(event) => updateField("notes", event.target.value)}
                      rows={3}
                      value={form.notes}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card-footer d-flex align-items-center justify-content-between flex-wrap gap-2">
              <span className="text-secondary">{recorderLabel}</span>
              <div className="d-flex gap-2 flex-wrap">
                {isEditing ? (
                  <button className="btn btn-outline-secondary" onClick={resetForm} type="button">
                    Cancel Edit
                  </button>
                ) : null}
                <button className="btn btn-primary" disabled={isSubmitting} onClick={() => void handleSubmit()} type="button">
                  <i className={`ti ${isSubmitting ? "ti-loader" : "ti-device-floppy"} me-1`} />
                  {isEditing ? (isSubmitting ? "Updating..." : "Update Attendance") : (isSubmitting ? "Saving..." : "Save Attendance")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Attendance Rules</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info mb-0">
                <i className="ti ti-info-circle me-2" />
                <strong>One record per day:</strong> if the selected homecell already has a record for the chosen date, this page opens it in edit mode instead of creating a duplicate.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

async function findExistingRecord(
  churchId: number,
  homecellId: number,
  branchId: number | undefined,
  meetingDate: string,
) {
  const response = await fetchHomecellAttendanceRecordsWithFilters({
    churchId,
    branchId,
    homecellId,
    limit: 1,
    dateFrom: meetingDate,
    dateTo: meetingDate,
  });

  return response.data?.[0] || null;
}

function resolveRecorder(session: ReturnType<typeof useSessionContext>, churchUsers: Array<{ id: number; name?: string | null; role?: string | null }>) {
  if (isHomecellLeaderSession(session)) {
    return {
      id: session.user?.id || null,
      name: session.homecell_leader?.name || session.user?.name || null,
      role: session.homecell_leader?.role || session.user?.role || null,
    };
  }

  return churchUsers.find((user) => user.role === "church_admin" && user.name && !looksLikeRoleLabel(user.name))
    || churchUsers.find((user) => session.user?.id === user.id && user.name && !looksLikeRoleLabel(user.name))
    || churchUsers.find((user) => user.name && !looksLikeRoleLabel(user.name))
    || session.user
    || null;
}

function fillFormFromRecord(
  record: HomecellAttendanceRecord,
  setForm: React.Dispatch<React.SetStateAction<AttendanceFormState>>,
  setCurrentEditRecordId: React.Dispatch<React.SetStateAction<number | null>>,
) {
  setCurrentEditRecordId(record.id);
  setForm({
    homecell_id: record.homecell?.id ? String(record.homecell.id) : "",
    meeting_date: record.meeting_date || getTodayDate(),
    male_count: String(record.male_count || 0),
    female_count: String(record.female_count || 0),
    children_count: String(record.children_count || 0),
    first_timers_count: String(record.first_timers_count || 0),
    new_converts_count: String(record.new_converts_count || 0),
    offering_amount: record.offering_amount === null || record.offering_amount === undefined ? "" : String(record.offering_amount),
    notes: record.notes || "",
  });
}

function toPositiveNumber(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
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
  value: number | string;
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

function Field({
  label,
  value,
  onChange,
  className = "col-md-6",
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input
          className="form-control"
          disabled={disabled}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          type={type}
          value={value}
        />
      </div>
    </div>
  );
}

function CountField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  return <Field className={className} label={label} type="number" value={value} onChange={onChange} />;
}
