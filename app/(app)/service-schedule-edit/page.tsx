"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useChurchSetupData } from "@/components/church-setup/use-church-setup-data";
import { useSessionContext } from "@/components/providers/auth-guard";
import { TemplateLoader } from "@/components/ui/template-loader";
import { saveSession } from "@/lib/session";
import { formatTime } from "@/lib/format";
import { updateServiceSchedules } from "@/lib/workspace-api";

interface CustomServiceForm {
  label: string;
  day_name: string;
  service_time: string;
  recurrence_type: "weekly" | "monthly" | "yearly" | "one_time";
  recurrence_detail: string;
}

const defaultCustomService = (): CustomServiceForm => ({
  label: "",
  day_name: "",
  service_time: "",
  recurrence_type: "weekly",
  recurrence_detail: "",
});

export default function ServiceScheduleEditRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const { serviceSchedules, church, isLoading, error } = useChurchSetupData(session);

  const sundayServices = useMemo(
    () => serviceSchedules.filter((item) => item.service_type === "sunday"),
    [serviceSchedules],
  );
  const wednesdayService = useMemo(
    () => serviceSchedules.find((item) => item.service_type === "wednesday") || null,
    [serviceSchedules],
  );
  const woseServices = useMemo(
    () => serviceSchedules.filter((item) => item.service_type === "wose"),
    [serviceSchedules],
  );
  const customServices = useMemo(
    () => serviceSchedules.filter((item) => item.service_type === "special"),
    [serviceSchedules],
  );

  const [sundayCount, setSundayCount] = useState(1);
  const [sundayTimes, setSundayTimes] = useState<string[]>(["07:00"]);
  const [wednesdayEnabled, setWednesdayEnabled] = useState(false);
  const [wednesdayTime, setWednesdayTime] = useState("");
  const [woseEnabled, setWoseEnabled] = useState(false);
  const [woseTimes, setWoseTimes] = useState({
    wednesday: "",
    thursday: "",
    friday: "",
  });
  const [otherServices, setOtherServices] = useState<CustomServiceForm[]>([]);
  const [specialServicesEnabled, setSpecialServicesEnabled] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (serviceSchedules.length === 0 && !church) {
      return;
    }

    const initialSundayTimes = sundayServices
      .map((service) => service.service_time?.slice(0, 5) || "")
      .filter(Boolean);
    const normalizedSundayCount = Math.max(1, Math.min(4, initialSundayTimes.length || 1));

    setSundayCount(normalizedSundayCount);
    setSundayTimes(
      Array.from({ length: normalizedSundayCount }, (_, index) => (
        initialSundayTimes[index] || getDefaultSundayTime(index)
      )),
    );
    setWednesdayEnabled(Boolean(wednesdayService));
    setWednesdayTime(wednesdayService?.service_time?.slice(0, 5) || "");
    setWoseEnabled(woseServices.length > 0);
    setWoseTimes({
      wednesday: woseServices.find((service) => service.day_name?.toLowerCase() === "wednesday")?.service_time?.slice(0, 5) || "",
      thursday: woseServices.find((service) => service.day_name?.toLowerCase() === "thursday")?.service_time?.slice(0, 5) || "",
      friday: woseServices.find((service) => service.day_name?.toLowerCase() === "friday")?.service_time?.slice(0, 5) || "",
    });
    setOtherServices(
      customServices.map((service) => ({
        label: service.label || "",
        day_name: service.day_name || "",
        service_time: service.service_time?.slice(0, 5) || "",
        recurrence_type: (service.recurrence_type as CustomServiceForm["recurrence_type"]) || "weekly",
        recurrence_detail: service.recurrence_detail || "",
      })),
    );
    setSpecialServicesEnabled(Boolean(church?.special_services_enabled));
  }, [church, customServices, serviceSchedules.length, sundayServices, wednesdayService, woseServices]);

  function handleSundayCountChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextCount = Number(event.target.value);
    setSundayCount(nextCount);
    setSundayTimes((current) => Array.from({ length: nextCount }, (_, index) => current[index] || getDefaultSundayTime(index)));
  }

  function updateSundayTime(index: number, value: string) {
    setSundayTimes((current) => current.map((entry, currentIndex) => (currentIndex === index ? value : entry)));
  }

  function updateWoseTime(key: keyof typeof woseTimes, value: string) {
    setWoseTimes((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateCustomService(index: number, key: keyof CustomServiceForm, value: string) {
    setOtherServices((current) => current.map((service, currentIndex) => (
      currentIndex === index
        ? {
            ...service,
            [key]: value,
            ...(key === "recurrence_type" && value === "weekly" ? { recurrence_detail: "" } : {}),
          }
        : service
    )));
  }

  function addCustomService() {
    setOtherServices((current) => [...current, defaultCustomService()]);
  }

  function removeCustomService(index: number) {
    setOtherServices((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");

    const filteredServices = otherServices
      .map((service) => ({
        ...service,
        label: service.label.trim(),
        day_name: service.day_name.trim(),
        recurrence_detail: service.recurrence_detail.trim(),
      }))
      .filter((service) => service.label || service.service_time || service.recurrence_detail);

    const invalidRecurringService = filteredServices.find((service) => (
      isRecurrenceDetailRequired(service.recurrence_type) && !service.recurrence_detail
    ));

    if (invalidRecurringService) {
      setPageError("Add a recurrence detail for monthly, yearly, or one-time services.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateServiceSchedules(Number(session.church?.id), {
        services: {
          sunday_count: sundayCount,
          sunday_times: sundayTimes.slice(0, sundayCount),
          wednesday_enabled: wednesdayEnabled,
          wednesday_time: wednesdayEnabled ? (wednesdayTime || null) : null,
          wose_enabled: woseEnabled,
          wose_times: {
            wednesday: woseEnabled ? (woseTimes.wednesday || null) : null,
            thursday: woseEnabled ? (woseTimes.thursday || null) : null,
            friday: woseEnabled ? (woseTimes.friday || null) : null,
          },
          custom_services: filteredServices.map((service) => ({
            ...service,
            day_name: service.day_name || null,
            recurrence_detail: service.recurrence_detail || null,
          })),
          special_services_enabled: specialServicesEnabled,
        },
      });

      saveSession({
        church: {
          ...session.church,
          id: Number(session.church?.id),
          name: session.church?.name || church?.name || null,
          code: session.church?.code || church?.code || null,
        },
      });

      router.replace("/service-schedule?updated=1");
    } catch (submitError) {
      setPageError(submitError instanceof Error ? submitError.message : "Unable to save service schedule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading && serviceSchedules.length === 0 && !church) {
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
                  <h4 className="mb-1">Edit Service Schedule</h4>
                  <p className="text-secondary mb-0">
                    Update regular worship services and WOSE configuration without editing the rest of the church profile.
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-outline-secondary" href="/service-schedule">
                    <i className="ti ti-arrow-left me-1" />
                    Back to View
                  </Link>
                  <Link className="btn btn-outline-primary" href="/church-profile">
                    <i className="ti ti-building-church me-1" />
                    Church Profile
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${error || pageError ? "" : "d-none"}`}>
            {pageError || error}
          </div>
        </div>

        <div className="col-lg-8">
          <form id="serviceScheduleForm" onSubmit={handleSubmit}>
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Sunday Services</h5>
              </div>
              <div className="card-body">
                <div className="row align-items-end">
                  <div className="col-md-4">
                    <label className="form-label" htmlFor="sundayServiceCount">Number of Sunday Services</label>
                    <select
                      className="form-select"
                      id="sundayServiceCount"
                      onChange={handleSundayCountChange}
                      value={sundayCount}
                    >
                      {[1, 2, 3, 4].map((count) => (
                        <option key={count} value={count}>
                          {count} Service{count > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row mt-3">
                  {Array.from({ length: sundayCount }, (_, index) => (
                    <div className="col-md-3" key={`sunday-${index}`}>
                      <div className="mb-3">
                        <label className="form-label">{ordinal(index + 1)} Service Time</label>
                        <input
                          className="form-control"
                          onChange={(event) => updateSundayTime(index, event.target.value)}
                          type="time"
                          value={sundayTimes[index] || ""}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Wednesday Service</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="wednesdayTime">Wednesday Service Time</label>
                      <input
                        className="form-control"
                        id="wednesdayTime"
                        onChange={(event) => setWednesdayTime(event.target.value)}
                        type="time"
                        value={wednesdayTime}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-check mt-4">
                      <input
                        checked={wednesdayEnabled}
                        className="form-check-input"
                        id="wednesdayEnabled"
                        onChange={(event) => setWednesdayEnabled(event.target.checked)}
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="wednesdayEnabled">
                        Wednesday service is active
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">Week of Spiritual Emphasis</h5>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  WOSE runs during the first week of the month on Wednesday, Thursday and Friday.
                </p>
                <div className="row">
                  {(["wednesday", "thursday", "friday"] as const).map((day) => (
                    <div className="col-md-3" key={day}>
                      <div className="mb-3">
                        <label className="form-label" htmlFor={`wose-${day}`}>
                          WOSE {day.charAt(0).toUpperCase() + day.slice(1)}
                        </label>
                        <input
                          className="form-control"
                          id={`wose-${day}`}
                          onChange={(event) => updateWoseTime(day, event.target.value)}
                          type="time"
                          value={woseTimes[day]}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="col-md-3">
                    <div className="form-check mt-4">
                      <input
                        checked={woseEnabled}
                        className="form-check-input"
                        id="woseEnabled"
                        onChange={(event) => setWoseEnabled(event.target.checked)}
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="woseEnabled">WOSE is active</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Other Services</h5>
                <button className="btn btn-sm btn-light-primary" onClick={addCustomService} type="button">
                  <i className="ti ti-plus me-1" />
                  Add Service
                </button>
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  Use this for vigils, thanksgiving services, crossover services, conventions, or any extra meeting that happens weekly, monthly, yearly, or one time.
                </p>
                <div className="d-grid gap-3">
                  {otherServices.length === 0 ? (
                    <div className="text-secondary">No other services added yet.</div>
                  ) : (
                    otherServices.map((service, index) => (
                      <div className="border rounded p-3" key={`custom-${index}`}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <strong>Other Service {index + 1}</strong>
                          <button
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={() => removeCustomService(index)}
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="row">
                          <FormInput
                            className="col-md-4"
                            label="Service Name"
                            onChange={(event) => updateCustomService(index, "label", event.target.value)}
                            placeholder="e.g. Night Vigil"
                            value={service.label}
                          />
                          <FormInput
                            className="col-md-3"
                            label="Day"
                            onChange={(event) => updateCustomService(index, "day_name", event.target.value)}
                            placeholder="e.g. Friday"
                            value={service.day_name}
                          />
                          <FormInput
                            className="col-md-2"
                            label="Time"
                            onChange={(event) => updateCustomService(index, "service_time", event.target.value)}
                            type="time"
                            value={service.service_time}
                          />
                          <div className="col-md-3">
                            <div className="mb-3">
                              <label className="form-label">Frequency</label>
                              <select
                                className="form-select"
                                onChange={(event) => updateCustomService(index, "recurrence_type", event.target.value)}
                                value={service.recurrence_type}
                              >
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="one_time">One-Time</option>
                              </select>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="mb-0">
                              <label className="form-label">
                                Recurrence Detail{isRecurrenceDetailRequired(service.recurrence_type) ? " *" : ""}
                              </label>
                              <input
                                className="form-control"
                                onChange={(event) => updateCustomService(index, "recurrence_detail", event.target.value)}
                                placeholder={getRecurrencePlaceholder(service.recurrence_type)}
                                required={isRecurrenceDetailRequired(service.recurrence_type)}
                                type="text"
                                value={service.recurrence_detail}
                              />
                              <small className="text-muted">{getRecurrenceHelpText(service.recurrence_type)}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Settings</h5>
            </div>
            <div className="card-body">
              <div className="form-check form-switch">
                <input
                  checked={specialServicesEnabled}
                  className="form-check-input"
                  id="specialServicesEnabled"
                  onChange={(event) => setSpecialServicesEnabled(event.target.checked)}
                  type="checkbox"
                />
                <label className="form-check-label" htmlFor="specialServicesEnabled">Allow special services</label>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Configured Services</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <SummaryItem
                  label="Sunday Services"
                  value={sundayTimes.slice(0, sundayCount).map((time) => formatTime(time)).join(", ") || "--"}
                />
                <SummaryItem
                  label="Wednesday Service"
                  value={wednesdayEnabled ? formatTime(wednesdayTime) : "Disabled"}
                />
                <SummaryItem
                  label="WOSE"
                  value={woseEnabled
                    ? ["Wednesday", "Thursday", "Friday"].map((day, index) => {
                        const key = ["wednesday", "thursday", "friday"][index] as keyof typeof woseTimes;
                        return `${day}: ${formatTime(woseTimes[key])}`;
                      }).join(" | ")
                    : "Disabled"}
                />
                <SummaryItem
                  label="Other Services"
                  value={otherServices.length ? `${otherServices.length} configured` : "None added"}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Actions</h5>
            </div>
            <div className="card-body d-grid gap-2">
              <button
                className="btn btn-primary"
                disabled={isSubmitting}
                onClick={() => {
                  const form = document.getElementById("serviceScheduleForm") as HTMLFormElement | null;
                  form?.requestSubmit();
                }}
                type="button"
              >
                <i className={`ti ${isSubmitting ? "ti-loader" : "ti-device-floppy"} me-1`} />
                {isSubmitting ? "Saving..." : "Save Schedule"}
              </button>
              <button
                className="btn btn-outline-secondary"
                onClick={() => router.refresh()}
                type="button"
              >
                Reload From Server
              </button>
              <div className="small text-secondary pt-2">
                For attendance on these extra services, choose <strong>Special Service</strong> on the attendance page and type the same service name.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input className="form-control" onChange={onChange} placeholder={placeholder} type={type} value={value} />
      </div>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border rounded p-3">
      <span className="text-secondary small d-block mb-1">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ordinal(value: number) {
  if (value === 1) {
    return "1st";
  }

  if (value === 2) {
    return "2nd";
  }

  if (value === 3) {
    return "3rd";
  }

  return `${value}th`;
}

function getDefaultSundayTime(index: number) {
  return ["07:00", "09:00", "11:00", "14:00"][index] || "07:00";
}

function isRecurrenceDetailRequired(recurrenceType: CustomServiceForm["recurrence_type"]) {
  return recurrenceType === "monthly" || recurrenceType === "yearly" || recurrenceType === "one_time";
}

function getRecurrencePlaceholder(recurrenceType: CustomServiceForm["recurrence_type"]) {
  if (recurrenceType === "monthly") {
    return "e.g. Last Friday of every month";
  }

  if (recurrenceType === "yearly") {
    return "e.g. December 31";
  }

  if (recurrenceType === "one_time") {
    return "e.g. 2026-12-31";
  }

  return "Optional for weekly services";
}

function getRecurrenceHelpText(recurrenceType: CustomServiceForm["recurrence_type"]) {
  if (recurrenceType === "monthly") {
    return "Describe how it repeats each month.";
  }

  if (recurrenceType === "yearly") {
    return "Enter the specific annual date or season for this service.";
  }

  if (recurrenceType === "one_time") {
    return "Enter the exact one-time date for this service.";
  }

  return "Leave this blank for a simple weekly service, or use it for extra notes.";
}
