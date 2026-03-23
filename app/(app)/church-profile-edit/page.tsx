"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useChurchSetupData } from "@/components/church-setup/use-church-setup-data";
import { useSessionContext } from "@/components/providers/auth-guard";
import { TemplateLoader } from "@/components/ui/template-loader";
import { saveSession } from "@/lib/session";
import {
  fetchLgasByStateSlug,
  fetchStates,
  updateBranch,
  updateChurchProfile,
} from "@/lib/workspace-api";
import type {
  LocationLgaRecord,
  LocationStateRecord,
} from "@/types/api";

interface ProfileFormState {
  churchName: string;
  churchCode: string;
  churchCity: string;
  churchAddress: string;
  churchEmail: string;
  churchPhone: string;
  churchStatus: string;
  churchLga: string;
  pastorName: string;
  pastorPhone: string;
  pastorEmail: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;
  adminPasswordConfirmation: string;
  financeEnabled: boolean;
}

const emptyForm: ProfileFormState = {
  churchName: "",
  churchCode: "",
  churchCity: "",
  churchAddress: "",
  churchEmail: "",
  churchPhone: "",
  churchStatus: "active",
  churchLga: "",
  pastorName: "",
  pastorPhone: "",
  pastorEmail: "",
  adminId: "",
  adminName: "",
  adminEmail: "",
  adminPhone: "",
  adminPassword: "",
  adminPasswordConfirmation: "",
  financeEnabled: false,
};

