"use client";

import { useEffect, useState } from "react";
import {
  fetchBranch,
  fetchBranches,
  fetchChurch,
  fetchServiceSchedules,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  BranchListResponse,
  BranchRecord,
  BranchStats,
  ChurchApiRecord,
  ServiceScheduleRecord,
} from "@/types/api";
import type { SessionData } from "@/types/session";

interface ChurchSetupDataState {
  church: ChurchApiRecord | null;
  branch: BranchRecord | null;
  branches: BranchListResponse["data"];
  branchStats: BranchStats | undefined;
  serviceSchedules: ServiceScheduleRecord[];
  isLoading: boolean;
  error: string;
}

const initialState: ChurchSetupDataState = {
  church: null,
  branch: null,
  branches: [],
  branchStats: undefined,
  serviceSchedules: [],
  isLoading: true,
  error: "",
};

export function useChurchSetupData(session: SessionData) {
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const [state, setState] = useState<ChurchSetupDataState>(initialState);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setState((current) => ({
        ...current,
        isLoading: true,
        error: "",
      }));

      try {
        const [churchResponse, schedulesResponse, branchesResponse] = await Promise.all([
          fetchChurch(churchId, branchId),
          fetchServiceSchedules(churchId, branchId),
          fetchBranches(churchId, branchId),
        ]);

        const branchResponse = branchId ? await fetchBranch(branchId) : { data: null };

        if (!active) {
          return;
        }

        setState({
          church: churchResponse.data,
          branch: branchResponse.data || null,
          serviceSchedules: schedulesResponse.data || [],
          branches: branchesResponse.data || [],
          branchStats: branchesResponse.meta?.stats,
          isLoading: false,
          error: "",
        });
      } catch (loadError) {
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          error: loadError instanceof Error ? loadError.message : "Unable to load church setup.",
        }));
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [branchId, churchId]);

  return state;
}
