"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type Dispatch, type FormEvent, type SetStateAction, useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate, formatTime } from "@/lib/format";
import {
  createAttendanceRecord,
  fetchAttendanceRecord,
  fetchAttendanceRecords,
  fetchAttendanceRecordsWithFilters,
  fetchAttendanceSummary,
  fetchBranches,
  fetchChurch,
  getBranchId,
  getChurchId,
  updateAttendanceRecord,
} from "@/lib/workspace-api";
import type {
  AttendanceRecord,
  AttendanceSummaryResponse,
  BranchRecord,
  ChurchApiRecord,
  ServiceScheduleRecord,
} from "@/types/api";

interface SelectedServiceOption {
  value: string;
  serviceScheduleId: number | null;
  serviceType: "sunday" | "wednesday" | "wose" | "special" | null;
  label: string | null;
  sundayServiceNumber: number | null;
  specialServiceName: string | null;
  manual: boolean;
}

interface AttendanceFormState {
  serviceDate: string;
  branchId: string;
  serviceValue: string;
  specialName: string;
  maleCount: string;
  femaleCount: string;
  childrenCount: string;
  firstTimersCount: string;
  newConvertsCount: string;
  rededications: string;
  mainOffering: string;
  tithe: string;
  specialOffering: string;
  attendanceNotes: string;
}

const todayIso = new Date().toISOString().slice(0, 10);

const emptyAttendanceForm = (defaultBranchId = ""): AttendanceFormState => ({
  serviceDate: todayIso,
  branchId: defaultBranchId,
  serviceValue: "",
  specialName: "",
  maleCount: "",
  femaleCount: "",
  childrenCount: "",
  firstTimersCount: "",
  newConvertsCount: "",
  rededications: "",
  mainOffering: "",
  tithe: "",
  specialOffering: "",
  attendanceNotes: "",
});

