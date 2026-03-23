import type { BranchRecord } from "@/types/api";

export interface BranchHierarchyLevel {
  tag: string;
  branchId: string;
}

export function getBranchTagKey(branch?: BranchRecord | null) {
  return branch?.tag?.slug || (branch?.tag?.id ? String(branch.tag.id) : "");
}

export function getRootBranches(branches: BranchRecord[]) {
  const rootBranches = branches.filter((branch) => branch.current_parent?.type !== "branch" || !branch.current_parent?.id);
  return rootBranches.length > 0 ? rootBranches : branches;
}

export function getChildBranches(branches: BranchRecord[], parentBranchId: number) {
  return branches.filter((branch) => branch.current_parent?.type === "branch" && branch.current_parent.id === parentBranchId);
}

export function getDescendantBranchIds(branches: BranchRecord[], branchId: number) {
  const resolvedIds = [branchId];
  const pendingIds = [branchId];

  while (pendingIds.length > 0) {
    const currentParentId = pendingIds.shift();

    if (!currentParentId) {
      continue;
    }

    const childIds = getChildBranches(branches, currentParentId)
      .map((branch) => branch.id)
      .filter((id) => !resolvedIds.includes(id));

    resolvedIds.push(...childIds);
    pendingIds.push(...childIds);
  }

  return resolvedIds;
}

export function getBranchPath(branches: BranchRecord[], branchId: number) {
  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  const path: BranchRecord[] = [];
  let currentBranch = branchMap.get(branchId) || null;

  while (currentBranch) {
    path.unshift(currentBranch);

    if (currentBranch.current_parent?.type !== "branch" || !currentBranch.current_parent.id) {
      break;
    }

    currentBranch = branchMap.get(currentBranch.current_parent.id) || null;
  }

  return path;
}

export function getUniqueTagOptions(branches: BranchRecord[]) {
  const seen = new Set<string>();

  return branches
    .map((branch) => ({
      value: getBranchTagKey(branch),
      label: branch.tag?.name || "Uncategorized",
    }))
    .filter((tag) => {
      if (!tag.value || seen.has(tag.value)) {
        return false;
      }

      seen.add(tag.value);
      return true;
    });
}

export function buildHierarchyLevels(branches: BranchRecord[], selectedBranchId: string): BranchHierarchyLevel[] {
  const numericBranchId = Number(selectedBranchId || 0);

  if (!numericBranchId) {
    return [{ tag: "", branchId: "" }];
  }

  const path = getBranchPath(branches, numericBranchId);

  if (path.length === 0) {
    return [{ tag: "", branchId: "" }];
  }

  return path.map((branch) => ({
    tag: getBranchTagKey(branch),
    branchId: String(branch.id),
  }));
}
