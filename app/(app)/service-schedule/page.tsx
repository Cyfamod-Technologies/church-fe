"use client";

import Link from "next/link";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel, formatTime } from "@/lib/format";
import { useChurchSetupData } from "@/components/church-setup/use-church-setup-data";

export default function ServiceScheduleRoute() {
  const session = useSessionContext();
  const { serviceSchedules, church, error } = useChurchSetupData(session);
  const sundayServices = serviceSchedules.filter((item) => item.service_type === "sunday");
  const wednesdayService = serviceSchedules.find((item) => item.service_type === "wednesday") || null;
  const woseServices = serviceSchedules.filter((item) => item.service_type === "wose");
  const customServices = serviceSchedules.filter((item) => item.service_type === "special");

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Service Schedule</h4>
                  <p className="text-secondary mb-0">
                    Review all configured service times and recurrence patterns before editing.
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-primary" href="/church-setup">Church Setup</Link>
                  <Link className="btn btn-outline-secondary" href="/church-profile">Back to Profile</Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-danger ${error ? "" : "d-none"}`}>{error}</div>
        </div>

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Regular Services</h5>
              <span className="badge bg-light-primary">{serviceSchedules.length} configured</span>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Sunday Services</h6>
                      <span className="badge bg-light-secondary text-secondary">{sundayServices.length} configured</span>
                    </div>
                    <div className="d-grid gap-2">
                      {sundayServices.length > 0 ? (
                        sundayServices.map((service) => (
                          <div className="border rounded p-3" key={service.id}>
                            <strong>{service.label || "--"}</strong>
                            <div className="small text-secondary mt-1">
                              {service.day_name || "Sunday"} • {formatTime(service.service_time)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-secondary">No Sunday services configured.</div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="border rounded p-3 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Wednesday Service</h6>
                      <span className={`badge ${wednesdayService ? "bg-light-success text-success" : "bg-light-danger text-danger"}`}>
                        {wednesdayService ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    {wednesdayService ? (
                      <div className="border rounded p-3">
                        <strong>{wednesdayService.label || "Wednesday Service"}</strong>
                        <div className="small text-secondary mt-1">
                          {wednesdayService.day_name || "Wednesday"} • {formatTime(wednesdayService.service_time)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-secondary">No Wednesday service configured.</div>
                    )}
                  </div>
                </div>
                <div className="col-12">
                  <div className="border rounded p-3 h-100">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Week of Spiritual Emphasis</h6>
                      <span className={`badge ${woseServices.length > 0 ? "bg-light-success text-success" : "bg-light-danger text-danger"}`}>
                        {woseServices.length > 0 ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="d-grid gap-2">
                      {woseServices.length > 0 ? (
                        woseServices.map((service) => (
                          <div className="border rounded p-3" key={service.id}>
                            <strong>{service.label || "--"}</strong>
                            <div className="small text-secondary mt-1">
                              {service.day_name || "--"} • {formatTime(service.service_time)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-secondary">No WOSE services configured.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Other Services</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-3">
                {customServices.length > 0 ? (
                  customServices.map((service) => (
                    <div className="border rounded p-3" key={service.id}>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <strong>{service.label || "--"}</strong>
                        <span className="badge bg-light-secondary text-secondary">
                          {service.recurrence_type ? formatLabel(service.recurrence_type) : "Custom"}
                        </span>
                      </div>
                      <div className="small text-secondary mt-2">
                        {[service.day_name, formatTime(service.service_time)].filter((item) => item && item !== "--").join(" • ") || "--"}
                      </div>
                      {service.recurrence_detail ? (
                        <div className="small text-secondary mt-1">{service.recurrence_detail}</div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-secondary">No other services configured.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Settings</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center border rounded p-3 mb-3">
                <span>Special Services Enabled</span>
                <span className={`badge ${church?.special_services_enabled ? "bg-light-success text-success" : "bg-light-danger text-danger"}`}>
                  {church?.special_services_enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="small text-secondary">
                For attendance on extra configured services, use <strong>Special Service</strong> on the attendance page and enter the same service name.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Overview</h5>
            </div>
            <div className="card-body">
              <SideStat label="Sunday Services" value={String(sundayServices.length)} />
              <SideStat label="WOSE Services" value={String(woseServices.length)} />
              <SideStat label="Other Services" value={String(customServices.length)} last />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideStat({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={`border rounded p-3 ${last ? "" : "mb-3"}`}>
      <span className="text-secondary small d-block mb-1">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