export default function AttendanceRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = getChurchId(session);
  const sessionBranchId = getBranchId(session);
  const preloadRecordId = Number(searchParams.get("record_id") || 0) || null;

  const [form, setForm] = useState<AttendanceFormState>(emptyAttendanceForm(sessionBranchId ? String(sessionBranchId) : ""));
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [services, setServices] = useState<ServiceScheduleRecord[]>([]);
  const [church, setChurch] = useState<ChurchApiRecord | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummaryResponse["data"] | null>(null);
  const [currentEditRecordId, setCurrentEditRecordId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(currentEditRecordId);

  const selectedService = useMemo(
    () => getSelectedServiceOption(form.serviceValue, services),
    [form.serviceValue, services],
  );

  const totalCount = useMemo(
    () => toNumber(form.maleCount) + toNumber(form.femaleCount) + toNumber(form.childrenCount),
    [form.childrenCount, form.femaleCount, form.maleCount],
  );

  const isWOSEWeek = useMemo(() => {
    const selectedDate = new Date(form.serviceDate);
    return !Number.isNaN(selectedDate.getTime()) && selectedDate.getDate() <= 7;
  }, [form.serviceDate]);

  const serviceOptions = useMemo(() => buildServiceOptions(services), [services]);
  const financeEnabled = Boolean(church?.finance_enabled);

  useEffect(() => {
    setForm(emptyAttendanceForm(sessionBranchId ? String(sessionBranchId) : ""));
  }, [sessionBranchId]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [branchesResponse, churchResponse] = await Promise.all([
          fetchBranches(churchId),
          fetchChurch(churchId),
        ]);

        if (!active) {
          return;
        }

        const nextServices = ((churchResponse.data.service_schedules || []) as ServiceScheduleRecord[])
          .slice()
          .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));

        setBranches(branchesResponse.data || []);
        setChurch(churchResponse.data || null);
        setServices(nextServices);

        if (preloadRecordId) {
          const recordResponse = await fetchAttendanceRecord(preloadRecordId);

          if (!active) {
            return;
          }

          fillFormFromAttendanceRecord(recordResponse.data, nextServices, setForm, setCurrentEditRecordId);
          setSuccessMessage("Selected attendance record loaded for editing.");
        } else {
          setForm(emptyAttendanceForm(sessionBranchId ? String(sessionBranchId) : ""));
          setCurrentEditRecordId(null);
        }
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load attendance context.");
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
  }, [churchId, preloadRecordId, sessionBranchId]);

  useEffect(() => {
    let active = true;

    async function loadSummaryAndRecords() {
      try {
        const [summaryResponse, recordsResponse] = await Promise.all([
          fetchAttendanceSummary(
            churchId,
            form.branchId ? Number(form.branchId) : undefined,
            "weekly",
          ),
          fetchAttendanceRecords(
            churchId,
            form.branchId ? Number(form.branchId) : undefined,
            5,
          ),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryResponse.data || null);
        setRecords(recordsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load attendance records.");
        }
      }
    }

    void loadSummaryAndRecords();

    return () => {
      active = false;
    };
  }, [churchId, form.branchId]);

  useEffect(() => {
    let active = true;

    async function syncExistingRecord() {
      if (preloadRecordId || !selectedService || !form.serviceDate) {
        return;
      }

      if (selectedService.manual && !form.specialName.trim()) {
        return;
      }

      try {
        const existing = await findExistingAttendanceRecord({
          churchId,
          branchId: form.branchId ? Number(form.branchId) : undefined,
          serviceDate: form.serviceDate,
          selectedService,
          specialName: form.specialName,
        });

        if (!active || !existing) {
          if (active && currentEditRecordId && !preloadRecordId) {
            setCurrentEditRecordId(null);
          }

          return;
        }

        if (existing.id !== currentEditRecordId) {
          fillFormFromAttendanceRecord(existing, services, setForm, setCurrentEditRecordId);
          setSuccessMessage("Existing attendance record loaded for editing for this service and date.");
          setErrorMessage("");
        }
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load the selected attendance record.");
        }
      }
    }

    void syncExistingRecord();

    return () => {
      active = false;
    };
  }, [
    churchId,
    currentEditRecordId,
    form.branchId,
    form.serviceDate,
    form.serviceValue,
    form.specialName,
    preloadRecordId,
    selectedService,
    services,
  ]);

  function updateField<Key extends keyof AttendanceFormState>(key: Key, value: AttendanceFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
    setSuccessMessage("");
    setErrorMessage("");
  }

  function resetForm() {
    setForm(emptyAttendanceForm(sessionBranchId ? String(sessionBranchId) : ""));
    setCurrentEditRecordId(null);
    setSuccessMessage("");
    setErrorMessage("");

    if (preloadRecordId) {
      router.replace("/attendance");
    }
  }

  async function reloadSummaryAndRecords(branchValue: string) {
    const [summaryResponse, recordsResponse] = await Promise.all([
      fetchAttendanceSummary(churchId, branchValue ? Number(branchValue) : undefined, "weekly"),
      fetchAttendanceRecords(churchId, branchValue ? Number(branchValue) : undefined, 5),
    ]);

    setSummary(summaryResponse.data || null);
    setRecords(recordsResponse.data || []);
  }

  function startEditRecord(record: AttendanceRecord) {
    fillFormFromAttendanceRecord(record, services, setForm, setCurrentEditRecordId);
    setSuccessMessage("Attendance record loaded for editing.");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });

    if (preloadRecordId) {
      router.replace("/attendance");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!selectedService) {
      setErrorMessage("Please select a service.");
      return;
    }

    setIsSubmitting(true);

    try {
      let targetRecordId = currentEditRecordId;

      if (!targetRecordId) {
        const existing = await findExistingAttendanceRecord({
          churchId,
          branchId: form.branchId ? Number(form.branchId) : undefined,
          serviceDate: form.serviceDate,
          selectedService,
          specialName: form.specialName,
        });

        if (existing) {
          fillFormFromAttendanceRecord(existing, services, setForm, setCurrentEditRecordId);
          targetRecordId = existing.id;
        }
      }

      const payload = buildAttendancePayload({
        churchId,
        branchId: form.branchId,
        form,
        selectedService,
        userId: session.user?.id || null,
      });

      if (targetRecordId) {
        await updateAttendanceRecord(targetRecordId, payload);
      } else {
        await createAttendanceRecord(payload);
      }

      const nextBranchId = sessionBranchId ? String(sessionBranchId) : form.branchId;
      await reloadSummaryAndRecords(nextBranchId);
      setForm(emptyAttendanceForm(nextBranchId));
      setCurrentEditRecordId(null);

      if (preloadRecordId) {
        router.replace("/attendance");
      }

      setSuccessMessage(targetRecordId ? "Attendance updated successfully." : "Attendance saved successfully.");
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "Unable to save attendance.");
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
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h4 className="mb-1">Record Service Attendance</h4>
                  <p className="text-secondary mb-0">Submit one attendance record per service per day. If a record already exists for the selected date and service, this page switches into edit mode.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-outline-primary" href="/service-report">View Reports</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`} role="alert">{successMessage}</div>
          <div className={`alert alert-warning ${errorMessage ? "" : "d-none"}`} role="alert">{errorMessage}</div>
        </div>

        <div className="col-12">
          <div className="alert alert-info">
            <i className="ti ti-info-circle me-2" />
            <strong>One record per service per day:</strong> choose the same date and service again and the existing record will load for editing instead of creating a duplicate.
          </div>
        </div>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">
                <i className="ti ti-users me-2" />
                {isEditing ? "Edit Attendance Record" : "Add Attendance Record"}
              </h5>
              {isEditing ? (
                <button className="btn btn-outline-secondary btn-sm" onClick={resetForm} type="button">
                  Cancel Edit
                </button>
              ) : null}
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="border rounded p-3 mb-4">
                  <h6 className="mb-3">Service Details</h6>
                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Date <span className="text-danger">*</span></label>
                        <input
                          className="form-control"
                          onChange={(event) => updateField("serviceDate", event.target.value)}
                          required
                          type="date"
                          value={form.serviceDate}
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Branch</label>
                        <select
                          className="form-select"
                          disabled={Boolean(sessionBranchId)}
                          onChange={(event) => updateField("branchId", event.target.value)}
                          value={form.branchId}
                        >
                          <option value="">{session.church?.name ? `${session.church.name} (Main Church)` : "Main Church"}</option>
                          {branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Service <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          onChange={(event) => updateField("serviceValue", event.target.value)}
                          required
                          value={form.serviceValue}
                        >
                          <option value="">{serviceOptions.length ? "Select service" : "Loading services..."}</option>
                          {serviceOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.text}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={`col-md-3 ${selectedService?.manual ? "" : "d-none"}`}>
                      <div className="mb-3">
                        <label className="form-label">Service Name</label>
                        <input
                          className="form-control"
                          onChange={(event) => updateField("specialName", event.target.value)}
                          placeholder="e.g. Thanksgiving Service"
                          type="text"
                          value={form.specialName}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={`alert alert-info ${isWOSEWeek ? "" : "d-none"}`}>
                    <i className="ti ti-info-circle me-2" />
                    <strong>Week of Spiritual Emphasis:</strong> This is the first week of the month. WOSE services are available (Wed, Thu, Fri).
                  </div>
                </div>

                <div className="border rounded p-3 mb-4">
                  <h6 className="mb-3">Main Attendance Count</h6>
                  <div className="row">
                    <NumberInput className="col-md-3" label="Male *" onChange={(value) => updateField("maleCount", value)} value={form.maleCount} />
                    <NumberInput className="col-md-3" label="Female *" onChange={(value) => updateField("femaleCount", value)} value={form.femaleCount} />
                    <NumberInput className="col-md-3" label="Children *" onChange={(value) => updateField("childrenCount", value)} value={form.childrenCount} />
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label">Total</label>
                        <input className="form-control bg-light fw-bold" readOnly type="text" value={String(totalCount)} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded p-3 mb-4">
                  <h6 className="mb-3">First Timers &amp; New Converts</h6>
                  <div className="row">
                    <NumberInput className="col-md-4" helpText="New visitors to the church" label="First Timers" onChange={(value) => updateField("firstTimersCount", value)} value={form.firstTimersCount} />
                    <NumberInput className="col-md-4" helpText="Gave life to Christ today" label="New Converts" onChange={(value) => updateField("newConvertsCount", value)} value={form.newConvertsCount} />
                    <NumberInput className="col-md-4" helpText="Rededicated their life" label="Rededications" onChange={(value) => updateField("rededications", value)} value={form.rededications} />
                  </div>
                </div>

                <div className={`border rounded p-3 mb-4 ${financeEnabled ? "" : "d-none"}`}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Offering &amp; Finance (Optional)</h6>
                    <span className="badge bg-light-secondary">Optional</span>
                  </div>
                  <div className="row">
                    <NumberInput className="col-md-4" label="Main Offering (₦)" onChange={(value) => updateField("mainOffering", value)} value={form.mainOffering} />
                    <NumberInput className="col-md-4" label="Tithe (₦)" onChange={(value) => updateField("tithe", value)} value={form.tithe} />
                    <NumberInput className="col-md-4" label="Special Offering (₦)" onChange={(value) => updateField("specialOffering", value)} value={form.specialOffering} />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    onChange={(event) => updateField("attendanceNotes", event.target.value)}
                    placeholder="Any additional notes about this service..."
                    rows={2}
                    value={form.attendanceNotes}
                  />
                </div>

                <div className="d-flex gap-2">
                  <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                    <i className={`ti ${isSubmitting ? "ti-loader" : "ti-check"} me-1`} />
                    {isEditing ? (isSubmitting ? "Updating..." : "Update Attendance") : (isSubmitting ? "Saving..." : "Save Attendance")}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={resetForm} type="button">
                    {isEditing ? "Cancel Edit" : "Clear Form"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Today&apos;s Summary</h5>
            </div>
            <div className="card-body">
              <SummaryRow label="Total Attendance" value={String(totalCount)} />
              <SummaryRow label="First Timers" value={String(toNumber(form.firstTimersCount))} valueClass="text-success fw-bold" />
              <SummaryRow label="New Converts" value={String(toNumber(form.newConvertsCount))} valueClass="text-primary fw-bold" />
              <hr />
              <small className="text-muted">Summary updates as you enter figures</small>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">This Week</h5>
            </div>
            <div className="card-body">
              <SummaryRow label="Total" value={String(summary?.total_attendance ?? 0)} />
              <SummaryRow label="Average" value={String(summary?.average_attendance ?? 0)} />
              <SummaryRow
                label="Highest"
                value={summary?.highest_service ? `${summary.highest_service.total_count} (${summary.highest_service.service_label})` : "No records yet"}
                valueClass="fw-bold text-success"
              />
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Attendance Records</h5>
              <Link className="btn btn-sm btn-outline-primary" href="/service-report">View All</Link>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Branch</th>
                      <th>Service</th>
                      <th>Male</th>
                      <th>Female</th>
                      <th>Children</th>
                      <th>Total</th>
                      <th>First Timers</th>
                      <th>New Converts</th>
                      <th>Recorded By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length > 0 ? (
                      records.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.service_date)}</td>
                          <td>
                            {record.branch ? (
                              <span className="badge bg-light-secondary text-secondary">{record.branch.name}</span>
                            ) : (
                              <span className="text-muted">{session.church?.name || "Main Church"}</span>
                            )}
                          </td>
                          <td><span className="badge bg-primary">{record.service_label || "--"}</span></td>
                          <td>{record.male_count ?? 0}</td>
                          <td>{record.female_count ?? 0}</td>
                          <td>{record.children_count ?? 0}</td>
                          <td className="fw-bold">{record.total_count ?? 0}</td>
                          <td><span className="text-success">{record.first_timers_count ?? 0}</span></td>
                          <td><span className="text-primary">{record.new_converts_count ?? 0}</span></td>
                          <td>{record.recorded_by?.name || record.recordedBy?.name || "--"}</td>
                          <td>
                            <button className="btn btn-sm btn-light-primary" onClick={() => startEditRecord(record)} type="button">
                              <i className="ti ti-edit me-1" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={11}>No attendance records yet.</td>
                      </tr>
                    )}
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

