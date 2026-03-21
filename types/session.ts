export type UserRole = "church_admin" | "branch_admin" | "homecell_leader" | string;

export interface SessionUser {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: UserRole | null;
}

export interface SessionChurch {
  id: number;
  name?: string | null;
  code?: string | null;
  users?: Array<{
    id: number;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: UserRole | null;
  }> | null;
}

export interface SessionBranch {
  id: number;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  tag?: {
    id: number;
    name?: string | null;
    slug?: string | null;
  } | null;
  current_parent?: {
    type?: string | null;
    id?: number | null;
    name?: string | null;
    code?: string | null;
  } | null;
}

export interface SessionHomecellLeader {
  id: number;
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  email?: string | null;
  user_id?: number | null;
}

export interface SessionHomecell {
  id: number;
  name?: string | null;
  code?: string | null;
  meeting_day?: string | null;
  meeting_time?: string | null;
  branch?: SessionBranch | null;
}

export interface SessionData {
  user?: SessionUser | null;
  church?: SessionChurch | null;
  branch?: SessionBranch | null;
  homecell?: SessionHomecell | null;
  homecell_leader?: SessionHomecellLeader | null;
  session_issued_at?: number | null;
  session_expires_at?: number | null;
}

export interface LoginResponse {
  message: string;
  data: SessionData;
}
