/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { clearSession, isHomecellLeaderSession } from "@/lib/session";
import { getNavGroups } from "@/lib/navigation";
import type { SessionData } from "@/types/session";

interface AppShellProps {
  session: SessionData;
  children: React.ReactNode;
}

export function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLeaderWorkspace = isHomecellLeaderSession(session);
  const navGroups = getNavGroups(session);
  const initialOpenGroups = useMemo(() => buildGroupState(navGroups, pathname), [navGroups, pathname]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpenGroups);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSemiNav, setIsSemiNav] = useState(false);
  const profileMenuRef = useRef<HTMLLIElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const wasMobileViewportRef = useRef<boolean | null>(null);
  const workspaceName = isLeaderWorkspace
    ? `${session.church?.name || "Church"} / ${session.homecell?.name || "Homecell"}`
    : session.branch?.name
      ? `${session.church?.name || "Church"} / ${session.branch.name}`
      : (session.church?.name || "Church Workspace");
  const userName = resolveProfileUserName(session);
  const currentPageMeta = getCurrentPageMeta(pathname, session);
  const headerWorkspaceName = isLeaderWorkspace
    ? (session.homecell?.name || session.church?.name || "Church Workspace")
    : (session.church?.name || "Church Workspace");
  const allowHoverSemiNav = !isLeaderWorkspace;

  useEffect(() => {
    setOpenGroups(buildGroupState(navGroups, pathname));
  }, [navGroups, pathname]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1199) {
      setIsSemiNav(false);
    }
  }, [pathname]);

  useEffect(() => {
    const updateNavMode = () => {
      const isMobileViewport = window.innerWidth < 1199;
      const previousViewport = wasMobileViewportRef.current;

      if (previousViewport === null) {
        wasMobileViewportRef.current = isMobileViewport;

        if (!isMobileViewport) {
          setIsSemiNav(false);
        }

        return;
      }

      if (previousViewport !== isMobileViewport) {
        wasMobileViewportRef.current = isMobileViewport;
        setIsSemiNav(false);
      }
    };

    updateNavMode();
    window.addEventListener("resize", updateNavMode);

    return () => {
      window.removeEventListener("resize", updateNavMode);
    };
  }, []);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleOutsideProfileClick(event: MouseEvent) {
      if (!profileMenuRef.current) {
        return;
      }

      if (!profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideProfileClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideProfileClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    function handleDocumentPointerDown(event: MouseEvent | TouchEvent) {
      if (typeof window === "undefined" || window.innerWidth >= 1199 || !isSemiNav) {
        return;
      }

      const target = event.target as Node | null;

      if (!target) {
        return;
      }

      if (navRef.current?.contains(target)) {
        return;
      }

      setIsSemiNav(false);
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("touchstart", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("touchstart", handleDocumentPointerDown);
    };
  }, [isSemiNav]);

  return (
    <div className="app-wrapper">
      <nav className={`${isSemiNav ? "semi-nav" : ""} ${allowHoverSemiNav ? "" : "no-hover-semi-nav"}`.trim()} id="church-nav" ref={navRef}>
        <div className="app-logo">
          <Link className="logo d-inline-block" href="/dashboard" />

          <span
            className="bg-light-primary toggle-semi-nav d-flex-center"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setIsSemiNav(false);
            }}
          >
            <i className="ti ti-chevron-right" />
          </span>

          <div className="d-flex align-items-center nav-profile p-3">
            <span className="h-45 w-45 d-flex-center b-r-10 position-relative bg-primary m-auto">
              <img alt="avatar" className="img-fluid b-r-10" src="/assets/images/avatar/1.png" />
              <span className="position-absolute top-0 end-0 p-1 bg-success border border-light rounded-circle" />
            </span>
            <div className="flex-grow-1 ps-2">
              <p className="text-muted f-s-12 mb-0">{workspaceName}</p>
            </div>
          </div>
        </div>

        <div className="app-nav" id="app-simple-bar">
          <ul className="main-nav p-0 mt-2">
            {navGroups.map((group) => (
              group.directHref ? (
                <li className={`no-sub ${pathname === group.directHref ? "active" : ""}`} key={group.title}>
                  <Link href={group.directHref}>
                    <TemplateIcon name={group.icon} />
                    {group.title}
                  </Link>
                </li>
              ) : (
                <li key={group.title}>
                  <a
                    aria-expanded={openGroups[group.id || ""] ? "true" : "false"}
                    href={`#${group.id}`}
                    onClick={(event) => {
                      event.preventDefault();

                      if (!group.id) {
                        return;
                      }

                      setOpenGroups((current) => {
                        const nextState = navGroups.reduce<Record<string, boolean>>((accumulator, currentGroup) => {
                          if (currentGroup.id) {
                            accumulator[currentGroup.id] = false;
                          }

                          return accumulator;
                        }, {});

                        nextState[group.id as string] = !current[group.id as string];
                        return nextState;
                      });
                    }}
                  >
                    <TemplateIcon name={group.icon} />
                    {group.title}
                  </a>
                  <ul className={`collapse ${openGroups[group.id || ""] ? "show" : ""}`} id={group.id}>
                    {group.items.map((item) => (
                      <li className={pathname === item.href ? "active" : ""} key={item.href}>
                        <Link href={item.href}>{item.label}</Link>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            ))}
          </ul>
        </div>

        {/* <div className="menu-navs">
          <span className="menu-previous">
            <i className="ti ti-chevron-left" />
          </span>
          <span className="menu-next">
            <i className="ti ti-chevron-right" />
          </span>
        </div> */}
      </nav>

      <div className="app-content">
        <div className="">
          <header className="header-main" id="church-header">
            <div className="container-fluid">
              <div className="row">
                <div className="col-6 col-sm-6 d-flex align-items-center header-left p-0">
                  <span
                    className="header-toggle"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsSemiNav((current) => !current);
                    }}
                  >
                    <i className="ti ti-layout-sidebar-left-collapse" />
                  </span>
                  <div className="header-searchbar w-100">
                    <form action="#" className="mx-3 app-form app-icon-form">
                      <div className="position-relative">
                        <input
                          aria-label="Search"
                          className="form-control"
                          placeholder={
                            isHomecellLeaderSession(session)
                              ? "Search my homecell records..."
                              : "Search members, districts, homecells..."
                          }
                          type="search"
                        />
                        <i className="ti ti-search text-dark" />
                      </div>
                    </form>
                  </div>
                </div>
                <div className="col-6 col-sm-6 d-flex align-items-center justify-content-end header-right p-0">
                  <ul className="d-flex align-items-center">
                    <li className="header-profile dropdown position-relative" ref={profileMenuRef}>
                      <a
                        aria-expanded={isProfileOpen ? "true" : "false"}
                        className="d-block head-icon"
                        data-bs-toggle="dropdown"
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setIsProfileOpen((current) => !current);
                        }}
                      >
                        <img alt="avatar" className="b-r-10 h-35 w-35" src="/assets/images/avatar/1.png" />
                      </a>
                      <ul className={`dropdown-menu dropdown-menu-end profile-dropdown p-2 ${isProfileOpen ? "show" : ""}`}>
                        <li className="dropdown-item-text">
                          <h6 className="mb-0">{userName}</h6>
                          <p className="text-muted mb-0 f-s-12">{headerWorkspaceName}</p>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <span className="dropdown-item-text text-muted f-s-12">
                            {currentPageMeta.title}
                            <br />
                            {currentPageMeta.subtitle}
                          </span>
                        </li>
                        <li>
                          <hr className="dropdown-divider" />
                        </li>
                        <li>
                          <Link className="dropdown-item" href="/profile">
                            {isHomecellLeaderSession(session) ? "My Profile" : "Settings"}
                          </Link>
                        </li>
                        <li>
                          <a
                            className="dropdown-item text-danger"
                            href="#logout"
                            onClick={(event) => {
                              event.preventDefault();
                              clearSession();
                              router.replace("/login");
                            }}
                          >
                            Logout
                          </a>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </header>

          <main>{children}</main>

          <div className="container-fluid pb-4">
            <div className="text-secondary small">Built in service by Cyfamod Technologies</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function resolveProfileUserName(session: SessionData): string {
  if (isHomecellLeaderSession(session)) {
    return session.homecell_leader?.name || session.user?.name || "Homecell Leader";
  }

  const churchUsers = Array.isArray(session.church?.users) ? session.church?.users : [];
  const churchAdmin = churchUsers.find((user) => user?.role === "church_admin" && user?.name);

  if (churchAdmin?.name) {
    return churchAdmin.name;
  }

  if (session.user?.role === "church_admin" && session.user?.name) {
    return session.user.name;
  }

  return session.user?.name || "Church Admin";
}