function NumberInput({
  label,
  value,
  onChange,
  className = "",
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  helpText?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input
          className="form-control"
          min="0"
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          type="number"
          value={value}
        />
        {helpText ? <small className="text-muted">{helpText}</small> : null}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = "fw-bold",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between">
        <span className="text-secondary">{label}</span>
        <span className={valueClass}>{value}</span>
      </div>
    </div>
  );
}

function toNumber(value: string) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getOrdinal(value: number) {
  return value + (value === 1 ? "st" : value === 2 ? "nd" : value === 3 ? "rd" : "th");
}

function buildServiceOptions(serviceSchedules: ServiceScheduleRecord[]) {
  const options: Array<{ value: string; text: string }> = [];
  const sundaySchedules = serviceSchedules.filter((service) => service.service_type === "sunday");

  sundaySchedules.forEach((service, index) => {
    options.push({
      value: `schedule:${service.id}`,
      text: `${getOrdinal(index + 1)} Service${service.service_time ? ` - ${formatTime(service.service_time)}` : ""}`,
    });
  });

  serviceSchedules
    .filter((service) => service.service_type !== "sunday")
    .forEach((service) => {
      options.push({
        value: `schedule:${service.id}`,
        text: `${service.label || "Service"}${service.service_time ? ` - ${formatTime(service.service_time)}` : ""}`,
      });
    });

  options.push({
    value: "manual:special",
    text: "Special Service (Ad hoc)",
  });

  return options;
}

