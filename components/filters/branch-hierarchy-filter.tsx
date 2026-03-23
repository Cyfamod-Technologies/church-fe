"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type BranchHierarchyLevel,
  buildHierarchyLevels,
  getChildBranches,
  getRootBranches,
  getUniqueTagOptions,
  getBranchTagKey,
} from "@/lib/branch-hierarchy";
import type { BranchRecord } from "@/types/api";

export function BranchHierarchyFilter({
  branches,
  disabled = false,
  value,
  onChange,
}: {
  branches: BranchRecord[];
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const [levels, setLevels] = useState<BranchHierarchyLevel[]>([{ tag: "", branchId: "" }]);
  const deepestSelectedBranchId = [...levels]
    .reverse()
    .find((level) => level.branchId)?.branchId || "";

  useEffect(() => {
    if (value && value !== deepestSelectedBranchId) {
      setLevels(buildHierarchyLevels(branches, value));
      return;
    }

    if (!value && deepestSelectedBranchId) {
      setLevels(buildHierarchyLevels(branches, ""));
      return;
    }

    if (branches.length === 0) {
      setLevels([{ tag: "", branchId: "" }]);
    }
  }, [branches, deepestSelectedBranchId, value]);

  const rootBranches = useMemo(() => getRootBranches(branches), [branches]);

  function updateLevels(nextLevels: BranchHierarchyLevel[]) {
    setLevels(nextLevels);
    const nextSelectedBranchId = [...nextLevels]
      .reverse()
      .find((level) => level.branchId)?.branchId || "";
    onChange(nextSelectedBranchId);
  }

  function renderLevel(options: BranchRecord[], index: number): ReactNode {
    const currentLevel = levels[index] || { tag: "", branchId: "" };
    const tagOptions = getUniqueTagOptions(options);
    const filteredOptions = currentLevel.tag
      ? options.filter((branch) => getBranchTagKey(branch) === currentLevel.tag)
      : options;
    const selectedBranchId = Number(currentLevel.branchId || 0);
    const selectedBranch = filteredOptions.find((branch) => branch.id === selectedBranchId) || null;
    const childBranches = selectedBranch ? getChildBranches(branches, selectedBranch.id) : [];

    return (
      <div className="d-flex gap-2 flex-wrap" key={`branch-level-${index}`}>
        <select
          className="form-select form-select-sm"
          disabled={disabled}
          onChange={(event) => {
            const nextLevels = levels.slice(0, index + 1);
            nextLevels[index] = {
              tag: event.target.value,
              branchId: "",
            };
            updateLevels(nextLevels);
          }}
          style={{ width: 170 }}
          value={currentLevel.tag}
        >
          <option value="">{index === 0 ? "All Tags" : "Child Tags"}</option>
          {tagOptions.map((tag) => (
            <option key={`${index}-${tag.value}`} value={tag.value}>
              {tag.label}
            </option>
          ))}
        </select>

        <select
          className="form-select form-select-sm"
          disabled={disabled}
          onChange={(event) => {
            const nextLevels = levels.slice(0, index + 1);
            nextLevels[index] = {
              ...nextLevels[index],
              branchId: event.target.value,
            };
            updateLevels(nextLevels);
          }}
          style={{ width: 220 }}
          value={currentLevel.branchId}
        >
          <option value="">{index === 0 ? "All Branches" : "Select child branch"}</option>
          {filteredOptions.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>

        {childBranches.length > 0 ? renderLevel(childBranches, index + 1) : null}
      </div>
    );
  }

  return renderLevel(rootBranches, 0);
}
