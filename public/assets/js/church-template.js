(function () {
  const currentPage = (location.pathname.split("/").pop() || "index.html").split("#")[0];
  const pageAliases = {
    "church-profile-edit.html": "church-profile.html",
    "service-schedule-edit.html": "service-schedule.html"
  };
  const normalizedPage = pageAliases[currentPage] || currentPage;
  const sessionKey = "lfc_session";
  const session = getSession();
  const homecellLeaderAllowedPages = [
    "homecell-leader-dashboard.html",
    "homecell-office.html",
    "homecell-attendance-records.html",
    "homecell-leader-profile.html"
  ];

  if (!hasValidSession(session)) {
    window.location.replace("sign_in.html");
    return;
  }

  if (isHomecellLeaderSession(session) && !homecellLeaderAllowedPages.includes(normalizedPage)) {
    window.location.replace("homecell-leader-dashboard.html");
    return;
  }

  const iconMarkup = {
    home: {
      viewBox: "0 0 24 24",
      body: '<path d="M2 12.284L10.9545 3.32951C11.3938 2.89017 12.1062 2.89016 12.5455 3.3295L21.5 12.284M4.25 10.034V20.159C4.25 20.7803 4.75368 21.284 5.375 21.284H9.5V16.409C9.5 15.7877 10.0037 15.284 10.625 15.284H12.875C13.4963 15.284 14 15.7877 14 16.409V21.284H18.125C18.7463 21.284 19.25 20.7803 19.25 20.159V10.034M8 21.284H16.25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    stack: {
      viewBox: "0 0 24 24",
      body: '<path d="M6.42857 9.75L2.25 12L6.42857 14.25M6.42857 9.75L12 12.75L17.5714 9.75M6.42857 9.75L2.25 7.5L12 2.25L21.75 7.5L17.5714 9.75M17.5714 9.75L21.75 12L17.5714 14.25M17.5714 14.25L21.75 16.5L12 21.75L2.25 16.5L6.42857 14.25M17.5714 14.25L12 17.25L6.42857 14.25" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    briefcase: {
      viewBox: "0 0 24 24",
      body: '<path d="M20.25 14.1499V18.4C20.25 19.4944 19.4631 20.4359 18.3782 20.58C16.2915 20.857 14.1624 21 12 21C9.83757 21 7.70854 20.857 5.62185 20.58C4.5369 20.4359 3.75 19.4944 3.75 18.4V14.1499M20.25 14.1499C20.7219 13.7476 21 13.1389 21 12.4889V8.70569C21 7.62475 20.2321 6.69082 19.1631 6.53086C18.0377 6.36247 16.8995 6.23315 15.75 6.14432M20.25 14.1499C20.0564 14.315 19.8302 14.4453 19.5771 14.5294C17.1953 15.3212 14.6477 15.75 12 15.75C9.35229 15.75 6.80469 15.3212 4.42289 14.5294C4.16984 14.4452 3.94361 14.3149 3.75 14.1499M3.75 14.1499C3.27808 13.7476 3 13.1389 3 12.4889V8.70569C3 7.62475 3.7679 6.69082 4.83694 6.53086C5.96233 6.36247 7.10049 6.23315 8.25 6.14432M15.75 6.14432V5.25C15.75 4.00736 14.7426 3 13.5 3H10.5C9.25736 3 8.25 4.00736 8.25 5.25V6.14432M15.75 6.14432C14.5126 6.0487 13.262 6 12 6C10.738 6 9.48744 6.0487 8.25 6.14432M12 12.75H12.0075V12.7575H12V12.75Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    "briefcase-advance": {
      viewBox: "0 0 24 24",
      body: '<path d="M20.25 14.1499V18.4C20.25 19.4944 19.4631 20.4359 18.3782 20.58C16.2915 20.857 14.1624 21 12 21C9.83757 21 7.70854 20.857 5.62185 20.58C4.5369 20.4359 3.75 19.4944 3.75 18.4V14.1499M20.25 14.1499C20.7219 13.7476 21 13.1389 21 12.4889V8.70569C21 7.62475 20.2321 6.69082 19.1631 6.53086C18.0377 6.36247 16.8995 6.23315 15.75 6.14432M20.25 14.1499C20.0564 14.315 19.8302 14.4453 19.5771 14.5294C17.1953 15.3212 14.6477 17.5 12 17.5C9.35227 17.5 6.80469 15.3212 4.42289 14.5294C4.16984 14.4452 3.94361 14.3149 3.75 14.1499M3.75 14.1499C3.27808 13.7476 3 13.1389 3 12.4889V8.70569C3 7.62475 3.7679 6.69082 4.83694 6.53086C5.96233 6.36247 7.10049 6.23315 8.25 6.14432M15.75 6.14432V5.25C15.75 4.00736 14.7426 3 13.5 3H10.5C9.25736 3 8.25 4.00736 8.25 5.25V6.14432M15.75 6.14432C14.5126 6.0487 13.262 6 12 6C10.738 6 9.48744 6.0487 8.25 6.14432" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    gift: {
      viewBox: "0 0 24 24",
      body: '<path d="M21 11.25V19.5C21 20.3284 20.3284 21 19.5 21H5.25C4.42157 21 3.75 20.3284 3.75 19.5V11.25M12 4.875C12 3.42525 10.8247 2.25 9.375 2.25C7.92525 2.25 6.75 3.42525 6.75 4.875C6.75 6.32475 7.92525 7.5 9.375 7.5C10.1095 7.5 12 7.5 12 7.5M12 4.875C12 5.59024 12 7.5 12 7.5M12 4.875C12 3.42525 13.1753 2.25 14.625 2.25C16.0747 2.25 17.25 3.42525 17.25 4.875C17.25 6.32475 16.0747 7.5 14.625 7.5C13.8905 7.5 12 7.5 12 7.5M12 7.5V21M3.375 11.25H21.375C21.9963 11.25 22.5 10.7463 22.5 10.125V8.625C22.5 8.00368 21.9963 7.5 21.375 7.5H3.375C2.75368 7.5 2.25 8.00368 2.25 8.625V10.125C2.25 10.7463 2.75368 11.25 3.375 11.25Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    chart: {
      viewBox: "0 0 24 24",
      body: '<path d="M10.5 6C6.35786 6 3 9.35786 3 13.5C3 17.6421 6.35786 21 10.5 21C14.6421 21 18 17.6421 18 13.5H10.5V6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.5 10.5H21C21 6.35786 17.6421 3 13.5 3V10.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    "queue-list": {
      viewBox: "0 0 24 24",
      body: '<path d="M3.75 12H20.25M3.75 15.75H20.25M3.75 19.5H20.25M5.625 4.5H18.375C19.4105 4.5 20.25 5.33947 20.25 6.375C20.25 7.41053 19.4105 8.25 18.375 8.25H5.625C4.58947 8.25 3.75 7.41053 3.75 6.375C3.75 5.33947 4.58947 4.5 5.625 4.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    table: {
      viewBox: "0 0 24 24",
      body: '<path d="M3.375 19.5H20.625M3.375 19.5C2.75368 19.5 2.25 18.9963 2.25 18.375M3.375 19.5H10.875C11.4963 19.5 12 18.9963 12 18.375M2.25 18.375V5.625M2.25 18.375V16.875C2.25 16.2537 2.75368 15.75 3.375 15.75M21.75 18.375V5.625M21.75 18.375C21.75 18.9963 21.2463 19.5 20.625 19.5M21.75 18.375V16.875C21.75 16.2537 21.2463 15.75 20.625 15.75M20.625 19.5H13.125C12.5037 19.5 12 18.9963 12 18.375M21.75 5.625C21.75 5.00368 21.2463 4.5 20.625 4.5H3.375C2.75368 4.5 2.25 5.00368 2.25 5.625M21.75 5.625V7.125C21.75 7.74632 21.2463 8.25 20.625 8.25M2.25 5.625V7.125C2.25 7.74632 2.75368 8.25 3.375 8.25M3.375 8.25H20.625M3.375 8.25H10.875C11.4963 8.25 12 8.75368 12 9.375M3.375 8.25C2.75368 8.25 2.25 8.75368 2.25 9.375V10.875C2.25 11.4963 2.75368 12 3.375 12M20.625 8.25H13.125C12.5037 8.25 12 8.75368 12 9.375M20.625 8.25C21.2463 8.25 21.75 8.75368 21.75 9.375V10.875C21.75 11.4963 21.2463 12 20.625 12M3.375 12H10.875M3.375 12C2.75368 12 2.25 12.5037 2.25 13.125V14.625C2.25 15.2463 2.75368 15.75 3.375 15.75M12 10.875V9.375M12 10.875C12 11.4963 11.4963 12 10.875 12M12 10.875C12 11.4963 12.5037 12 13.125 12M10.875 12C11.4963 12 12 12.5037 12 13.125M13.125 12H20.625M13.125 12C12.5037 12 12 12.5037 12 13.125M20.625 12C21.2463 12 21.75 12.5037 21.75 13.125V14.625C21.75 15.2463 21.2463 15.75 20.625 15.75M3.375 15.75H10.875M12 14.625V13.125M12 14.625C12 15.2463 11.4963 15.75 10.875 15.75M12 14.625C12 15.2463 12.5037 15.75 13.125 15.75M10.875 15.75C11.4963 15.75 12 16.2537 12 16.875M12 18.375V16.875M12 16.875C12 16.2537 12.5037 15.75 13.125 15.75M13.125 15.75H20.625" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    "document-text": {
      viewBox: "0 0 24 24",
      body: '<path d="M19.5 14.25V11.625C19.5 9.76104 17.989 8.25 16.125 8.25H14.625C14.0037 8.25 13.5 7.74632 13.5 7.125V5.625C13.5 3.76104 11.989 2.25 10.125 2.25H8.25M8.25 15H15.75M8.25 18H12M10.5 2.25H5.625C5.00368 2.25 4.5 2.75368 4.5 3.375V20.625C4.5 21.2463 5.00368 21.75 5.625 21.75H18.375C18.9963 21.75 19.5 21.2463 19.5 20.625V11.25C19.5 6.27944 15.4706 2.25 10.5 2.25Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    "chat-bubble": {
      viewBox: "0 0 24 24",
      body: '<path d="M20.25 8.51104C21.1341 8.79549 21.75 9.6392 21.75 10.6082V14.8938C21.75 16.0304 20.9026 16.9943 19.7697 17.0867C19.4308 17.1144 19.0909 17.1386 18.75 17.1592V20.25L15.75 17.25C14.3963 17.25 13.0556 17.1948 11.7302 17.0866C11.4319 17.0623 11.1534 16.9775 10.9049 16.8451M20.25 8.51104C20.0986 8.46232 19.9393 8.43 19.7739 8.41628C18.4472 8.30616 17.1051 8.25 15.75 8.25C14.3948 8.25 13.0528 8.30616 11.7261 8.41627C10.595 8.51015 9.75 9.47323 9.75 10.6082V14.8937C9.75 15.731 10.2099 16.4746 10.9049 16.8451M20.25 8.51104V6.63731C20.25 5.01589 19.0983 3.61065 17.4903 3.40191C15.4478 3.13676 13.365 3 11.2503 3C9.13533 3 7.05233 3.13678 5.00963 3.40199C3.40173 3.61074 2.25 5.01598 2.25 6.63738V12.8626C2.25 14.484 3.40173 15.8893 5.00964 16.098C5.58661 16.1729 6.16679 16.2376 6.75 16.2918V21L10.9049 16.8451" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
    }
  };

  const adminNavGroups = [
    {
      title: "Dashboard",
      icon: "stack",
      directHref: "dashboard.html",
      items: [
        { label: "Dashboard", href: "dashboard.html" }
      ]
    },
    {
      title: "Church Setup",
      id: "church-setup",
      icon: "briefcase",
      items: [
        { label: "Church Profile", href: "church-profile.html" },
        { label: "Service Schedule", href: "service-schedule.html" },
        { label: "Branches", href: "branches.html" }
      ]
    },
    {
      title: "Services",
      id: "operations",
      icon: "stack",
      items: [
        { label: "Record Attendance", href: "attendance.html" }
      ]
    },
    {
      title: "Members",
      id: "member-journey",
      icon: "queue-list",
      items: [
        { label: "Add Member", href: "members.html" },
        { label: "Member Registry", href: "member-registry.html" },
        { label: "Church Units", href: "church-units.html" }
      ]
    },
    {
      title: "Homecell Management",
      id: "homecell-mgmt",
      icon: "home",
      items: [
        { label: "Homecells", href: "homecells.html" },
        { label: "Homecell Leaders", href: "homecell-leaders.html" },
        { label: "Homecell Attendance", href: "homecell-office.html" },
        { label: "Homecell Records", href: "homecell-attendance-records.html" },
        { label: "Homecell Reports", href: "homecell-reports.html" }
      ]
    },
    {
      title: "Reports",
      id: "reports-group",
      icon: "chart",
      items: [
        { label: "Branch Report", href: "growth-reports.html" },
        { label: "Service Report", href: "attendance-reports.html" },
        { label: "Homecell Report", href: "homecell-reports.html" },
        { label: "Member Report", href: "retention-reports.html" }
      ]
    },
    {
      title: "Administration",
      id: "admin-group",
      icon: "table",
      items: [
        { label: "Users", href: "users.html" }
      ]
    }
  ];

  const homecellLeaderNavGroups = [
    {
      title: "Dashboard",
      icon: "stack",
      directHref: "homecell-leader-dashboard.html",
      items: [
        { label: "Dashboard", href: "homecell-leader-dashboard.html" }
      ]
    },
    {
      title: "Homecell Management",
      id: "homecell-mgmt",
      icon: "home",
      items: [
        { label: "Homecell Attendance", href: "homecell-office.html" },
        { label: "Homecell Records", href: "homecell-attendance-records.html" }
      ]
    },
    {
      title: "Profile",
      icon: "briefcase",
      directHref: "homecell-leader-profile.html",
      items: [
        { label: "My Profile", href: "homecell-leader-profile.html" }
      ]
    }
  ];

  function getSession() {
    const raw = window.localStorage.getItem(sessionKey);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      window.localStorage.removeItem(sessionKey);
      return null;
    }
  }

  function hasValidSession(value) {
    return Boolean(
      value &&
      value.user &&
      value.user.id &&
      value.church &&
      value.church.id
    );
  }

  function clearSession() {
    window.localStorage.removeItem(sessionKey);
  }

  function isHomecellLeaderSession(value) {
    return Boolean(
      value &&
      value.user &&
      value.user.role === "homecell_leader" &&
      value.homecell &&
      value.homecell.id
    );
  }

  function getDefaultDashboardPath() {
    return isHomecellLeaderSession(session)
      ? "homecell-leader-dashboard.html"
      : "dashboard.html";
  }

  function icon(sprite) {
    const iconDef = iconMarkup[sprite];
    if (!iconDef) {
      return "";
    }
    return `<svg stroke="currentColor" stroke-width="1.5" viewBox="${iconDef.viewBox}" fill="none" aria-hidden="true">${iconDef.body}</svg>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isActive(href) {
    return href.split("#")[0] === normalizedPage;
  }

  function resolveChurchAdminName() {
    if (isHomecellLeaderSession(session)) {
      const leaderName = session.homecell_leader && session.homecell_leader.name
        ? session.homecell_leader.name
        : (session.user && session.user.name ? session.user.name : "");

      return escapeHtml(leaderName || "Homecell Leader");
    }

    const churchUsers = session.church && Array.isArray(session.church.users)
      ? session.church.users
      : [];
    const churchAdmin = churchUsers.find((user) => user && user.role === "church_admin" && user.name);

    if (churchAdmin && churchAdmin.name) {
      return escapeHtml(churchAdmin.name);
    }

    if (session.user && session.user.role === "church_admin" && session.user.name) {
      return escapeHtml(session.user.name);
    }

    return "Church Admin";
  }

  function buildNav() {
    const nav = document.getElementById("church-nav");
    if (!nav) return;
    const navGroups = isHomecellLeaderSession(session) ? homecellLeaderNavGroups : adminNavGroups;
    const churchName = escapeHtml(session.church.name || "Church Workspace");
    const branchName = session.branch && session.branch.name ? escapeHtml(session.branch.name) : "";
    const homecellName = session.homecell && session.homecell.name ? escapeHtml(session.homecell.name) : "";
    let workspaceLabel = churchName;

    if (isHomecellLeaderSession(session) && homecellName) {
      workspaceLabel = `${churchName} / ${homecellName}`;
    } else if (branchName) {
      workspaceLabel = `${churchName} / ${branchName}`;
    }

    const groupsHtml = navGroups.map((group) => {
      if (group.directHref) {
        return `
          <li class="no-sub ${isActive(group.directHref) ? "active" : ""}">
            <a href="${group.directHref}">
              ${icon(group.icon)}
              ${group.title}
            </a>
          </li>
        `;
      }

      const groupOpen = group.items.some((item) => isActive(item.href));

      return `
        <li>
          <a aria-expanded="${groupOpen ? "true" : "false"}" data-bs-toggle="collapse" href="#${group.id}">
            ${icon(group.icon)}
            ${group.title}
          </a>
          <ul class="collapse ${groupOpen ? "show" : ""}" id="${group.id}">
            ${group.items.map((item) => `<li class="${isActive(item.href) ? "active" : ""}"><a href="${item.href}">${item.label}</a></li>`).join("")}
          </ul>
        </li>
      `;
    }).join("");

    const supportHtml = isHomecellLeaderSession(session) ? "" : `
          <li class="menu-title"><span>Support</span></li>
          <li class="no-sub">
            <a href="support.html">
              ${icon("chat-bubble")}
              Support
            </a>
          </li>
    `;

    nav.innerHTML = `
      <div class="app-logo">
        <a class="logo d-inline-block" href="${getDefaultDashboardPath()}">
          <!-- <img alt="logo" src="assets/images/logo/1.png"> -->
        </a>

        <span class="bg-light-primary toggle-semi-nav d-flex-center">
          <i class="ti ti-chevron-right"></i>
        </span>

        <div class="d-flex align-items-center nav-profile p-3">
          <span class="h-45 w-45 d-flex-center b-r-10 position-relative bg-primary m-auto">
            <img alt="avatar" class="img-fluid b-r-10" src="assets/images/avatar/1.png">
            <span class="position-absolute top-0 end-0 p-1 bg-success border border-light rounded-circle"></span>
          </span>
          <div class="flex-grow-1 ps-2">
            <p class="text-muted f-s-12 mb-0">${workspaceLabel}</p>
          </div>
        </div>
      </div>
      <div class="app-nav" id="app-simple-bar">
        <ul class="main-nav p-0 mt-2">
          ${groupsHtml}
          ${supportHtml}
        </ul>
      </div>
      <div class="menu-navs">
        <span class="menu-previous"><i class="ti ti-chevron-left"></i></span>
        <span class="menu-next"><i class="ti ti-chevron-right"></i></span>
      </div>
    `;
  }

  function buildHeader() {
    const header = document.getElementById("church-header");
    if (!header) return;

    const title = document.body.dataset.title || "Church Management System";
    const subtitle = document.body.dataset.subtitle || "Administrative workspace";
    const userName = resolveChurchAdminName();
    const churchName = isHomecellLeaderSession(session) && session.homecell && session.homecell.name
      ? escapeHtml(session.homecell.name)
      : escapeHtml(session.church.name || "Church Workspace");
    const searchPlaceholder = isHomecellLeaderSession(session)
      ? "Search my homecell records..."
      : "Search members, districts, homecells...";

    header.innerHTML = `
      <div class="container-fluid">
        <div class="row">
          <div class="col-6 col-sm-6 d-flex align-items-center header-left p-0">
            <span class="header-toggle">
              <i class="ti ti-layout-sidebar-left-collapse"></i>
            </span>
            <div class="header-searchbar w-100">
              <form action="#" class="mx-3 app-form app-icon-form">
                <div class="position-relative">
                  <input aria-label="Search" class="form-control" placeholder="${searchPlaceholder}" type="search">
                  <i class="ti ti-search text-dark"></i>
                </div>
              </form>
            </div>
          </div>

          <div class="col-6 col-sm-6 d-flex align-items-center justify-content-end header-right p-0">
            <ul class="d-flex align-items-center">
              <li class="header-notification">
                <a class="d-block head-icon position-relative" href="${getDefaultDashboardPath()}#notifications">
                  <i class="ti ti-bell-ringing"></i>
                  <span class="position-absolute translate-middle badge rounded-pill bg-danger" style="top: 8px; right: -6px;">8</span>
                </a>
              </li>
              <li class="header-profile">
                <a aria-expanded="false" class="d-block head-icon" data-bs-toggle="dropdown" href="#">
                  <img alt="avatar" class="b-r-10 h-35 w-35" src="assets/images/avatar/1.png">
                </a>
                <ul class="dropdown-menu profile-dropdown p-2">
                  <li class="dropdown-item-text">
                    <h6 class="mb-0">${userName}</h6>
                    <p class="text-muted mb-0 f-s-12">${churchName}</p>
                  </li>
                  <li><hr class="dropdown-divider"></li>
                  <li><span class="dropdown-item-text text-muted f-s-12">${escapeHtml(title)}<br>${escapeHtml(subtitle)}</span></li>
                  <li><hr class="dropdown-divider"></li>
                  <li><a class="dropdown-item" href="${isHomecellLeaderSession(session) ? "homecell-leader-profile.html" : "settings.html"}">${isHomecellLeaderSession(session) ? "My Profile" : "Settings"}</a></li>
                  <li><a class="dropdown-item text-danger" href="#" id="logoutLink">Logout</a></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  function bindLogout() {
    const logoutLink = document.getElementById("logoutLink");
    if (!logoutLink) return;

    logoutLink.addEventListener("click", function (event) {
      event.preventDefault();
      clearSession();
      window.location.replace("sign_in.html");
    });
  }

  function init() {
    buildNav();
    buildHeader();
    bindLogout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
