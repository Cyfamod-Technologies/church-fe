/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { getDefaultRoute, getSession, hasValidSession, saveSession } from "@/lib/session";

interface LocationOption {
  id?: number | string;
  slug?: string;
  name: string;
}

interface RegistrationResponse {
  data: {
    church: {
      id: number;
      name: string;
    };
    admin: {
      id: number;
      name: string;
      email: string;
      phone?: string | null;
      role?: string | null;
    };
  };
}

const totalSteps = 4;

export function RegisterForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [states, setStates] = useState<LocationOption[]>([]);
  const [lgas, setLgas] = useState<LocationOption[]>([]);
  const [loadingLgas, setLoadingLgas] = useState(false);
  const [form, setForm] = useState({
    churchName: "",
    churchCode: "",
    churchState: "",
    churchStateSlug: "",
    churchCity: "",
    churchLga: "",
    churchAddress: "",
    churchEmail: "",
    churchPhone: "",
    pastorName: "",
    pastorPhone: "",
    pastorEmail: "",
    sundayServiceCount: "2",
    sundayTimes: ["07:00", "09:00"],
    wednesdayEnabled: true,
    wednesdayTime: "17:30",
    woseEnabled: true,
    woseWednesdayTime: "17:30",
    woseThursdayTime: "17:30",
    woseFridayTime: "17:30",
    specialServicesEnabled: true,
    adminName: "",
    adminPhone: "",
    adminEmail: "",
    adminPassword: "",
    adminPasswordConfirmation: "",
    financeEnabled: false,
  });

  useEffect(() => {
    const session = getSession();

    if (hasValidSession(session)) {
      router.replace(getDefaultRoute(session));
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;

    apiRequest<{ data: LocationOption[] }>("locations/states")
      .then((response) => {
        if (!cancelled) {
          setStates(response.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load Nigerian states. Check the backend connection.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.churchStateSlug) {
      return;
    }

    let cancelled = false;

    apiRequest<{ data: LocationOption[] }>(
      `locations/lgas?state_slug=${encodeURIComponent(form.churchStateSlug)}`,
    )
      .then((response) => {
        if (!cancelled) {
          setLgas(response.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to load LGAs for the selected state.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingLgas(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [form.churchStateSlug]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function buildSundayTimes(count: number, currentTimes: string[]) {
    const nextTimes = [...currentTimes];

    while (nextTimes.length < count) {
      nextTimes.push(
        nextTimes.length === 0
          ? "07:00"
          : nextTimes.length === 1
            ? "09:00"
            : nextTimes.length === 2
              ? "11:00"
              : "14:00",
      );
    }

    return nextTimes.slice(0, count);
  }

  function validateStep(step: number): boolean {
    const stepFields: Record<number, Array<keyof typeof form>> = {
      1: ["churchName", "churchState", "churchCity", "churchLga", "churchAddress", "churchPhone"],
      2: ["pastorName", "pastorPhone"],
      3: ["sundayServiceCount"],
      4: ["adminName", "adminPhone", "adminEmail", "adminPassword", "adminPasswordConfirmation"],
    };

    const invalidField = (stepFields[step] || []).find((field) => !String(form[field] || "").trim());

    if (invalidField) {
      setError("Please complete all required fields before continuing.");
      return false;
    }

    if (step === 3 && !form.sundayTimes.filter(Boolean).length) {
      setError("Add at least one Sunday service time.");
      return false;
    }

    if (step === 4 && form.adminPassword !== form.adminPasswordConfirmation) {
      setError("Password confirmation does not match.");
      return false;
    }

    return true;
  }

  function nextStep() {
    setError("");
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  }

  function prevStep() {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }

  function buildPayload() {
    const stateOption = states.find((item) => String(item.id || item.slug || item.name) === form.churchState);
    const lgaOption = lgas.find((item) => String(item.id || item.slug || item.name) === form.churchLga);

    return {
      church: {
        name: form.churchName.trim(),
        code: form.churchCode.trim() || null,
        address: form.churchAddress.trim(),
        city: form.churchCity.trim(),
        state: stateOption ? stateOption.name : "",
        district_area: lgaOption ? lgaOption.name : "",
        email: form.churchEmail.trim() || null,
        phone: form.churchPhone.trim() || null,
      },
      pastor: {
        name: form.pastorName.trim(),
        phone: form.pastorPhone.trim(),
        email: form.pastorEmail.trim() || null,
      },
      services: {
        sunday_count: Number(form.sundayServiceCount),
        sunday_times: form.sundayTimes.filter(Boolean),
        wednesday_enabled: form.wednesdayEnabled,
        wednesday_time: form.wednesdayTime || null,
        wose_enabled: form.woseEnabled,
        wose_times: {
          wednesday: form.woseWednesdayTime || null,
          thursday: form.woseThursdayTime || null,
          friday: form.woseFridayTime || null,
        },
        special_services_enabled: form.specialServicesEnabled,
      },
      settings: {
        finance_enabled: form.financeEnabled,
      },
      admin: {
        name: form.adminName.trim(),
        email: form.adminEmail.trim(),
        phone: form.adminPhone.trim(),
        password: form.adminPassword,
        password_confirmation: form.adminPasswordConfirmation,
      },
    };
  }

  function completeRegistration() {
    setError("");

    if (!validateStep(4)) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await apiRequest<RegistrationResponse>("churches/register", {
          method: "POST",
          body: buildPayload(),
        });

        saveSession({
          user: response.data.admin,
          church: response.data.church,
          branch: null,
          homecell: null,
          homecell_leader: null,
        });

        router.replace("/dashboard");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Unable to complete registration.");
      }
    });
  }

  return (
    <div className="app-wrapper d-block">
      <main className="w-100 p-0">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10">
              <div className="card">
                <div className="card-body">
                  <div className="text-center mb-4">
                    <Link className="logo d-inline-block mb-3" href="/">
                      <img alt="logo" src="/assets/images/logo/3.png" />
                    </Link>
                    <h3>Church Onboarding</h3>
                    <p className="f-s-12 text-secondary mb-0">
                      Register your church and configure service schedules to get started.
                    </p>
                  </div>

                  <div className="d-flex align-items-center justify-content-center mb-4 px-4">
                    {[1, 2, 3, 4].map((step) => (
                      <div className="d-flex align-items-center" key={step}>
                        <div
                          className={`step-indicator ${
                            step < currentStep ? "completed" : step === currentStep ? "active" : "pending"
                          }`}
                        >
                          {step < currentStep ? <i className="ti ti-check" /> : step}
                        </div>
                        {step < 4 ? (
                          <div className={`step-line ${step < currentStep ? "completed" : "pending"}`} />
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <div className="d-flex justify-content-between mb-4 px-2">
                    <span className="small text-center" style={{ width: 80 }}>Church Info</span>
                    <span className="small text-center" style={{ width: 80 }}>Pastor Info</span>
                    <span className="small text-center" style={{ width: 80 }}>Services</span>
                    <span className="small text-center" style={{ width: 80 }}>Admin</span>
                  </div>
                  <div className={`alert alert-danger ${error ? "" : "d-none"}`} role="alert">
                    {error}
                  </div>

                  <form className="app-form" onSubmit={(event) => event.preventDefault()}>
                    <div className={`step ${currentStep === 1 ? "active" : ""}`}>
                      <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3"><i className="ti ti-building-church me-2" />Church Information</h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Church Name</label>
                              <input className="form-control" type="text" value={form.churchName} onChange={(e) => setField("churchName", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Church Code</label>
                              <input className="form-control" type="text" value={form.churchCode} onChange={(e) => setField("churchCode", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label className="form-label">State</label>
                              <select
                                className="form-select"
                                value={form.churchState}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const option = states.find((item) => String(item.id || item.slug || item.name) === value);
                                  setLgas([]);
                                  setLoadingLgas(Boolean(option?.slug));
                                  setForm((prev) => ({
                                    ...prev,
                                    churchState: value,
                                    churchStateSlug: option?.slug || "",
                                    churchLga: "",
                                  }));
                                }}
                              >
                                <option value="">Select state</option>
                                {states.map((state) => (
                                  <option key={String(state.id || state.slug || state.name)} value={String(state.id || state.slug || state.name)}>
                                    {state.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label className="form-label">City</label>
                              <input className="form-control" type="text" value={form.churchCity} onChange={(e) => setField("churchCity", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-4">
                            <div className="mb-3">
                              <label className="form-label">LGA / District Area</label>
                              <select className="form-select" value={form.churchLga} onChange={(e) => setField("churchLga", e.target.value)}>
                                <option value="">{loadingLgas ? "Loading LGAs..." : "Select LGA"}</option>
                                {lgas.map((lga) => (
                                  <option key={String(lga.id || lga.slug || lga.name)} value={String(lga.id || lga.slug || lga.name)}>
                                    {lga.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="col-12">
                            <div className="mb-3">
                              <label className="form-label">Full Address</label>
                              <textarea className="form-control" rows={2} value={form.churchAddress} onChange={(e) => setField("churchAddress", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Church Email</label>
                              <input className="form-control" type="email" value={form.churchEmail} onChange={(e) => setField("churchEmail", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Church Phone Number</label>
                              <input className="form-control" type="text" value={form.churchPhone} onChange={(e) => setField("churchPhone", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between">
                        <Link className="text-primary text-decoration-underline" href="/login">Already have an account? Login</Link>
                        <button className="btn btn-primary" onClick={nextStep} type="button">Next <i className="ti ti-arrow-right ms-1" /></button>
                      </div>
                    </div>

                    <div className={`step ${currentStep === 2 ? "active" : ""}`}>
                      <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3"><i className="ti ti-user me-2" />Pastor in Charge Information</h5>
                        <div className="row">
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Pastor&apos;s Full Name</label>
                              <input className="form-control" type="text" value={form.pastorName} onChange={(e) => setField("pastorName", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Pastor&apos;s Phone Number</label>
                              <input className="form-control" type="text" value={form.pastorPhone} onChange={(e) => setField("pastorPhone", e.target.value)} />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="mb-3">
                              <label className="form-label">Pastor&apos;s Email</label>
                              <input className="form-control" type="email" value={form.pastorEmail} onChange={(e) => setField("pastorEmail", e.target.value)} />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between">
                        <button className="btn btn-outline-secondary" onClick={prevStep} type="button"><i className="ti ti-arrow-left me-1" /> Previous</button>
                        <button className="btn btn-primary" onClick={nextStep} type="button">Next <i className="ti ti-arrow-right ms-1" /></button>
                      </div>
                    </div>

                    <div className={`step ${currentStep === 3 ? "active" : ""}`}>
                      <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3"><i className="ti ti-calendar me-2" />Service Schedule</h5>
                        <div className="bg-light p-3 rounded mb-3">
                          <h6 className="mb-3">Sunday Services</h6>
                          <div className="row">
                            <div className="col-md-4">
                              <div className="mb-3">
                                <label className="form-label">Number of Sunday Services</label>
                                <select
                                  className="form-select"
                                  value={form.sundayServiceCount}
                                  onChange={(e) => {
                                    const count = Number(e.target.value || 0);
                                    setForm((prev) => ({
                                      ...prev,
                                      sundayServiceCount: e.target.value,
                                      sundayTimes: buildSundayTimes(count, prev.sundayTimes),
                                    }));
                                  }}
                                >
                                  <option value="1">1 Service</option>
                                  <option value="2">2 Services</option>
                                  <option value="3">3 Services</option>
                                  <option value="4">4 Services</option>
                                </select>
                              </div>
                            </div>
                          </div>
                          <div className="row">
                            {form.sundayTimes.map((value, index) => {
                              const suffix = index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th";
                              return (
                                <div className="col-md-3 sunday-service-time" key={`${index + 1}-${suffix}`}>
                                  <div className="mb-3">
                                    <label className="form-label">{index + 1}{suffix} Service Time</label>
                                    <input
                                      className="form-control sunday-service-input"
                                      type="time"
                                      value={value}
                                      onChange={(e) => {
                                        const nextTimes = [...form.sundayTimes];
                                        nextTimes[index] = e.target.value;
                                        setField("sundayTimes", nextTimes);
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bg-light p-3 rounded mb-3">
                          <h6 className="mb-3">Wednesday Service</h6>
                          <div className="row">
                            <div className="col-md-4">
                              <div className="mb-3">
                                <label className="form-label">Wednesday Service Time</label>
                                <input className="form-control" type="time" value={form.wednesdayTime} onChange={(e) => setField("wednesdayTime", e.target.value)} />
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="form-check mt-4">
                                <input className="form-check-input" checked={form.wednesdayEnabled} onChange={(e) => setField("wednesdayEnabled", e.target.checked)} type="checkbox" id="registerWednesdayEnabled" />
                                <label className="form-check-label" htmlFor="registerWednesdayEnabled">Wednesday service is active</label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-light p-3 rounded mb-3">
                          <h6 className="mb-3">Week of Spiritual Emphasis (WOSE)</h6>
                          <p className="text-muted small mb-3">WOSE occurs on the first week of every month (Wednesday, Thursday, Friday)</p>
                          <div className="row">
                            <div className="col-md-3"><div className="mb-3"><label className="form-label">Wednesday Time</label><input className="form-control" type="time" value={form.woseWednesdayTime} onChange={(e) => setField("woseWednesdayTime", e.target.value)} /></div></div>
                            <div className="col-md-3"><div className="mb-3"><label className="form-label">Thursday Time</label><input className="form-control" type="time" value={form.woseThursdayTime} onChange={(e) => setField("woseThursdayTime", e.target.value)} /></div></div>
                            <div className="col-md-3"><div className="mb-3"><label className="form-label">Friday Time</label><input className="form-control" type="time" value={form.woseFridayTime} onChange={(e) => setField("woseFridayTime", e.target.value)} /></div></div>
                            <div className="col-md-3">
                              <div className="form-check mt-4">
                                <input className="form-check-input" checked={form.woseEnabled} onChange={(e) => setField("woseEnabled", e.target.checked)} type="checkbox" id="registerWoseEnabled" />
                                <label className="form-check-label" htmlFor="registerWoseEnabled">WOSE is active</label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-light p-3 rounded">
                          <h6 className="mb-3">Special / Unplanned Services</h6>
                          <p className="text-muted small mb-3">Enable this to allow recording attendance for ad-hoc services</p>
                          <div className="form-check">
                            <input className="form-check-input" checked={form.specialServicesEnabled} onChange={(e) => setField("specialServicesEnabled", e.target.checked)} type="checkbox" id="registerSpecialServicesEnabled" />
                            <label className="form-check-label" htmlFor="registerSpecialServicesEnabled">Allow special/unplanned services</label>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex justify-content-between">
                        <button className="btn btn-outline-secondary" onClick={prevStep} type="button"><i className="ti ti-arrow-left me-1" /> Previous</button>
                        <button className="btn btn-primary" onClick={nextStep} type="button">Next <i className="ti ti-arrow-right ms-1" /></button>
                      </div>
                    </div>

                    <div className={`step ${currentStep === 4 ? "active" : ""}`}>
                      <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3"><i className="ti ti-lock me-2" />Admin Account Setup</h5>
                        <div className="row">
                          <div className="col-md-6"><div className="mb-3"><label className="form-label">Admin Full Name</label><input className="form-control" type="text" value={form.adminName} onChange={(e) => setField("adminName", e.target.value)} /></div></div>
                          <div className="col-md-6"><div className="mb-3"><label className="form-label">Admin Phone Number</label><input className="form-control" type="text" value={form.adminPhone} onChange={(e) => setField("adminPhone", e.target.value)} /></div></div>
                          <div className="col-md-6"><div className="mb-3"><label className="form-label">Admin Email</label><input className="form-control" type="email" value={form.adminEmail} onChange={(e) => setField("adminEmail", e.target.value)} /></div></div>
                          <div className="col-md-6" />
                          <div className="col-md-6"><div className="mb-3"><label className="form-label">Password</label><input className="form-control" type="password" value={form.adminPassword} onChange={(e) => setField("adminPassword", e.target.value)} /></div></div>
                          <div className="col-md-6"><div className="mb-3"><label className="form-label">Confirm Password</label><input className="form-control" type="password" value={form.adminPasswordConfirmation} onChange={(e) => setField("adminPasswordConfirmation", e.target.value)} /></div></div>
                        </div>
                      </div>

                      <div className="border rounded p-4 mb-4">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className="mb-1"><i className="ti ti-wallet me-2" />Finance Tracking (Optional)</h5>
                            <p className="text-muted small mb-0">Enable to track offerings, tithes and donations per service</p>
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" checked={form.financeEnabled} onChange={(e) => setField("financeEnabled", e.target.checked)} type="checkbox" id="registerFinanceEnabled" />
                            <label className="form-check-label" htmlFor="registerFinanceEnabled">Enable</label>
                          </div>
                        </div>
                      </div>

                      <div className="d-flex justify-content-between">
                        <button className="btn btn-outline-secondary" onClick={prevStep} type="button"><i className="ti ti-arrow-left me-1" /> Previous</button>
                        <button className="btn btn-success btn-lg" disabled={isPending} onClick={completeRegistration} type="button">
                          <i className={`ti ${isPending ? "ti-loader" : "ti-check"} me-1`} /> {isPending ? "Creating..." : "Complete Registration"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .step {
          display: none;
        }
        .step.active {
          display: block;
        }
        .step-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          transition: all 0.3s;
        }
        .step-indicator.active {
          background: #0d6efd;
          color: white;
        }
        .step-indicator.completed {
          background: #198754;
          color: white;
        }
        .step-indicator.pending {
          background: #e9ecef;
          color: #6c757d;
        }
        .step-line {
          height: 3px;
          flex: 1;
          margin: 0 8px;
          min-width: 36px;
        }
        .step-line.completed {
          background: #198754;
        }
        .step-line.pending {
          background: #e9ecef;
        }
      `}</style>
    </div>
  );
}