export default function ChurchProfileEditRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const { church, branch, isLoading, error } = useChurchSetupData(session);
  const primaryAdmin = useMemo(
    () => branch?.local_admin || church?.users?.find((user) => user.role === "church_admin") || church?.users?.[0] || null,
    [branch, church],
  );
  const workspace = branch || church;
  const workspaceTitle = branch ? "Edit Branch Profile" : "Edit Church Profile";
  const workspaceLabel = branch ? "branch" : "church";

  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [states, setStates] = useState<LocationStateRecord[]>([]);
  const [lgas, setLgas] = useState<LocationLgaRecord[]>([]);
  const [selectedStateSlug, setSelectedStateSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadStates() {
      try {
        const response = await fetchStates();

        if (active) {
          setStates(response.data || []);
        }
      } catch (loadError) {
        if (active) {
          setPageError(loadError instanceof Error ? loadError.message : "Unable to load states.");
        }
      }
    }

    void loadStates();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    setForm({
      churchName: workspace.name || "",
      churchCode: workspace.code || "",
      churchCity: workspace.city || "",
      churchAddress: workspace.address || "",
      churchEmail: workspace.email || "",
      churchPhone: workspace.phone || "",
      churchStatus: workspace.status || "active",
      churchLga: workspace.district_area || "",
      pastorName: workspace.pastor_name || "",
      pastorPhone: workspace.pastor_phone || "",
      pastorEmail: workspace.pastor_email || "",
      adminId: primaryAdmin?.id ? String(primaryAdmin.id) : "",
      adminName: primaryAdmin?.name || "",
      adminEmail: primaryAdmin?.email || "",
      adminPhone: primaryAdmin?.phone || "",
      adminPassword: "",
      adminPasswordConfirmation: "",
      financeEnabled: Boolean(workspace.finance_enabled),
    });
  }, [primaryAdmin, workspace]);

  useEffect(() => {
    if (!workspace?.state || states.length === 0) {
      return;
    }

    const matchingState = states.find(
      (state) => state.name.trim().toLowerCase() === workspace.state?.trim().toLowerCase(),
    );

    if (matchingState?.slug) {
      setSelectedStateSlug(matchingState.slug);
    }
  }, [states, workspace?.state]);

  useEffect(() => {
    let active = true;

    async function loadLgas() {
      if (!selectedStateSlug) {
        setLgas([]);
        return;
      }

      try {
        const response = await fetchLgasByStateSlug(selectedStateSlug);

        if (active) {
          setLgas(response.data || []);
        }
      } catch (loadError) {
        if (active) {
          setPageError(loadError instanceof Error ? loadError.message : "Unable to load LGAs.");
        }
      }
    }

    void loadLgas();

    return () => {
      active = false;
    };
  }, [selectedStateSlug]);

  function updateField<Key extends keyof ProfileFormState>(key: Key, value: ProfileFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleStateChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextSlug = event.target.value;
    setSelectedStateSlug(nextSlug);
    updateField("churchLga", "");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageError("");
    setIsSubmitting(true);

    try {
      const selectedState = states.find((state) => state.slug === selectedStateSlug) || null;

      if (branch) {
        await updateBranch(branch.id, {
          name: form.churchName.trim(),
          code: form.churchCode.trim() || null,
          address: form.churchAddress.trim() || null,
          city: form.churchCity.trim() || null,
          state: selectedState?.name || null,
          district_area: form.churchLga || null,
          email: form.churchEmail.trim() || null,
          phone: form.churchPhone.trim() || null,
          status: form.churchStatus || "active",
          pastor_name: form.pastorName.trim() || null,
          pastor_phone: form.pastorPhone.trim() || null,
          pastor_email: form.pastorEmail.trim() || null,
          finance_enabled: form.financeEnabled,
          special_services_enabled: Boolean(branch.special_services_enabled),
          branch_tag_id: branch.tag?.id || null,
          admin: {
            name: form.adminName.trim() || null,
            email: form.adminEmail.trim() || null,
            phone: form.adminPhone.trim() || null,
            password: form.adminPassword || null,
            password_confirmation: form.adminPasswordConfirmation || null,
          },
        });

        saveSession({
          branch: {
            ...session.branch,
            id: branch.id,
            name: form.churchName.trim(),
            code: form.churchCode.trim() || null,
            status: form.churchStatus || "active",
          },
          user: session.user?.id === Number(form.adminId)
            ? {
                ...session.user,
                name: form.adminName.trim(),
                email: form.adminEmail.trim(),
                phone: form.adminPhone.trim(),
              }
            : session.user,
        });
      } else {
        await updateChurchProfile(Number(session.church?.id), {
          church: {
            name: form.churchName.trim(),
            code: form.churchCode.trim() || null,
            address: form.churchAddress.trim() || null,
            city: form.churchCity.trim() || null,
            state: selectedState?.name || null,
            district_area: form.churchLga || null,
            email: form.churchEmail.trim() || null,
            phone: form.churchPhone.trim() || null,
            status: form.churchStatus || "active",
          },
          pastor: {
            name: form.pastorName.trim(),
            phone: form.pastorPhone.trim(),
            email: form.pastorEmail.trim() || null,
          },
          settings: {
            finance_enabled: form.financeEnabled,
          },
          admin: {
            id: form.adminId ? Number(form.adminId) : null,
            name: form.adminName.trim(),
            email: form.adminEmail.trim(),
            phone: form.adminPhone.trim(),
            password: form.adminPassword || null,
            password_confirmation: form.adminPasswordConfirmation || null,
          },
        });

        saveSession({
          church: {
            ...session.church,
            id: Number(session.church?.id),
            name: form.churchName.trim(),
            code: form.churchCode.trim() || null,
          },
          user: session.user?.id === Number(form.adminId)
            ? {
                ...session.user,
                name: form.adminName.trim(),
                email: form.adminEmail.trim(),
                phone: form.adminPhone.trim(),
              }
            : session.user,
        });
      }

      router.replace("/church-profile?updated=1");
    } catch (submitError) {
      setPageError(submitError instanceof Error ? submitError.message : `Unable to save ${workspaceLabel} profile.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading && !workspace) {
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
                  <h4 className="mb-1">{workspaceTitle}</h4>
                  <p className="text-secondary mb-0">
                    Update church information, pastor record, admin contact and finance setting.
                  </p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-outline-secondary" href="/church-profile">
                    <i className="ti ti-arrow-left me-1" />
                    Back to View
                  </Link>
                  <Link className="btn btn-outline-primary" href="/service-schedule">
                    <i className="ti ti-calendar me-1" />
                    Service Schedule
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

        <div className="col-12">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-lg-8">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Church Information</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <FormInput
                        className="col-md-6"
                        label="Church Name"
                        onChange={(event) => updateField("churchName", event.target.value)}
                        value={form.churchName}
                      />
                      <FormInput
                        className="col-md-6"
                        label="Church Code"
                        onChange={(event) => updateField("churchCode", event.target.value)}
                        value={form.churchCode}
                      />
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="churchState">State</label>
                          <select
                            className="form-select"
                            id="churchState"
                            onChange={handleStateChange}
                            value={selectedStateSlug}
                          >
                            <option value="">Select state</option>
                            {states.map((state) => (
                              <option key={state.id} value={state.slug || ""}>
                                {state.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <FormInput
                        className="col-md-4"
                        label="City"
                        onChange={(event) => updateField("churchCity", event.target.value)}
                        value={form.churchCity}
                      />
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="churchLga">LGA / District Area</label>
                          <select
                            className="form-select"
                            id="churchLga"
                            onChange={(event) => updateField("churchLga", event.target.value)}
                            value={form.churchLga}
                          >
                            <option value="">{selectedStateSlug ? "Select LGA" : "Select state first"}</option>
                            {lgas.map((lga) => (
                              <option key={lga.id} value={lga.name}>
                                {lga.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="col-12">
                        <div className="mb-3">
                          <label className="form-label" htmlFor="churchAddress">Address</label>
                          <textarea
                            className="form-control"
                            id="churchAddress"
                            onChange={(event) => updateField("churchAddress", event.target.value)}
                            rows={2}
                            value={form.churchAddress}
                          />
                        </div>
                      </div>
                      <FormInput
                        className="col-md-6"
                        label="Church Email"
                        onChange={(event) => updateField("churchEmail", event.target.value)}
                        type="email"
                        value={form.churchEmail}
                      />
                      <FormInput
                        className="col-md-6"
                        label="Church Phone"
                        onChange={(event) => updateField("churchPhone", event.target.value)}
                        value={form.churchPhone}
                      />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Pastor In Charge</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <FormInput
                        className="col-md-4"
                        label="Full Name"
                        onChange={(event) => updateField("pastorName", event.target.value)}
                        value={form.pastorName}
                      />
                      <FormInput
                        className="col-md-4"
                        label="Phone Number"
                        onChange={(event) => updateField("pastorPhone", event.target.value)}
                        value={form.pastorPhone}
                      />
                      <FormInput
                        className="col-md-4"
                        label="Email"
                        onChange={(event) => updateField("pastorEmail", event.target.value)}
                        type="email"
                        value={form.pastorEmail}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Primary Admin</h5>
                  </div>
                  <div className="card-body">
                    <FormInput
                      label="Full Name"
                      onChange={(event) => updateField("adminName", event.target.value)}
                      value={form.adminName}
                    />
                    <FormInput
                      label="Email"
                      onChange={(event) => updateField("adminEmail", event.target.value)}
                      type="email"
                      value={form.adminEmail}
                    />
                    <FormInput
                      label="Phone Number"
                      onChange={(event) => updateField("adminPhone", event.target.value)}
                      value={form.adminPhone}
                    />
                    <FormInput
                      helpText="Leave blank to keep current password"
                      label="New Password"
                      onChange={(event) => updateField("adminPassword", event.target.value)}
                      type="password"
                      value={form.adminPassword}
                    />
                    <FormInput
                      label="Confirm New Password"
                      last
                      onChange={(event) => updateField("adminPasswordConfirmation", event.target.value)}
                      type="password"
                      value={form.adminPasswordConfirmation}
                    />
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Settings</h5>
                  </div>
                  <div className="card-body">
                    <div className="form-check form-switch">
                      <input
                        checked={form.financeEnabled}
                        className="form-check-input"
                        id="financeEnabled"
                        onChange={(event) => updateField("financeEnabled", event.target.checked)}
                        type="checkbox"
                      />
                      <label className="form-check-label" htmlFor="financeEnabled">Enable finance tracking</label>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">
                    <h5 className="mb-0">Actions</h5>
                  </div>
                  <div className="card-body d-grid gap-2">
                    <button className="btn btn-primary" disabled={isSubmitting} type="submit">
                      <i className={`ti ${isSubmitting ? "ti-loader" : "ti-device-floppy"} me-1`} />
                      {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                    <Link className="btn btn-outline-secondary" href="/church-profile">
                      Cancel
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </form>
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
  helpText,
  last = false,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  className?: string;
  helpText?: string;
  last?: boolean;
}) {
  return (
    <div className={className}>
      <div className={`mb-3 ${last ? "mb-0" : ""}`}>
        <label className="form-label">{label}</label>
        <input className="form-control" onChange={onChange} type={type} value={value} />
        {helpText ? <small className="text-muted">{helpText}</small> : null}
      </div>
    </div>
  );
}