function getSelectedServiceOption(
  serviceValue: string,
  services: ServiceScheduleRecord[],
): SelectedServiceOption | null {
  if (!serviceValue) {
    return null;
  }

  if (serviceValue === "manual:special") {
    return {
      value: serviceValue,
      serviceScheduleId: null,
      serviceType: "special",
      label: null,
      sundayServiceNumber: null,
      specialServiceName: null,
      manual: true,
    };
  }

  const scheduleId = Number(serviceValue.replace("schedule:", ""));
  const service = services.find((entry) => entry.id === scheduleId);

  if (!service) {
    return null;
  }

  const sundayServices = services.filter((entry) => entry.service_type === "sunday");
  const sundayIndex = sundayServices.findIndex((entry) => entry.id === service.id);

  return {
    value: serviceValue,
    serviceScheduleId: service.id,
    serviceType: (service.service_type as SelectedServiceOption["serviceType"]) || null,
    label: service.label || null,
    sundayServiceNumber: sundayIndex >= 0 ? sundayIndex + 1 : null,
    specialServiceName: service.label || null,
    manual: false,
  };
}

function buildServiceLabel(selectedService: SelectedServiceOption, specialName: string) {
  if (selectedService.serviceType === "special") {
    return specialName.trim() || "Special Service";
  }

  if (selectedService.serviceType === "sunday") {
    return `${selectedService.sundayServiceNumber || 1}${selectedService.sundayServiceNumber === 1 ? "st" : selectedService.sundayServiceNumber === 2 ? "nd" : selectedService.sundayServiceNumber === 3 ? "rd" : "th"} Service`;
  }

  return selectedService.label || "Service";
}

