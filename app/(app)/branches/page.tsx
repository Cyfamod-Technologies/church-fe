"use client";

import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatLabel } from "@/lib/format";
import {
  createBranch,
  createBranchTag,
  deleteBranchTag,
  detachBranch,
  fetchBranch,
  fetchBranchParents,
  fetchBranches,
  fetchBranchTags,
  fetchLgasByStateSlug,
  fetchStates,
  getBranchId,
  getChurchId,
  reassignBranch,
  updateBranch,
} from "@/lib/workspace-api";
import type {
  BranchAssignmentHistoryRecord,
  BranchParentOptionsResponse,
  BranchRecord,
  BranchTagRecord,
  LocationLgaRecord,
  LocationStateRecord,
} from "@/types/api";

interface BranchFormState {
  id: string;
  name: string;
  code: string;
  branch_tag_id: string;
  custom_tag_name: string;
  pastor_name: string;
  pastor_phone: string;
  pastor_email: string;
  status: string;
  city: string;
  district_area: string;
  phone: string;
  email: string;
  address: string;
  admin_name: string;
  admin_email: string;
  admin_phone: string;
  admin_password: string;
  admin_password_confirmation: string;
}

const emptyBranchForm: BranchFormState = {
  id: "",
  name: "",
  code: "",
  branch_tag_id: "",
  custom_tag_name: "",
  pastor_name: "",
  pastor_phone: "",
  pastor_email: "",
  status: "active",
  city: "",
  district_area: "",
  phone: "",
  email: "",
  address: "",
  admin_name: "",
  admin_email: "",
  admin_phone: "",
  admin_password: "",
  admin_password_confirmation: "",
};

