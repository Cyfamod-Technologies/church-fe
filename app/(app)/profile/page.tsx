"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel } from "@/lib/format";
import { isHomecellLeaderSession, saveSession } from "@/lib/session";
import {
  fetchHomecellLeaderProfile,
  updateHomecellLeaderProfile,
} from "@/lib/workspace-api";
import type { HomecellLeaderProfileRecord } from "@/types/api";

interface LeaderProfileFormState {
  name: string;
  role: string;
  phone: string;
  email: string;
  homecell: string;
  branch: string;
  password: string;
}

const emptyLeaderProfileForm: LeaderProfileFormState = {
  name: "",
  role: "Leader",
  phone: "",
  email: "",
  homecell: "--",
  branch: "--",
  password: "",
};

export default function ProfileRoute() {
  const session = useSessionContext();
  const isLeader = isHomecellLeaderSession(session);

  if (isLeader) {
    return <HomecellLeaderProfilePage />;
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h4 className="mb-1">Profile</h4>
              <p className="text-secondary mb-0">Current signed-in user details from the active workspace session.</p>
            </div>
          </div>
        </div>
        <div className="col-xl-6">
          <div className="card">
            <div className="card-header"><h5 className="mb-0">Account</h5></div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Name</span><strong>{session.user?.name || "--"}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Email</span><strong>{session.user?.email || "--"}</strong></div>
              <div className="border rounded p-3 mb-3"><span className="text-secondary small d-block mb-1">Phone</span><strong>{session.user?.phone || "--"}</strong></div>
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

function HomecellLeaderProfilePage() {
  const session = useSessionContext();
  const homecellLeaderId = session.homecell_leader?.id ? Number(session.homecell_leader.id) : null;

  const [form, setForm] = useState<LeaderProfileFormState>(emptyLeaderProfileForm);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!homecellLeaderId) {
        setErrorMessage("Missing homecell leader session.");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetchHomecellLeaderProfile(homecellLeaderId);

        if (!active) {
          return;
        }

        setForm(buildForm(response.data, session.church?.name || null));
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load your leader profile right now.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [homecellLeaderId, session.church?.name]);

  async function handleSave() {
    if (!homecellLeaderId) {
      setErrorMessage("Missing homecell leader session.");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const response = await updateHomecellLeaderProfile(homecellLeaderId, {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        password: form.password || null,
      });

      const nextLeader = response.data;
      setForm(buildForm(nextLeader, session.church?.name || null));

      saveSession({
        user: nextLeader.login_account ? {
          ...(session.user || {}),
          id: nextLeader.login_account.id,
          name: nextLeader.login_account.name,
          email: nextLeader.login_account.email,
          phone: nextLeader.login_account.phone,
          role: nextLeader.login_account.role,
        } : session.user,
        branch: nextLeader.homecell?.branch || null,
        homecell: nextLeader.homecell || session.homecell,
        homecell_leader: {
          id: nextLeader.id,
          name: nextLeader.name,
          role: nextLeader.role,
          phone: nextLeader.phone,
          email: nextLeader.email,
          user_id: nextLeader.user_id,
        },
      });

      setSuccessMessage("Profile updated successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to update your profile right now.");
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
                  <h4 className="mb-1">My Profile</h4>
                  <p className="text-secondary mb-0">Keep your name, phone, email, and login password current for your homecell leader workspace.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link className="btn btn-outline-secondary" href="/dashboard">
                    <i className="ti ti-layout-dashboard me-1" />
                    Back to Dashboard
                  </Link>
                  <Link className="btn btn-primary" href="/homecell-attendance">
                    <i className="ti ti-clipboard-plus me-1" />
                    Record Attendance
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

        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Leader Details</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <Field className="col-md-6" label="Full Name" value={form.name} onChange={(value) => updateForm(setForm, "name", value)} />
                <Field className="col-md-6" disabled label="Role" value={form.role} onChange={() => undefined} />
                <Field className="col-md-6" label="Phone" value={form.phone} onChange={(value) => updateForm(setForm, "phone", value)} />
                <Field className="col-md-6" label="Email" type="email" value={form.email} onChange={(value) => updateForm(setForm, "email", value)} />
                <Field className="col-md-6" disabled label="Assigned Homecell" value={form.homecell} onChange={() => undefined} />
                <Field className="col-md-6" disabled label="Assigned Branch" value={form.branch} onChange={() => undefined} />
                <Field
                  className="col-12"
                  helpText="Leave blank to keep your current password."
                  label="Change Password"
                  placeholder="Leave blank to keep your current password"
                  type="password"
                  value={form.password}
                  onChange={(value) => updateForm(setForm, "password", value)}
                />
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button className="btn btn-primary" disabled={isSaving} onClick={() => void handleSave()} type="button">
                <i className={`ti ${isSaving ? "ti-loader" : "ti-device-floppy"} me-1`} />
                {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Profile Guide</h5>
            </div>
            <div className="card-body d-grid gap-3">
              <GuideCard label="What updates here" value="Your leader profile and your login account stay in sync." />
              <GuideCard label="Password" value="Leave it blank if you only want to update your contact details." />
              <GuideCard label="Scope" value="This profile remains tied to your assigned homecell." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildForm(leader: HomecellLeaderProfileRecord | null, churchName: string | null) {
  return {
    name: leader?.name || "",
    role: leader?.role || "Leader",
    phone: leader?.phone || "",
    email: leader?.email || "",
    homecell: leader?.homecell?.name || "--",
    branch: leader?.homecell?.branch?.name || (churchName ? `${churchName} (Main Church)` : "--"),
    password: "",
  };
}

function updateForm(
  setForm: React.Dispatch<React.SetStateAction<LeaderProfileFormState>>,
  key: keyof LeaderProfileFormState,
  value: string,
) {
  setForm((current) => ({
    ...current,
    [key]: value,
  }));
}

function Field({
  label,
  value,
  onChange,
  className = "col-md-6",
  type = "text",
  disabled = false,
  placeholder,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input
          className="form-control"
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {helpText ? <small className="text-muted">{helpText}</small> : null}
      </div>
    </div>
  );
}

function GuideCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-3">
      <span className="text-secondary small d-block mb-1">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