function buildAttendancePayload({
  churchId,
  branchId,
  form,
  selectedService,
  userId,
}: {
  churchId: number;
  branchId: string;
  form: AttendanceFormState;
  selectedService: SelectedServiceOption;
  userId: number | null;
}) {
  return {
    church_id: churchId,
    branch_id: branchId ? Number(branchId) : null,
    service_schedule_id: selectedService.serviceScheduleId,
    recorded_by_user_id: userId,
    service_date: form.serviceDate,
    service_type: selectedService.serviceType,
    service_label: selectedService.manual
      ? (form.specialName.trim() || "Special Service")
      : (selectedService.label || buildServiceLabel(selectedService, form.specialName)),
    sunday_service_number: selectedService.sundayServiceNumber,
    special_service_name: selectedService.manual
      ? (form.specialName.trim() || null)
      : ((selectedService.serviceType === "special" || selectedService.serviceType === "wose")
        ? (selectedService.specialServiceName || selectedService.label || null)
        : null),
    male_count: toNumber(form.maleCount),
    female_count: toNumber(form.femaleCount),
    children_count: toNumber(form.childrenCount),
    first_timers_count: toNumber(form.firstTimersCount),
    new_converts_count: toNumber(form.newConvertsCount),
    rededications_count: toNumber(form.rededications),
    main_offering: form.mainOffering ? toNumber(form.mainOffering) : null,
    tithe: form.tithe ? toNumber(form.tithe) : null,
    special_offering: form.specialOffering ? toNumber(form.specialOffering) : null,
    notes: form.attendanceNotes.trim() || null,
  };
}