function getCurrentPageMeta(pathname: string, session: SessionData) {
  const pageMeta: Record<string, { title: string; subtitle: string }> = {
    "/dashboard": {
      title: "Dashboard",
      subtitle: isHomecellLeaderSession(session)
        ? "Homecell attendance visibility for your assigned homecell."
        : "Live branch, setup, attendance, and homecell visibility for the current workspace.",
    },
    "/church-profile": {
      title: "Church Profile",
      subtitle: "View the main church profile and registration details.",
    },
    "/church-profile-edit": {
      title: "Edit Church Profile",
      subtitle: "Update church profile, pastor, admin, and finance details.",
    },
    "/service-schedule": {
      title: "Service Schedule",
      subtitle: "View configured services and recurrence details.",
    },
    "/service-schedule-edit": {
      title: "Edit Service Schedule",
      subtitle: "Update Sunday, Wednesday, WOSE, and other services.",
    },
    "/branches": {
      title: "Branches",
      subtitle: "Manage branch structure, tags, and parent assignments.",
    },
    "/church-setup": {
      title: "Church Setup",
      subtitle: "Manage profile, schedule, and branch structure.",
    },
    "/attendance": {
      title: "Record Attendance",
      subtitle: "Enter and review service attendance records.",
    },
    "/services": {
      title: "Services",
      subtitle: "Record attendance and manage service operations.",
    },
    "/add-member": {
      title: "Add Member",
      subtitle: "Capture member information and journey milestones.",
    },
    "/member-registry": {
      title: "Member Registry",
      subtitle: "View and filter member journey records.",
    },
    "/church-units": {
      title: "Church Units",
      subtitle: "View configured units and unit participation.",
    },
    "/members": {
      title: "Members",
      subtitle: "Add members and track their journey milestones.",
    },
    "/homecells": {
      title: "Homecells",
      subtitle: "Manage homecell structure and branch assignment.",
    },
    "/homecell-leaders": {
      title: "Homecell Leaders",
      subtitle: "View leaders and their assigned homecells.",
    },
    "/homecell-attendance": {
      title: "Homecell Attendance",
      subtitle: "Record and review homecell attendance.",
    },
    "/homecell-records": {
      title: "Homecell Records",
      subtitle: "View recent homecell attendance submissions.",
    },
    "/homecell-reports": {
      title: "Homecell Reports",
      subtitle: "Review homecell report coverage and totals.",
    },
    "/homecell-management": {
      title: "Homecell Management",
      subtitle: "Manage homecells, leaders, attendance, and records.",
    },
    "/branch-report": {
      title: "Branch Report",
      subtitle: "Review branch totals and structure.",
    },
    "/service-report": {
      title: "Service Report",
      subtitle: "Review service attendance for the current workspace.",
    },
    "/service-report-church": {
      title: "Service Report",
      subtitle: "Review service attendance across all branches under the church.",
    },
    "/homecell-report": {
      title: "Homecell Report",
      subtitle: "Review homecell attendance summary and coverage.",
    },
    "/member-report": {
      title: "Member Report",
      subtitle: "Review member intake and milestone activity.",
    },
    "/reports": {
      title: "Other Reports",
      subtitle: "Review branch, service, homecell, and member reports.",
    },
    "/users": {
      title: "Users",
      subtitle: "Manage user visibility and access control.",
    },
    "/administration": {
      title: "Administration",
      subtitle: "Manage users and access control.",
    },
    "/profile": {
      title: "My Profile",
      subtitle: "Update your personal information.",
    },
  };

  return pageMeta[pathname] || {
    title: "Church Management System",
    subtitle: "Administrative workspace",
  };
}

