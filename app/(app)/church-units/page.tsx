"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import {
  createChurchUnit,
  fetchChurchUnits,
  getChurchId,
  updateChurchUnit,
} from "@/lib/workspace-api";
import type { ChurchUnitRecord } from "@/types/api";

interface UnitFormState {
  name: string;
  code: string;
  status: string;
  description: string;
}

const defaultUnitForm: UnitFormState = {
  name: "",
  code: "",
  status: "active",
  description: "",
};

export default function ChurchUnitsRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);

  const [units, setUnits] = useState<ChurchUnitRecord[]>([]);
  const [currentEditUnitId, setCurrentEditUnitId] = useState<number | null>(null);
  const [form, setForm] = useState<UnitFormState>(defaultUnitForm);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadUnits() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetchChurchUnits(churchId);

        if (!active) {
          return;
        }

        setUnits(response.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load church units right now.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadUnits();

    return () => {
      active = false;
    };
  }, [churchId]);

  const filteredUnits = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return units.filter((unit) => {
      const statusMatches = !statusFilter || unit.status === statusFilter;
      const searchMatches = !searchValue || [
        unit.name,
        unit.code,
        unit.description,
      ].some((value) => String(value || "").toLowerCase().includes(searchValue));

      return statusMatches && searchMatches;
    });
  }, [search, statusFilter, units]);

  const stats = useMemo(() => ({
    total: units.length,
    active: units.filter((unit) => unit.status === "active").length,
    inactive: units.filter((unit) => unit.status !== "active").length,
    assignments: units.reduce((total, unit) => total + Number(unit.members_count || 0), 0),
  }), [units]);

  function updateField<Key extends keyof UnitFormState>(key: Key, value: UnitFormState[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setCurrentEditUnitId(null);
    setForm(defaultUnitForm);
    setSuccessMessage("");
    setErrorMessage("");
  }

  function fillForm(unit: ChurchUnitRecord) {
    setCurrentEditUnitId(unit.id);
    setForm({
      name: unit.name || "",
      code: unit.code || "",
      status: unit.status || "active",
      description: unit.description || "",
    });
    setSuccessMessage("Church unit loaded for editing.");
    setErrorMessage("");
  }

  async function refreshUnits() {
    const response = await fetchChurchUnits(churchId);
    setUnits(response.data || []);
  }

  async function handleSave() {
    setErrorMessage("");
    setSuccessMessage("");

    const payload = {
      church_id: churchId,
      name: form.name.trim(),
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      status: form.status || "active",
    };

    if (!payload.name) {
      setErrorMessage("Enter the church unit name.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (currentEditUnitId) {
        await updateChurchUnit(currentEditUnitId, {
          name: payload.name,
          code: payload.code,
          description: payload.description,
          status: payload.status,
        });
      } else {
        await createChurchUnit(payload);
      }

      await refreshUnits();
      resetForm();
      setSuccessMessage(currentEditUnitId ? "Church unit updated successfully." : "Church unit created successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to save this church unit right now.");
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
                  <h4 className="mb-1">Church Units</h4>
                  <p className="text-secondary mb-0">Build the unit list for your church here, then assign one member to one or many units from the Members page.</p>
                </div>
                <Link className="btn btn-outline-primary" href="/member-registry">
                  <i className="ti ti-users me-1" />
                  Back to Member Registry
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Units" value={stats.total} valueClass="text-primary">Configured registry</StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Active Units" value={stats.active} valueClass="text-success">Available for members</StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Inactive Units" value={stats.inactive} valueClass="text-warning">Hidden from assignment</StatCard>
        <StatCard borderClass="b-s-3-info" badgeClass="text-light-info" label="Member Assignments" value={stats.assignments} valueClass="text-info">Across all units</StatCard>

        <div className="col-xl-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">{currentEditUnitId ? "Edit Church Unit" : "Add Church Unit"}</h5>
            </div>
            <div className="card-body">
              <InputField label="Unit Name *" placeholder="Choir, Ushering, Media..." value={form.name} onChange={(value) => updateField("name", value)} />
              <InputField label="Unit Code" placeholder="Optional short code" value={form.code} onChange={(value) => updateField("code", value)} />
              <div className="mb-3">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={(event) => updateField("status", event.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="mb-0">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  placeholder="What does this unit cover?"
                  rows={4}
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                />
              </div>
            </div>
            <div className="card-footer d-flex justify-content-end gap-2">
              <button className={`btn btn-outline-secondary ${currentEditUnitId ? "" : "d-none"}`} onClick={resetForm} type="button">
                Cancel Edit
              </button>
              <button className="btn btn-primary" disabled={isSubmitting} onClick={() => void handleSave()} type="button">
                <i className={`ti ${isSubmitting ? "ti-loader" : "ti-device-floppy"} me-1`} />
                {currentEditUnitId ? "Update Unit" : "Save Unit"}
              </button>
            </div>
          </div>
        </div>

        <div className="col-xl-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Unit Registry</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" style={{ width: 150 }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <input className="form-control form-control-sm" placeholder="Search units..." style={{ width: 220 }} type="text" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Unit</th>
                      <th>Code</th>
                      <th>Members</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.length > 0 ? filteredUnits.map((unit) => (
                      <tr key={unit.id}>
                        <td>
                          <strong>{unit.name}</strong>
                          <div className="small text-secondary">{unit.description || "--"}</div>
                        </td>
                        <td>{unit.code || "--"}</td>
                        <td>{unit.members_count || 0}</td>
                        <td>
                          <span className={`badge ${unit.status === "active" ? "text-light-success" : "text-light-warning"}`}>
                            {unit.status || "active"}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-light-primary" onClick={() => fillForm(unit)} type="button">
                            <i className="ti ti-edit me-1" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={5}>No units found for the current filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="alert alert-info mb-0">
            <i className="ti ti-info-circle me-2" />
            <strong>Tip:</strong> keep this registry clean. Members can be assigned to more than one unit, so create each unit once and reuse it everywhere.
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-3">
      <label className="form-label">{label}</label>
      <input className="form-control" placeholder={placeholder} type="text" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  borderClass,
  badgeClass,
  children,
}: {
  label: string;
  value: number;
  valueClass: string;
  borderClass: string;
  badgeClass: string;
  children: ReactNode;
}) {
  return (
    <div className="col-md-6 col-xl-3">
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