async function findExistingAttendanceRecord({
  churchId,
  branchId,
  serviceDate,
  selectedService,
  specialName,
}: {
  churchId: number;
  branchId?: number;
  serviceDate: string;
  selectedService: SelectedServiceOption;
  specialName: string;
}) {
  const response = await fetchAttendanceRecordsWithFilters({
    churchId,
    branchId,
    serviceType: selectedService.serviceType || undefined,
    dateFrom: serviceDate,
    dateTo: serviceDate,
    perPage: 25,
  });

  const normalizedSelectedName = normalizeServiceName(
    selectedService.manual
      ? specialName
      : (selectedService.specialServiceName || selectedService.label || ""),
  );

  return response.data?.find((record) => {
    if (selectedService.serviceScheduleId) {
      return Number(record.service_schedule_id || 0) === selectedService.serviceScheduleId;
    }

    if (selectedService.serviceType === "sunday" && selectedService.sundayServiceNumber) {
      return Number(record.sunday_service_number || 0) === selectedService.sundayServiceNumber;
    }

    return normalizeServiceName(record.special_service_name || record.service_label || "") === normalizedSelectedName;
  }) || null;
}

function fillFormFromAttendanceRecord(
  record: AttendanceRecord,
  services: ServiceScheduleRecord[],
  setForm: Dispatch<SetStateAction<AttendanceFormState>>,
  setCurrentEditRecordId: Dispatch<SetStateAction<number | null>>,
) {
  setCurrentEditRecordId(record.id);
  setForm({
    serviceDate: normalizeDateInput(record.service_date) || todayIso,
    branchId: record.branch_id ? String(record.branch_id) : "",
    serviceValue: getServiceValueForRecord(record, services),
    specialName: record.service_type === "special" && !record.service_schedule_id
      ? (record.special_service_name || record.service_label || "")
      : "",
    maleCount: String(record.male_count ?? 0),
    femaleCount: String(record.female_count ?? 0),
    childrenCount: String(record.children_count ?? 0),
    firstTimersCount: String(record.first_timers_count ?? 0),
    newConvertsCount: String(record.new_converts_count ?? 0),
    rededications: String(record.rededications_count ?? 0),
    mainOffering: record.main_offering === null || record.main_offering === undefined ? "" : String(record.main_offering),
    tithe: record.tithe === null || record.tithe === undefined ? "" : String(record.tithe),
    specialOffering: record.special_offering === null || record.special_offering === undefined ? "" : String(record.special_offering),
    attendanceNotes: record.notes || "",
  });
}

function getServiceValueForRecord(record: AttendanceRecord, services: ServiceScheduleRecord[]) {
  if (record.service_schedule_id) {
    return `schedule:${record.service_schedule_id}`;
  }

  if (record.service_type === "sunday" && record.sunday_service_number) {
    const sundayServices = services.filter((service) => service.service_type === "sunday");
    const matchedSunday = sundayServices[record.sunday_service_number - 1];

    if (matchedSunday) {
      return `schedule:${matchedSunday.id}`;
    }
  }

  const matchedService = services.find((service) => (
    service.service_type === record.service_type
    && (service.label || "") === (record.service_label || "")
  ));

  if (matchedService?.id) {
    return `schedule:${matchedService.id}`;
  }

  return record.service_type === "special" ? "manual:special" : "";
}

function normalizeServiceName(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] || "";
}