function TemplateIcon({
  name,
}: {
  name: "stack" | "briefcase" | "home" | "queue-list" | "chart" | "table";
}) {
  const icons = {
    home: {
      viewBox: "0 0 24 24",
      body: '<path d="M2 12.284L10.9545 3.32951C11.3938 2.89017 12.1062 2.89016 12.5455 3.3295L21.5 12.284M4.25 10.034V20.159C4.25 20.7803 4.75368 21.284 5.375 21.284H9.5V16.409C9.5 15.7877 10.0037 15.284 10.625 15.284H12.875C13.4963 15.284 14 15.7877 14 16.409V21.284H18.125C18.7463 21.284 19.25 20.7803 19.25 20.159V10.034M8 21.284H16.25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    stack: {
      viewBox: "0 0 24 24",
      body: '<path d="M6.42857 9.75L2.25 12L6.42857 14.25M6.42857 9.75L12 12.75L17.5714 9.75M6.42857 9.75L2.25 7.5L12 2.25L21.75 7.5L17.5714 9.75M17.5714 9.75L21.75 12L17.5714 14.25M17.5714 14.25L21.75 16.5L12 21.75L2.25 16.5L6.42857 14.25M17.5714 14.25L12 17.25L6.42857 14.25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    briefcase: {
      viewBox: "0 0 24 24",
      body: '<path d="M20.25 14.1499V18.4C20.25 19.4944 19.4631 20.4359 18.3782 20.58C16.2915 20.857 14.1624 21 12 21C9.83757 21 7.70854 20.857 5.62185 20.58C4.5369 20.4359 3.75 19.4944 3.75 18.4V14.1499M20.25 14.1499C20.7219 13.7476 21 13.1389 21 12.4889V8.70569C21 7.62475 20.2321 6.69082 19.1631 6.53086C18.0377 6.36247 16.8995 6.23315 15.75 6.14432M20.25 14.1499C20.0564 14.315 19.8302 14.4453 19.5771 14.5294C17.1953 15.3212 14.6477 15.75 12 15.75C9.35229 15.75 6.80469 15.3212 4.42289 14.5294C4.16984 14.4452 3.94361 14.3149 3.75 14.1499M3.75 14.1499C3.27808 13.7476 3 13.1389 3 12.4889V8.70569C3 7.62475 3.7679 6.69082 4.83694 6.53086C5.96233 6.36247 7.10049 6.23315 8.25 6.14432M15.75 6.14432V5.25C15.75 4.00736 14.7426 3 13.5 3H10.5C9.25736 3 8.25 4.00736 8.25 5.25V6.14432M15.75 6.14432C14.5126 6.0487 13.262 6 12 6C10.738 6 9.48744 6.0487 8.25 6.14432M12 12.75H12.0075V12.7575H12V12.75Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    chart: {
      viewBox: "0 0 24 24",
      body: '<path d="M10.5 6C6.35786 6 3 9.35786 3 13.5C3 17.6421 6.35786 21 10.5 21C14.6421 21 18 17.6421 18 13.5H10.5V6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 10.5H21C21 6.35786 17.6421 3 13.5 3V10.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    "queue-list": {
      viewBox: "0 0 24 24",
      body: '<path d="M3.75 12H20.25M3.75 15.75H20.25M3.75 19.5H20.25M5.625 4.5H18.375C19.4105 4.5 20.25 5.33947 20.25 6.375C20.25 7.41053 19.4105 8.25 18.375 8.25H5.625C4.58947 8.25 3.75 7.41053 3.75 6.375C3.75 5.33947 4.58947 4.5 5.625 4.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    },
    table: {
      viewBox: "0 0 24 24",
      body: '<path d="M3.375 19.5H20.625M3.375 19.5C2.75368 19.5 2.25 18.9963 2.25 18.375M3.375 19.5H10.875C11.4963 19.5 12 18.9963 12 18.375M2.25 18.375V5.625M2.25 18.375V16.875C2.25 16.2537 2.75368 15.75 3.375 15.75M21.75 18.375V5.625M21.75 18.375C21.75 18.9963 21.2463 19.5 20.625 19.5M21.75 18.375V16.875C21.75 16.2537 21.2463 15.75 20.625 15.75M20.625 19.5H13.125C12.5037 19.5 12 18.9963 12 18.375M21.75 5.625C21.75 5.00368 21.2463 4.5 20.625 4.5H3.375C2.75368 4.5 2.25 5.00368 2.25 5.625M21.75 5.625V7.125C21.75 7.74632 21.2463 8.25 20.625 8.25M2.25 5.625V7.125C2.25 7.74632 2.75368 8.25 3.375 8.25M3.375 8.25H20.625M3.375 8.25H10.875C11.4963 8.25 12 8.75368 12 9.375M3.375 8.25C2.75368 8.25 2.25 8.75368 2.25 9.375V10.875C2.25 11.4963 2.75368 12 3.375 12M20.625 8.25H13.125C12.5037 8.25 12 8.75368 12 9.375M20.625 8.25C21.2463 8.25 21.75 8.75368 21.75 9.375V10.875C21.75 11.4963 21.2463 12 20.625 12M3.375 12H10.875M3.375 12C2.75368 12 2.25 12.5037 2.25 13.125V14.625C2.25 15.2463 2.75368 15.75 3.375 15.75M12 10.875V9.375M12 10.875C12 11.4963 11.4963 12 10.875 12M12 10.875C12 11.4963 12.5037 12 13.125 12M10.875 12C11.4963 12 12 12.5037 12 13.125M13.125 12H20.625M13.125 12C12.5037 12 12 12.5037 12 13.125M20.625 12C21.2463 12 21.75 12.5037 21.75 13.125V14.625C21.75 15.2463 21.2463 15.75 20.625 15.75M3.375 15.75H10.875M12 14.625V13.125M12 14.625C12 15.2463 11.4963 15.75 10.875 15.75M12 14.625C12 15.2463 12.5037 15.75 13.125 15.75M10.875 15.75C11.4963 15.75 12 16.2537 12 16.875M12 18.375V16.875M12 16.875C12 16.2537 12.5037 15.75 13.125 15.75M13.125 15.75H20.625" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    },
  };

  const icon = icons[name];

  return (
    <svg
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: icon.body }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      viewBox={icon.viewBox}
    />
  );
}

function buildGroupState(
  navGroups: ReturnType<typeof getNavGroups>,
  pathname: string,
) {
  return navGroups.reduce<Record<string, boolean>>((accumulator, group) => {
    if (group.id) {
      accumulator[group.id] = group.items.some((item) => pathname === item.href);
    }

    return accumulator;
  }, {});
}
