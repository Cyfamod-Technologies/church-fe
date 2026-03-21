"use client";

import { useEffect, useState } from "react";
import {
  fetchBranches,
  fetchChurch,
  fetchServiceSchedules,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  BranchListResponse,
  BranchStats,
  ChurchApiRecord,
  ServiceScheduleRecord,
} from "@/types/api";
import type { SessionData } from "@/types/session";

interface ChurchSetupDataState {
  church: ChurchApiRecord | null;
  branches: BranchListResponse["data"];
  branchStats: BranchStats | undefined;
  serviceSchedules: ServiceScheduleRecord[];
  isLoading: boolean;
  error: string;
}

const initialState: ChurchSetupDataState = {
  church: null,
  branches: [],
  branchStats: undefined,
  serviceSchedules: [],
  isLoading: true,
  error: "",
};

export function useChurchSetupData(session: SessionData) {
  const churchId = getChurchId(session);
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
          fetchChurch(churchId),
          fetchServiceSchedules(churchId),
          fetchBranches(churchId),
        ]);

        if (!active) {
          return;
        }

        setState({
          church: churchResponse.data,
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
  }, [churchId]);

  return state;
}