export default function BranchesRoute() {
  const session = useSessionContext();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [branchTags, setBranchTags] = useState<BranchTagRecord[]>([]);
  const [states, setStates] = useState<LocationStateRecord[]>([]);
  const [lgas, setLgas] = useState<LocationLgaRecord[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState<BranchFormState>(emptyBranchForm);
  const [branchStateSlug, setBranchStateSlug] = useState("");

  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedBranchDetails, setSelectedBranchDetails] = useState<BranchRecord | null>(null);

  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [isReassigning, setIsReassigning] = useState(false);
  const [reassignBranchRecord, setReassignBranchRecord] = useState<BranchRecord | null>(null);
  const [reassignSelection, setReassignSelection] = useState("");
  const [reassignNote, setReassignNote] = useState("");
  const [parentOptions, setParentOptions] = useState<BranchParentOptionsResponse["data"]>({
    churches: [],
    branches: [],
  });

  const visibleBranches = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return branches.filter((branch) => {
      const tagMatches = !tagFilter || branch.tag?.slug === tagFilter;
      const searchMatches = !normalizedSearch || [
        branch.name,
        branch.city,
        branch.district_area,
        branch.state,
        branch.pastor_name,
        branch.current_parent?.name,
      ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));

      return tagMatches && searchMatches;
    });
  }, [branches, search, tagFilter]);

  const orderedBranches = useMemo(() => buildHierarchyRows(visibleBranches), [visibleBranches]);
  const stats = useMemo(() => ({
    total: visibleBranches.length,
    direct: visibleBranches.filter(
      (branch) => branch.current_parent?.type === "church" && branch.current_parent.id === churchId,
    ).length,
    sub: visibleBranches.filter((branch) => branch.current_parent?.type === "branch").length,
  }), [churchId, visibleBranches]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [branchesResponse, tagsResponse, statesResponse] = await Promise.all([
          fetchBranches(churchId, branchId),
          fetchBranchTags(churchId),
          fetchStates(),
        ]);

        if (!active) {
          return;
        }

        setBranches(branchesResponse.data || []);
        setBranchTags(tagsResponse.data || []);
        setStates(statesResponse.data || []);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load branches.");
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
  }, [branchId, churchId]);

  async function refreshBranches() {
    const response = await fetchBranches(churchId, branchId);
    setBranches(response.data || []);
  }

  async function refreshBranchTags() {
    const response = await fetchBranchTags(churchId);
    setBranchTags(response.data || []);
  }

  function resetAlerts() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function getStateSlugByName(stateName?: string | null) {
    if (!stateName) {
      return "";
    }

    return states.find((state) => state.name.trim().toLowerCase() === stateName.trim().toLowerCase())?.slug || "";
  }

  async function loadLgasForState(stateSlug: string, selectedLga = "") {
    if (!stateSlug) {
      setLgas([]);
      setBranchForm((current) => ({
        ...current,
        district_area: selectedLga,
      }));
      return;
    }

    const response = await fetchLgasByStateSlug(stateSlug);
    setLgas(response.data || []);
    setBranchForm((current) => ({
      ...current,
      district_area: selectedLga,
    }));
  }

  function openAddBranchModal() {
    resetAlerts();
    setBranchForm(emptyBranchForm);
    setBranchStateSlug("");
    setLgas([]);
    setIsBranchModalOpen(true);
  }

  async function openEditBranchModal(branch: BranchRecord) {
    resetAlerts();
    const nextStateSlug = getStateSlugByName(branch.state);

    setBranchForm({
      id: String(branch.id),
      name: branch.name || "",
      code: branch.code || "",
      branch_tag_id: branch.tag?.id ? String(branch.tag.id) : "",
      custom_tag_name: "",
      pastor_name: branch.pastor_name || "",
      pastor_phone: branch.pastor_phone || "",
      pastor_email: branch.pastor_email || "",
      status: branch.status || "active",
      city: branch.city || "",
      district_area: branch.district_area || "",
      phone: branch.phone || "",
      email: branch.email || "",
      address: branch.address || "",
      admin_name: branch.local_admin?.name || "",
      admin_email: branch.local_admin?.email || "",
      admin_phone: branch.local_admin?.phone || "",
      admin_password: "",
      admin_password_confirmation: "",
    });
    setBranchStateSlug(nextStateSlug);
    setIsBranchModalOpen(true);
    await loadLgasForState(nextStateSlug, branch.district_area || "");
  }

  async function resolveBranchTagId() {
    if (branchForm.branch_tag_id !== "custom") {
      return Number(branchForm.branch_tag_id || 0) || null;
    }

    if (!branchForm.custom_tag_name.trim()) {
      throw new Error("Enter a custom tag name or select an existing tag.");
    }

    const response = await createBranchTag({
      church_id: churchId,
      name: branchForm.custom_tag_name.trim(),
    });

    await refreshBranchTags();
    return Number((response.data as { id?: number } | undefined)?.id || 0) || null;
  }

  async function handleBranchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetAlerts();
    setIsSavingBranch(true);

    try {
      const branchId = Number(branchForm.id || 0) || null;
      const branchTagId = await resolveBranchTagId();
      const selectedState = states.find((state) => state.slug === branchStateSlug) || null;

      const payload: Record<string, unknown> = {
        name: branchForm.name.trim(),
        code: branchForm.code.trim() || null,
        branch_tag_id: branchTagId,
        pastor_name: branchForm.pastor_name.trim() || null,
        pastor_phone: branchForm.pastor_phone.trim() || null,
        pastor_email: branchForm.pastor_email.trim() || null,
        status: branchForm.status || "active",
        state: selectedState?.name || null,
        city: branchForm.city.trim() || null,
        district_area: branchForm.district_area || null,
        phone: branchForm.phone.trim() || null,
        email: branchForm.email.trim() || null,
        address: branchForm.address.trim() || null,
      };

      const hasAdminValues = [
        branchForm.admin_name,
        branchForm.admin_email,
        branchForm.admin_phone,
        branchForm.admin_password,
        branchForm.admin_password_confirmation,
      ].some((value) => value.trim());

      if (hasAdminValues) {
        payload.admin = {
          name: branchForm.admin_name.trim() || null,
          email: branchForm.admin_email.trim() || null,
          phone: branchForm.admin_phone.trim() || null,
          password: branchForm.admin_password || null,
          password_confirmation: branchForm.admin_password_confirmation || null,
        };
      }

      if (branchId) {
        await updateBranch(branchId, payload);
        setSuccessMessage("Branch updated successfully.");
      } else {
        await createBranch({
          ...payload,
          created_by_church_id: churchId,
          created_by_user_id: session.user?.id || null,
          created_by_actor_type: session.user?.id ? "user" : "church",
        });
        setSuccessMessage("Branch created successfully.");
      }

      await refreshBranches();
      setIsBranchModalOpen(false);
      setBranchForm(emptyBranchForm);
      setBranchStateSlug("");
      setLgas([]);
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "Unable to save branch.");
    } finally {
      setIsSavingBranch(false);
    }
  }

  async function handleAddTag() {
    resetAlerts();

    if (!newTagName.trim()) {
      setErrorMessage("Enter a tag name first.");
      return;
    }

    setIsSavingTag(true);

    try {
      await createBranchTag({
        church_id: churchId,
        name: newTagName.trim(),
      });

      setNewTagName("");
      await refreshBranchTags();
      setSuccessMessage("Branch tag added successfully.");
    } catch (saveError) {
      setErrorMessage(saveError instanceof Error ? saveError.message : "Unable to add branch tag.");
    } finally {
      setIsSavingTag(false);
    }
  }

  async function handleDeleteTag(tagId: number) {
    resetAlerts();

    if (!window.confirm("Delete this custom tag?")) {
      return;
    }

    try {
      await deleteBranchTag(tagId);
      await refreshBranchTags();
      setSuccessMessage("Branch tag deleted successfully.");
    } catch (deleteError) {
      setErrorMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete branch tag.");
    }
  }

  async function openDetails(branchId: number) {
    resetAlerts();
    setActionMenuId(null);
    setIsDetailsModalOpen(true);
    setIsLoadingDetails(true);
    setSelectedBranchDetails(null);

    try {
      const response = await fetchBranch(branchId);
      setSelectedBranchDetails(response.data);
    } catch (detailsError) {
      setErrorMessage(detailsError instanceof Error ? detailsError.message : "Unable to load branch details.");
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function openReassignModal(branch: BranchRecord) {
    resetAlerts();
    setActionMenuId(null);
    setReassignBranchRecord(branch);
    setReassignSelection("");
    setReassignNote("");

    try {
      const response = await fetchBranchParents(branch.id, branchId);
      setParentOptions(response.data);
      setIsReassignModalOpen(true);
    } catch (parentError) {
      setErrorMessage(parentError instanceof Error ? parentError.message : "Unable to load parent options.");
    }
  }

  async function handleReassignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetAlerts();

    if (!reassignBranchRecord) {
      setErrorMessage("Branch not found.");
      return;
    }

    if (!reassignSelection) {
      setErrorMessage("Select a church or branch to assign under.");
      return;
    }

    setIsReassigning(true);

    try {
      const [parentType, parentIdRaw] = reassignSelection.split(":");
      const parentId = Number(parentIdRaw);

      await reassignBranch(reassignBranchRecord.id, {
        to_parent_church_id: parentType === "church" ? parentId : null,
        to_parent_branch_id: parentType === "branch" ? parentId : null,
        changed_by_church_id: churchId,
        changed_by_user_id: session.user?.id || null,
        changed_by_actor_type: session.user?.id ? "user" : "church",
        note: reassignNote.trim() || null,
      });

      await refreshBranches();
      setIsReassignModalOpen(false);
      setReassignBranchRecord(null);
      setSuccessMessage("Branch reassigned successfully.");
    } catch (submitError) {
      setErrorMessage(submitError instanceof Error ? submitError.message : "Unable to reassign branch.");
    } finally {
      setIsReassigning(false);
    }
  }

  async function handleDetach(branch: BranchRecord) {
    resetAlerts();
    setActionMenuId(null);

    if (!window.confirm("Detach this branch back to its creator church?")) {
      return;
    }

    try {
      await detachBranch(branch.id, {
        changed_by_church_id: churchId,
        changed_by_user_id: session.user?.id || null,
        changed_by_actor_type: session.user?.id ? "user" : "church",
        note: "Detached from current parent.",
      });

      await refreshBranches();
      setSuccessMessage("Branch detached successfully.");
    } catch (detachError) {
      setErrorMessage(detachError instanceof Error ? detachError.message : "Unable to detach branch.");
    }
  }

  function handleBranchStateChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextSlug = event.target.value;
    setBranchStateSlug(nextSlug);
    void loadLgasForState(nextSlug, "").catch((loadError) => {
      setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load LGAs.");
    });
  }

  if (isLoading) {
    return <TemplateLoader />;
  }

  return (
    <>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                  <div>
                    <h4 className="mb-1">Church Branches</h4>
                    <p className="text-secondary mb-0">
                      Create branches, tag them, reassign them, and track which church or admin moved them.
                    </p>
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary" onClick={openAddBranchModal} type="button">
                      <i className="ti ti-plus me-1" />
                      Add Branch
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setIsTagsModalOpen(true)} type="button">
                      <i className="ti ti-tags me-1" />
                      Manage Tags
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12">
            <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
            <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
          </div>

          <StatCard
            borderClass="b-s-3-primary"
            badgeClass="text-light-primary"
            label="Total Branches"
            value={stats.total}
            valueClass="text-primary"
          >
            Created by your church
          </StatCard>
          <StatCard
            borderClass="b-s-3-success"
            badgeClass="text-light-success"
            label="Direct Branches"
            value={stats.direct}
            valueClass="text-success"
          >
            Currently under your church
          </StatCard>
          <StatCard
            borderClass="b-s-3-warning"
            badgeClass="text-light-warning"
            label="Sub-Branches"
            value={stats.sub}
            valueClass="text-warning"
          >
            Currently under another branch
          </StatCard>

          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                <h5 className="mb-0">Branch Registry</h5>
                <div className="d-flex gap-2 flex-wrap">
                  <select
                    className="form-select form-select-sm"
                    onChange={(event) => setTagFilter(event.target.value)}
                    style={{ width: 220 }}
                    value={tagFilter}
                  >
                    <option value="">All Tags</option>
                    {branchTags.map((tag) => (
                      <option key={tag.id} value={tag.slug || ""}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="form-control form-control-sm"
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search branches..."
                    style={{ width: 220 }}
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
                        <th>Branch Name</th>
                        <th>Tag</th>
                        <th>Assigned Under</th>
                        <th>Created By</th>
                        <th>Last Reassigned</th>
                        <th>Pastor in Charge</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedBranches.length === 0 ? (
                        <tr>
                          <td className="text-center text-muted py-4" colSpan={9}>No branches found for the current filters.</td>
                        </tr>
                      ) : orderedBranches.map((entry) => (
                        <tr className={entry.depth > 0 ? "bg-light" : ""} key={entry.branch.id}>
                          <td style={{ paddingLeft: `${12 + (entry.depth * 20)}px` }}>
                            <strong>
                              {entry.depth > 0 ? (
                                <i className="ti ti-corner-down-right me-1 text-muted" />
                              ) : (
                                <i className="ti ti-building-community me-1 text-primary" />
                              )}
                              {entry.branch.name}
                            </strong>
                            <div className="small text-secondary">{entry.branch.code || "--"}</div>
                            <div className="small text-secondary">{formatLocalAdmin(entry.branch.local_admin)}</div>
                          </td>
                          <td>
                            {entry.branch.tag ? (
                              <span className={`badge ${getTagBadgeClass(entry.branch.tag.slug)}`}>
                                {entry.branch.tag.name}
                              </span>
                            ) : (
                              <span className="text-muted">No tag</span>
                            )}
                          </td>
                          <td dangerouslySetInnerHTML={{ __html: formatParent(entry.branch) }} />
                          <td><span className="small">{formatActorSummary(entry.branch, "creator")}</span></td>
                          <td><span className="small">{formatActorSummary(entry.branch, "last_assignment")}</span></td>
                          <td>{entry.branch.pastor_name || "--"}</td>
                          <td>{[entry.branch.city, entry.branch.district_area, entry.branch.state].filter(Boolean).join(", ") || "--"}</td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(entry.branch.status)}`}>
                              {formatLabel(entry.branch.status || "active")}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex gap-2 justify-content-end">
                              <button className="btn btn-sm btn-light-primary" onClick={() => void openEditBranchModal(entry.branch)} type="button">
                                <i className="ti ti-edit me-1" />
                                Edit
                              </button>
                              <div className="dropdown position-relative">
                                <button
                                  className="btn btn-sm btn-light-secondary dropdown-toggle"
                                  onClick={() => setActionMenuId((current) => current === entry.branch.id ? null : entry.branch.id)}
                                  type="button"
                                >
                                  More
                                </button>
                              <ul
                                className={`dropdown-menu ${actionMenuId === entry.branch.id ? "show" : ""}`}
                                style={{ right: 0, left: "auto" }}
                              >
                                <li>
                                  <button className="dropdown-item" onClick={() => void openDetails(entry.branch.id)} type="button">
                                    <i className="ti ti-eye me-2" />
                                    View Details
                                  </button>
                                </li>
                                <li>
                                  <button className="dropdown-item" onClick={() => void openReassignModal(entry.branch)} type="button">
                                    <i className="ti ti-arrows-transfer-down me-2" />
                                    Reassign
                                  </button>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                  <button className="dropdown-item text-danger" onClick={() => void handleDetach(entry.branch)} type="button">
                                    <i className="ti ti-unlink me-2" />
                                    Detach
                                  </button>
                                </li>
                              </ul>
                              </div>
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

          <div className="col-12">
            <div className="alert alert-info mb-0">
              <i className="ti ti-info-circle me-2" />
              <strong>How it works:</strong> A branch is first created under the church that created it. It can later be reassigned under another church or branch while the original creator and reassignment history stay visible.
            </div>
          </div>
        </div>
      </div>

      {isBranchModalOpen ? (
        <ModalShell
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setIsBranchModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="btn btn-primary" disabled={isSavingBranch} form="branchForm" type="submit">
                <i className={`ti ${isSavingBranch ? "ti-loader" : "ti-device-floppy"} me-1`} />
                {branchForm.id ? (isSavingBranch ? "Updating..." : "Update Branch") : (isSavingBranch ? "Saving..." : "Save Branch")}
              </button>
            </>
          )}
          onClose={() => setIsBranchModalOpen(false)}
          size="lg"
          title={branchForm.id ? "Edit Branch" : "Add New Branch"}
        >
          <div className="alert alert-light border mb-3">
            <i className="ti ti-info-circle me-1" />
            New branches are created under <strong>your church</strong> first, can have their own local admin, and can be reassigned later.
          </div>
          <form id="branchForm" onSubmit={handleBranchSubmit}>
            <div className="row">
              <BranchInput className="col-md-6" label="Branch Name *" value={branchForm.name} onChange={(value) => updateBranchForm(setBranchForm, "name", value)} />
              <BranchInput className="col-md-6" label="Branch Code" placeholder="Leave blank to auto-generate" value={branchForm.code} onChange={(value) => updateBranchForm(setBranchForm, "code", value)} />
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label" htmlFor="branchTagInput">Tag / Label *</label>
                  <select
                    className="form-select"
                    id="branchTagInput"
                    onChange={(event) => updateBranchForm(setBranchForm, "branch_tag_id", event.target.value)}
                    value={branchForm.branch_tag_id}
                  >
                    <option value="">Select a tag...</option>
                    {branchTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                    <option value="custom">+ Add Custom Tag</option>
                  </select>
                  <small className="text-muted">
                    Tag helps identify if this is a District, Zone, Sub-District, Area, or custom type.
                  </small>
                </div>
              </div>
              <div className={`col-md-6 ${branchForm.branch_tag_id === "custom" ? "" : "d-none"}`}>
                <BranchInput
                  label="Custom Tag Name"
                  placeholder="e.g. Province, Cell, Satellite"
                  value={branchForm.custom_tag_name}
                  onChange={(value) => updateBranchForm(setBranchForm, "custom_tag_name", value)}
                />
              </div>
              <BranchInput className="col-md-6" label="Pastor in Charge" value={branchForm.pastor_name} onChange={(value) => updateBranchForm(setBranchForm, "pastor_name", value)} />
              <BranchInput className="col-md-6" label="Pastor Phone" value={branchForm.pastor_phone} onChange={(value) => updateBranchForm(setBranchForm, "pastor_phone", value)} />
              <BranchInput className="col-md-6" label="Pastor Email" type="email" value={branchForm.pastor_email} onChange={(value) => updateBranchForm(setBranchForm, "pastor_email", value)} />
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label" htmlFor="branchStatusInput">Status</label>
                  <select
                    className="form-select"
                    id="branchStatusInput"
                    onChange={(event) => updateBranchForm(setBranchForm, "status", event.target.value)}
                    value={branchForm.status}
                  >
                    <option value="active">Active</option>
                    <option value="review">Review</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label" htmlFor="branchStateInput">State / Region</label>
                  <select
                    className="form-select"
                    id="branchStateInput"
                    onChange={handleBranchStateChange}
                    value={branchStateSlug}
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
              <BranchInput
                className="col-md-6"
                helpText="Use this for the town, estate, axis, or neighborhood inside the selected LGA."
                label="City / Area (Optional)"
                placeholder="e.g. Lekki, Gwarinpa, Rumuokwuta"
                value={branchForm.city}
                onChange={(value) => updateBranchForm(setBranchForm, "city", value)}
              />
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label" htmlFor="branchDistrictAreaInput">District / LGA</label>
                  <select
                    className="form-select"
                    id="branchDistrictAreaInput"
                    onChange={(event) => updateBranchForm(setBranchForm, "district_area", event.target.value)}
                    value={branchForm.district_area}
                  >
                    <option value="">{branchStateSlug ? "Select LGA" : "Select state first"}</option>
                    {lgas.map((lga) => (
                      <option key={lga.id} value={lga.name}>
                        {lga.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <BranchInput className="col-md-6" label="Branch Phone" value={branchForm.phone} onChange={(value) => updateBranchForm(setBranchForm, "phone", value)} />
              <BranchInput className="col-md-6" label="Branch Email" type="email" value={branchForm.email} onChange={(value) => updateBranchForm(setBranchForm, "email", value)} />
              <div className="col-12">
                <div className="mb-0">
                  <label className="form-label" htmlFor="branchAddressInput">Full Address</label>
                  <textarea
                    className="form-control"
                    id="branchAddressInput"
                    onChange={(event) => updateBranchForm(setBranchForm, "address", event.target.value)}
                    rows={2}
                    value={branchForm.address}
                  />
                </div>
              </div>
              <div className="col-12 mt-4">
                <div className="border rounded p-3">
                  <h6 className="mb-1">Local Branch Admin</h6>
                  <p className="text-secondary small mb-3">
                    This admin can log in and manage the branch as its own local church workspace. New local branch admins default to <strong>12345678</strong> if you leave the password blank.
                  </p>
                  <div className="row">
                    <BranchInput className="col-md-6" label="Admin Name" value={branchForm.admin_name} onChange={(value) => updateBranchForm(setBranchForm, "admin_name", value)} />
                    <BranchInput className="col-md-6" label="Admin Email" type="email" value={branchForm.admin_email} onChange={(value) => updateBranchForm(setBranchForm, "admin_email", value)} />
                    <BranchInput className="col-md-6" label="Admin Phone" value={branchForm.admin_phone} onChange={(value) => updateBranchForm(setBranchForm, "admin_phone", value)} />
                    <BranchInput
                      className="col-md-6"
                      helpText={branchForm.id ? "Leave blank to keep the existing password, or to use 12345678 when creating a missing local admin." : "Leave blank to use the default password 12345678."}
                      label="Admin Password"
                      type="password"
                      value={branchForm.admin_password}
                      onChange={(value) => updateBranchForm(setBranchForm, "admin_password", value)}
                    />
                    <BranchInput className="col-md-6" label="Confirm Password" type="password" value={branchForm.admin_password_confirmation} onChange={(value) => updateBranchForm(setBranchForm, "admin_password_confirmation", value)} />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {isTagsModalOpen ? (
        <ModalShell
          footer={(
            <button className="btn btn-secondary" onClick={() => setIsTagsModalOpen(false)} type="button">
              Close
            </button>
          )}
          onClose={() => setIsTagsModalOpen(false)}
          title="Manage Branch Tags"
        >
          <p className="text-muted mb-3">
            Tags help categorize branches. Default tags stay available, while custom tags belong to your church.
          </p>
          <div className="mb-3">
            <label className="form-label">Available Tags</label>
            <div className="d-flex flex-wrap gap-2">
              {branchTags.map((tag) => {
                const isDefaultTag = tag.church_id == null;

                return (
                  <span className={`badge ${getTagBadgeClass(tag.slug)} p-2`} key={tag.id}>
                    {tag.name}
                    {isDefaultTag ? null : (
                      <button
                        className="btn-close btn-close-white ms-2"
                        onClick={() => void handleDeleteTag(tag.id)}
                        style={{ fontSize: "0.5rem" }}
                        type="button"
                      />
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mb-0">
            <label className="form-label" htmlFor="newTagInput">Add New Tag</label>
            <div className="input-group">
              <input
                className="form-control"
                id="newTagInput"
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="e.g. Province, County, Cell"
                type="text"
                value={newTagName}
              />
              <button className="btn btn-primary" disabled={isSavingTag} onClick={() => void handleAddTag()} type="button">
                <i className="ti ti-plus" /> Add
              </button>
            </div>
          </div>
          <div className="alert alert-light border mt-3 mb-0">
            <strong>Tip:</strong> Common tags include District, Zone, Sub-District, Area, Local, Province, County, Cell, Satellite, and Outpost.
          </div>
        </ModalShell>
      ) : null}

      {isDetailsModalOpen ? (
        <ModalShell
          footer={(
            <button className="btn btn-secondary" onClick={() => setIsDetailsModalOpen(false)} type="button">
              Close
            </button>
          )}
          onClose={() => setIsDetailsModalOpen(false)}
          size="lg"
          title="Branch Details"
        >
          <div className="row g-3">
            {isLoadingDetails ? (
              <div className="col-12 text-secondary">Loading branch details...</div>
            ) : selectedBranchDetails ? (
              <>
                <DetailCard label="Branch Name" value={selectedBranchDetails.name} />
                <DetailCard label="Tag" value={selectedBranchDetails.tag?.name || "--"} />
                <DetailCard label="Created By" value={formatActorSummary(selectedBranchDetails, "creator")} />
                <DetailCard label="Current Parent" value={formatParentSummary(selectedBranchDetails.current_parent)} />
                <DetailCard label="Pastor in Charge" value={selectedBranchDetails.pastor_name || "--"} />
                <DetailCard label="Local Admin" value={formatLocalAdmin(selectedBranchDetails.local_admin)} />
                <DetailCard
                  full
                  label="Location"
                  value={[selectedBranchDetails.city, selectedBranchDetails.district_area, selectedBranchDetails.state].filter(Boolean).join(", ") || "--"}
                />
                <div className="col-12">
                  <div className="border rounded p-3">
                    <span className="text-secondary small d-block mb-2">Assignment History</span>
                    <div className="d-grid gap-2">
                      {(selectedBranchDetails.assignment_history || []).length > 0 ? (
                        selectedBranchDetails.assignment_history?.map((history) => (
                          <HistoryItem history={history} key={history.id} />
                        ))
                      ) : (
                        <div className="text-secondary">No history recorded yet.</div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-12 text-danger">Unable to load branch details.</div>
            )}
          </div>
        </ModalShell>
      ) : null}

      {isReassignModalOpen ? (
        <ModalShell
          footer={(
            <>
              <button className="btn btn-secondary" onClick={() => setIsReassignModalOpen(false)} type="button">
                Cancel
              </button>
              <button className="btn btn-primary" disabled={isReassigning} form="reassignBranchForm" type="submit">
                {isReassigning ? "Reassigning..." : "Reassign Branch"}
              </button>
            </>
          )}
          onClose={() => setIsReassignModalOpen(false)}
          title="Reassign Branch"
        >
          <form id="reassignBranchForm" onSubmit={handleReassignSubmit}>
            <div className="mb-3">
              <label className="form-label">Branch to Reassign</label>
              <input className="form-control" readOnly type="text" value={reassignBranchRecord?.name || ""} />
            </div>
            <div className="mb-3">
              <label className="form-label">Current Assignment</label>
              <input
                className="form-control"
                readOnly
                type="text"
                value={formatParentSummary(reassignBranchRecord?.current_parent || null)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="assignParentTypeInput">Assign Under</label>
              <select
                className="form-select"
                id="assignParentTypeInput"
                onChange={(event) => setReassignSelection(event.target.value)}
                value={reassignSelection}
              >
                <option value="">Select new parent...</option>
                {parentOptions.churches.length > 0 ? (
                  <optgroup label="Churches">
                    {parentOptions.churches.map((churchOption) => (
                      <option key={`church-${churchOption.id}`} value={`church:${churchOption.id}`}>
                        {churchOption.name} (Church)
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                {parentOptions.branches.length > 0 ? (
                  <optgroup label="Branches">
                    {parentOptions.branches.map((branchOption) => (
                      <option key={`branch-${branchOption.id}`} value={`branch:${branchOption.id}`}>
                        {branchOption.name}{branchOption.tag_name ? ` (${branchOption.tag_name})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <small className="text-muted">You can assign under a church or another branch.</small>
            </div>
            <div className="mb-0">
              <label className="form-label" htmlFor="reassignNoteInput">Note</label>
              <textarea
                className="form-control"
                id="reassignNoteInput"
                onChange={(event) => setReassignNote(event.target.value)}
                placeholder="Why are you moving this branch?"
                rows={2}
                value={reassignNote}
              />
            </div>
          </form>
          <div className="alert alert-warning mt-3 mb-0">
            <i className="ti ti-alert-triangle me-1" />
            <strong>Note:</strong> Reassigning changes the branch&apos;s current parent, but the original creator church remains preserved.
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}

function BranchInput({
  label,
  value,
  onChange,
  className = "",
  type = "text",
  placeholder,
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  placeholder?: string;
  helpText?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-3">
        <label className="form-label">{label}</label>
        <input
          className="form-control"
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

function DetailCard({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-12" : "col-md-6"}>
      <div className="border rounded p-3 h-100">
        <span className="text-secondary small d-block mb-1">{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function HistoryItem({
  history,
}: {
  history: BranchAssignmentHistoryRecord;
}) {
  const fromParent = history.from_parent?.name || "No parent";
  const toParent = history.to_parent?.name || "No parent";
  const byChurch = history.changed_by_church?.name || "Unknown church";
  const byUser = history.changed_by_user?.name || (history.changed_by_actor_type === "church" ? "Church action" : "Admin action");

  return (
    <div className="border rounded p-3">
      <div className="d-flex justify-content-between flex-wrap gap-2">
        <strong>{formatLabel(history.action_type || "--")}</strong>
        <span className="small text-secondary">
          {history.created_at ? new Date(history.created_at).toLocaleString("en-NG") : "--"}
        </span>
      </div>
      <div className="small mt-2">{fromParent} to {toParent}</div>
      <div className="small text-secondary mt-1">{byChurch} / {byUser}</div>
      {history.note ? <div className="small text-secondary mt-1">{history.note}</div> : null}
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  footer,
  size = "md",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <>
      <div className="modal fade show" role="dialog" style={{ display: "block" }}>
        <div className={`modal-dialog ${size === "lg" ? "modal-lg" : ""}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button className="btn-close" onClick={onClose} type="button" />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer">{footer}</div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

function updateBranchForm(
  setBranchForm: Dispatch<SetStateAction<BranchFormState>>,
  key: keyof BranchFormState,
  value: string,
) {
  setBranchForm((current) => ({
    ...current,
    [key]: value,
  }));
}

function buildHierarchyRows<T extends {
  id: number;
  name?: string | null;
  current_parent?: { type?: string | null; id?: number | null } | null;
}>(visibleBranches: T[]) {
  const branchMap = new Map<number, T>();
  const childrenMap = new Map<number, T[]>();

  visibleBranches.forEach((branch) => {
    branchMap.set(branch.id, branch);
    childrenMap.set(branch.id, []);
  });

  visibleBranches.forEach((branch) => {
    if (branch.current_parent?.type === "branch" && branch.current_parent.id && branchMap.has(branch.current_parent.id)) {
      childrenMap.get(branch.current_parent.id)?.push(branch);
    }
  });

  childrenMap.forEach((items) => {
    items.sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  });

  const roots = visibleBranches.filter((branch) => !(
    branch.current_parent?.type === "branch"
    && branch.current_parent.id
    && branchMap.has(branch.current_parent.id)
  )).sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));

  const ordered: Array<{ branch: T; depth: number }> = [];

  function walk(branch: T, depth: number) {
    ordered.push({ branch, depth });
    (childrenMap.get(branch.id) || []).forEach((child) => walk(child, depth + 1));
  }

  roots.forEach((root) => walk(root, 0));
  return ordered;
}

function formatLocalAdmin(admin?: BranchRecord["local_admin"] | null) {
  if (!admin) {
    return "No local admin";
  }

  return [admin.name, admin.email].filter(Boolean).join(" / ");
}

function formatActorSummary(branch: BranchRecord, source: "creator" | "last_assignment") {
  if (source === "creator") {
    const creatorChurch = branch.creator_church?.name || "Unknown church";
    const creatorUser = branch.creator_user?.name || null;
    return `${creatorChurch}${creatorUser ? ` / ${creatorUser}` : " / Church"}`;
  }

  if (!branch.last_assignment?.church && !branch.last_assignment?.user) {
    return "No reassignment yet";
  }

  const churchName = branch.last_assignment?.church?.name || "Unknown church";
  const userName = branch.last_assignment?.user?.name || null;
  const actorType = branch.last_assignment?.actor_type === "church" ? "Church" : "Admin";
  return `${churchName} / ${userName || actorType}`;
}

function formatParent(branch: BranchRecord) {
  if (!branch.current_parent) {
    return '<span class="text-muted">Unassigned</span>';
  }

  if (branch.current_parent.type === "church") {
    return `<span class="text-muted"><i class="ti ti-home me-1"></i>${escapeHtml(branch.current_parent.name || "--")}</span>`;
  }

  return `<span class="text-primary"><i class="ti ti-building-community me-1"></i>${escapeHtml(branch.current_parent.name || "--")}</span>`;
}

function formatParentSummary(parent?: BranchRecord["current_parent"] | null) {
  if (!parent) {
    return "Unassigned";
  }

  return `${parent.name || "--"} (${parent.type === "church" ? "Church" : "Branch"})`;
}

function getTagBadgeClass(slug?: string | null) {
  const palette: Record<string, string> = {
    district: "bg-primary",
    zone: "bg-success",
    "sub-district": "bg-warning text-dark",
    area: "bg-info",
    branch: "bg-secondary",
  };

  return slug ? (palette[slug] || "bg-dark") : "bg-dark";
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
