import type { SessionData } from "@/types/session";
import { getRestrictedManagerGroupId, isHomecellLeaderSession } from "@/lib/session";

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
      { label: "Overview", href: "/church-setup" },
      { label: "Church Profile", href: "/church-profile" },
      { label: "Service Schedule", href: "/service-schedule" },
      { label: "Branches", href: "/branches" },
    ],
  },
  {
    title: "Services",
    icon: "stack",
    id: "services",
    items: [
      { label: "Overview", href: "/services" },
      { label: "Record Attendance", href: "/attendance" },
      { label: "Service Report", href: "/service-report" },
    ],
  },
  {
    title: "Members",
    icon: "queue-list",
    id: "members",
    items: [
      { label: "Overview", href: "/members" },
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
      { label: "Overview", href: "/homecell-management" },
      { label: "Homecells", href: "/homecells" },
      { label: "Homecell Leaders", href: "/homecell-leaders" },
      { label: "Homecell Attendance", href: "/homecell-attendance" },
      { label: "Homecell Records", href: "/homecell-records" },
      { label: "Homecell Reports", href: "/homecell-reports" },
    ],
  },
  {
    title: "Other Reports",
    icon: "chart",
    id: "reports",
    items: [
      { label: "Overview", href: "/reports" },
      { label: "Branch Report", href: "/branch-report" },
      { label: "Service Report", href: "/service-report-church" },
      { label: "Homecell Report", href: "/homecell-report" },
      { label: "Member Report", href: "/member-report" },
    ],
  },
  {
    title: "Administration",
    icon: "table",
    id: "administration",
    items: [
      { label: "Overview", href: "/administration" },
      { label: "Users", href: "/users" },
    ],
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

const restrictedGroups: Record<string, NavGroup[]> = {
  "church-setup": adminGroups.filter((group) => group.id === "church-setup"),
  services: adminGroups.filter((group) => group.id === "services"),
  members: adminGroups.filter((group) => group.id === "members"),
  "homecell-management": adminGroups.filter((group) => group.id === "homecell-management"),
  reports: adminGroups.filter((group) => group.id === "reports"),
  administration: adminGroups.filter((group) => group.id === "administration"),
};

export function getNavGroups(session: SessionData | null): NavGroup[] {
  if (isHomecellLeaderSession(session)) {
    return leaderGroups;
  }

  const restrictedGroupId = getRestrictedManagerGroupId(session);

  if (restrictedGroupId) {
    return restrictedGroups[restrictedGroupId] || adminGroups;
  }

  return adminGroups;
}
