import type { SessionData } from "@/types/session";
import { isHomecellLeaderSession } from "@/lib/session";

export interface NavItem {
  label: string;
  href: string;
}

export interface NavGroup {
  title: string;
  icon: "stack" | "briefcase" | "home" | "queue-list" | "chart" | "table";
  id?: string;
  directHref?: string;
  items: NavItem[];
}

const adminGroups: NavGroup[] = [
  {
    title: "Dashboard",
    icon: "stack",
    directHref: "/dashboard",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    title: "Church Setup",
    icon: "briefcase",
    id: "church-setup",
    items: [
      { label: "Church Profile", href: "/church-profile" },
      { label: "Service Schedule", href: "/service-schedule" },
      { label: "Branches", href: "/branches" },
    ],
  },
  {
    title: "Services",
    icon: "stack",
    id: "services",
    items: [{ label: "Record Attendance", href: "/attendance" }],
  },
  {
    title: "Members",
    icon: "queue-list",
    id: "members",
    items: [
      { label: "Add Member", href: "/add-member" },
      { label: "Member Registry", href: "/member-registry" },
      { label: "Church Units", href: "/church-units" },
    ],
  },
  {
    title: "Homecell Management",
    icon: "home",
    id: "homecell-management",
    items: [
      { label: "Homecells", href: "/homecells" },
      { label: "Homecell Leaders", href: "/homecell-leaders" },
      { label: "Homecell Attendance", href: "/homecell-attendance" },
      { label: "Homecell Records", href: "/homecell-records" },
      { label: "Homecell Reports", href: "/homecell-reports" },
    ],
  },
  {
    title: "Reports",
    icon: "chart",
    id: "reports",
    items: [
      { label: "Branch Report", href: "/branch-report" },
      { label: "Service Report", href: "/service-report" },
      { label: "Homecell Report", href: "/homecell-report" },
      { label: "Member Report", href: "/member-report" },
    ],
  },
  {
    title: "Administration",
    icon: "table",
    id: "administration",
    items: [{ label: "Users", href: "/users" }],
  },
];

const leaderGroups: NavGroup[] = [
  {
    title: "Dashboard",
    icon: "stack",
    directHref: "/dashboard",
    items: [{ label: "Dashboard", href: "/dashboard" }],
  },
  {
    title: "Homecell Management",
    icon: "home",
    id: "homecell-management",
    items: [
      { label: "Homecell Attendance", href: "/homecell-attendance" },
      { label: "Homecell Records", href: "/homecell-records" },
    ],
  },
  {
    title: "Profile",
    icon: "briefcase",
    directHref: "/profile",
    items: [{ label: "My Profile", href: "/profile" }],
  },
];

export function getNavGroups(session: SessionData | null): NavGroup[] {
  return isHomecellLeaderSession(session) ? leaderGroups : adminGroups;
}
