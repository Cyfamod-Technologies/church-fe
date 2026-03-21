export interface ChurchApiRecord {
  id: number;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  district_area?: string | null;
  email?: string | null;
  phone?: string | null;
  pastor_name?: string | null;
  pastor_phone?: string | null;
  pastor_email?: string | null;
  finance_enabled?: boolean;
  special_services_enabled?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  users?: Array<{
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }>;
  service_schedules?: ServiceScheduleRecord[];
}

export interface ServiceScheduleRecord {
  id: number;
  label?: string | null;
  service_type?: string | null;
  day_name?: string | null;
  service_time?: string | null;
  recurrence_type?: string | null;
  recurrence_detail?: string | null;
  sort_order?: number | null;
}

export interface BranchRecord {
  id: number;
  name: string;
  code?: string | null;
  status?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  district_area?: string | null;
  email?: string | null;
  phone?: string | null;
  pastor_name?: string | null;
  pastor_phone?: string | null;
  pastor_email?: string | null;
  created_by_actor_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  tag?: {
    id: number;
    name?: string | null;
    slug?: string | null;
  } | null;
  creator_church?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  creator_user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  current_parent?: {
    type?: string | null;
    id?: number | null;
    name?: string | null;
  } | null;
  last_assignment?: {
    actor_type?: string | null;
    church?: {
      id: number;
      name?: string | null;
      code?: string | null;
    } | null;
    user?: {
      id: number;
      name?: string | null;
      email?: string | null;
    } | null;
  } | null;
  local_admin?: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
    church_id?: number | null;
    branch_id?: number | null;
  } | null;
  assignment_history?: BranchAssignmentHistoryRecord[];
}

export interface BranchAssignmentHistoryRecord {
  id: number;
  action_type?: string | null;
  from_parent?: {
    type?: string | null;
    id?: number | null;
    name?: string | null;
    code?: string | null;
  } | null;
  to_parent?: {
    type?: string | null;
    id?: number | null;
    name?: string | null;
    code?: string | null;
  } | null;
  changed_by_actor_type?: string | null;
  changed_by_church?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  changed_by_user?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  note?: string | null;
  created_at?: string | null;
}

export interface BranchTagRecord {
  id: number;
  church_id?: number | null;
  name: string;
  slug?: string | null;
}

export interface BranchStats {
  total_branches?: number;
  direct_branches?: number;
  sub_branches?: number;
}

export interface BranchListResponse {
  data: BranchRecord[];
  meta?: {
    stats?: BranchStats;
  };
}

export interface BranchTagsResponse {
  data: BranchTagRecord[];
}

export interface BranchParentOptionChurch {
  id: number;
  type: "church";
  name?: string | null;
  code?: string | null;
}

export interface BranchParentOptionBranch {
  id: number;
  type: "branch";
  name?: string | null;
  tag_name?: string | null;
}

export interface BranchParentOptionsResponse {
  data: {
    churches: BranchParentOptionChurch[];
    branches: BranchParentOptionBranch[];
  };
}

export interface HomecellRecord {
  id: number;
  name: string;
  code?: string | null;
  status?: string | null;
  meeting_day?: string | null;
  meeting_time?: string | null;
  city_area?: string | null;
  host_name?: string | null;
  host_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  church?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  branch?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  leaders?: HomecellLeaderRecord[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HomecellLeaderRecord {
  id: number;
  user_id?: number | null;
  name?: string | null;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  can_login?: boolean;
  login_account?: {
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  } | null;
}

export interface HomecellLeaderProfileRecord extends HomecellLeaderRecord {
  homecell?: {
    id: number;
    name?: string | null;
    code?: string | null;
    branch?: {
      id: number;
      name?: string | null;
      code?: string | null;
    } | null;
  } | null;
}

export interface HomecellStats {
  total_homecells?: number;
  assigned_to_branches?: number;
  unassigned_homecells?: number;
  leaders_assigned?: number;
}

export interface HomecellListResponse {
  data: HomecellRecord[];
  meta?: {
    stats?: HomecellStats;
  };
}

export interface AttendanceRecord {
  id: number;
  service_date?: string | null;
  service_label?: string | null;
  service_type?: string | null;
  male_count?: number;
  female_count?: number;
  children_count?: number;
  total_count?: number;
  first_timers_count?: number;
  new_converts_count?: number;
  rededications_count?: number;
  main_offering?: number | null;
  tithe?: number | null;
  special_offering?: number | null;
  notes?: string | null;
  branch?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  recorded_by?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  recordedBy?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
}

export interface AttendanceSummaryResponse {
  data: {
    period?: string;
    date_from?: string;
    date_to?: string;
    total_attendance?: number;
    average_attendance?: number;
    highest_service?: {
      service_label?: string | null;
      service_date?: string | null;
      total_count?: number;
    } | null;
    breakdown?: Record<string, { total?: number; count?: number; average?: number }>;
  };
}

export interface HomecellAttendanceRecord {
  id: number;
  meeting_date?: string | null;
  male_count?: number;
  female_count?: number;
  children_count?: number;
  total_count?: number;
  first_timers_count?: number;
  new_converts_count?: number;
  offering_amount?: number | null;
  notes?: string | null;
  homecell?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  branch?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  recorded_by?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  created_at?: string | null;
}

export interface HomecellAttendanceListResponse {
  data: HomecellAttendanceRecord[];
}

export interface HomecellAttendanceSummaryResponse {
  data: {
    period?: string;
    date_from?: string;
    date_to?: string;
    total_attendance?: number;
    reports_submitted?: number;
    average_attendance?: number;
    active_homecells?: number;
    homecells_covered?: number;
    pending_homecells?: number;
    highest_attendance?: {
      meeting_date?: string | null;
      homecell_id?: number | null;
      total_count?: number;
    } | null;
  };
}

export interface GuestResponseEntryRecord {
  id: number;
  church_id?: number | null;
  entry_type?: string | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: string | null;
  service_date?: string | null;
  invited_by?: string | null;
  address?: string | null;
  notes?: string | null;
  foundation_class_completed?: boolean;
  baptism_completed?: boolean;
  holy_ghost_baptism_completed?: boolean;
  wofbi_completed?: boolean;
  wofbi_levels?: string[];
  branch?: {
    id: number;
    name?: string | null;
    code?: string | null;
  } | null;
  recorded_by?: {
    id: number;
    name?: string | null;
    email?: string | null;
  } | null;
  church_units?: Array<{
    id: number;
    name?: string | null;
    code?: string | null;
    status?: string | null;
  }>;
  created_at?: string | null;
}

export interface GuestResponseEntryListResponse {
  data: GuestResponseEntryRecord[];
}

export interface ChurchUnitRecord {
  id: number;
  church_id?: number | null;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  description?: string | null;
  members_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ChurchUnitListResponse {
  data: ChurchUnitRecord[];
  meta?: {
    stats?: {
      total_units?: number;
      active_units?: number;
      inactive_units?: number;
      member_assignments?: number;
    };
  };
}

export interface LocationStateRecord {
  id: number;
  name: string;
  slug?: string | null;
}

export interface LocationLgaRecord {
  id: number;
  name: string;
  state_id?: number;
  state?: {
    id: number;
    name?: string | null;
    slug?: string | null;
  } | null;
}

export interface StatesResponse {
  data: LocationStateRecord[];
}

export interface LgasResponse {
  data: LocationLgaRecord[];
}
