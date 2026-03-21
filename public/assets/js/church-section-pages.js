(function () {
  const sectionPages = {
    "church-profile": {
      title: "Church Profile",
      subtitle: "Church identity, contact details and profile metadata.",
      actions: [{ label: "Edit Church Profile", href: "#", variant: "primary" }],
      cards: [
        { title: "Profile Details", items: ["Church Name: Living Faith Central", "Church Code: LFC-LAG-001", "State: Lagos", "Phone Number: +234 801 234 5678", "Email: info@livingfaithcentral.org", "Pastor in Charge: Pst. Samuel Adeyemi"] },
        { title: "Status", items: ["Date Created: 2026-01-04", "Status: Active", "Address: 12 Covenant Avenue, Lekki Phase 1"] }
      ]
    },
    "church-structure": {
      title: "Church Structure",
      subtitle: "Hierarchy, levels and structure visibility for the church network.",
      actions: [{ label: "Add Level", href: "#", variant: "primary" }, { label: "View Structure Tree", href: "#", variant: "light-primary" }],
      stats: [
        { label: "Structure Levels", value: "5", note: "State to Branch" },
        { label: "Configured Branches", value: "5", note: "Active branch records" },
        { label: "Districts", value: "14", note: "Linked into hierarchy" }
      ],
      cards: [
        { title: "Hierarchy Levels", items: ["State Church", "District Church", "Zonal Church", "Area Church", "Church Branch"] },
        { title: "Current Notes", items: ["District 4 needs leadership alignment", "Chevron Zone requires coordinator assignment", "Structure tree is ready for deeper CRUD wiring"] }
      ]
    },
    branches: {
      title: "Branches",
      subtitle: "Manage church branches, their location details and branch oversight.",
      actions: [{ label: "Add Branch", href: "#", variant: "primary" }, { label: "View Branch", href: "#", variant: "light-primary" }],
      table: {
        title: "Branch List",
        headers: ["Branch Name", "Address", "State", "Pastor in Charge", "Status"],
        rows: [
          ["Lekki Central", "Lekki Phase 1", "Lagos", "Pst. Samuel Adeyemi", "Active"],
          ["Ajah Outreach", "Abraham Adesanya", "Lagos", "Pst. Florence Balogun", "Active"],
          ["Chevron Branch", "Chevron Drive", "Lagos", "Pst. David Nnadi", "Review"]
        ]
      }
    },
    districts: {
      title: "Districts",
      subtitle: "District records, assigned pastors and district-level performance coverage.",
      actions: [{ label: "Add District", href: "#", variant: "primary" }, { label: "Assign District Pastor", href: "#", variant: "light-primary" }],
      table: {
        title: "District Overview",
        headers: ["District", "Assigned Pastor", "Assigned Coordinator", "Homecells", "Members", "Status"],
        rows: [
          ["District 1", "Pst. Chika Okafor", "Dcn. Ruth Eze", "8", "272", "Covered"],
          ["District 4", "Unassigned", "Bro. Tunde Bello", "6", "214", "Pastor Gap"],
          ["District 9", "Pst. Efe Ighalo", "Unassigned", "5", "166", "Coordinator Gap"]
        ]
      }
    },
    zones: {
      title: "Sub-Districts / Zones",
      subtitle: "Zone-level records, coordinators and district linkage.",
      actions: [{ label: "Add Zone", href: "#", variant: "primary" }, { label: "Assign Coordinator", href: "#", variant: "light-primary" }],
      table: {
        title: "Zones",
        headers: ["Zone", "District", "Coordinator", "Homecells", "Status"],
        rows: [
          ["Admiralty Zone", "District 1", "Dcn. Ruth Eze", "4", "Assigned"],
          ["Chevron Zone", "District 4", "Unassigned", "3", "Gap"],
          ["Ikota Zone", "District 7", "Bro. Ifeanyi Obi", "5", "Stable"]
        ]
      }
    },
    homecells: {
      title: "Homecells",
      subtitle: "Homecell network, meetings, leaders and membership strength.",
      actions: [{ label: "Create Homecell", href: "#", variant: "primary" }, { label: "Assign Leader", href: "#", variant: "light-primary" }],
      table: {
        title: "Homecells",
        headers: ["Homecell", "District", "Zone", "Leader", "Meeting", "Members"],
        rows: [
          ["Grace Cell", "District 1", "Admiralty Zone", "Sis. Nkiru James", "Wed, 6:30 PM", "31"],
          ["Victory Cell", "District 4", "Chevron Zone", "Bro. Ayo Alabi", "Thu, 7:00 PM", "22"],
          ["Dominion Cell", "District 9", "Ikota Zone", "Unassigned", "Tue, 6:00 PM", "18"]
        ]
      }
    },
    "church-units": {
      title: "Church Units",
      subtitle: "Unit creation, unit heads and member assignment visibility.",
      actions: [{ label: "Add Unit", href: "#", variant: "primary" }, { label: "Assign Unit Head", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Active Units", items: ["Technical - 26 members", "Choir - 42 members", "Ushering - unit head review pending", "Media - active", "Children Church - active"] },
        { title: "Examples", items: ["Technical", "Choir", "Ushering", "Media", "Protocol", "Children Church"] }
      ]
    },
    "first-timers": {
      title: "First Timers",
      subtitle: "Capture, follow-up and move first timers into members when ready.",
      actions: [{ label: "Register First Timer", href: "#", variant: "primary" }, { label: "Assign Follow-Up", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Current Queue", items: ["Sarah Omole - move to members", "Chinedu Nneji - tracking", "Joy Bassey - ready"] },
        { title: "Core Fields", items: ["Name", "Phone Number", "Address", "Invited By", "Assigned Follow-Up Team", "Foundation Class Status"] }
      ]
    },
    members: {
      title: "Members",
      subtitle: "Member records, milestones, homecell and unit assignment status.",
      actions: [{ label: "Add Member", href: "#", variant: "primary" }, { label: "Update Milestones", href: "#", variant: "light-primary" }],
      table: {
        title: "Member List",
        headers: ["Full Name", "Phone", "Date Joined", "Homecell", "Unit", "Status"],
        rows: [
          ["Mercy Akinola", "+234 803 114 9000", "2026-03-15", "Unassigned", "Choir", "Assign Homecell"],
          ["John Nwachukwu", "+234 802 444 1122", "2026-02-18", "Grace Cell", "Protocol", "Growing"],
          ["Faith Johnson", "+234 809 222 6733", "2025-11-06", "Victory Cell", "Ushering", "Active"]
        ]
      }
    },
    "new-converts": {
      title: "New Converts",
      subtitle: "Counselling, class enrolment and baptism journey for new converts.",
      actions: [{ label: "Add New Convert", href: "#", variant: "primary" }, { label: "Assign Counsellor", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Progress Queue", items: ["Favour Eke - counsellor assigned", "Daniel Afolabi - water baptism pending"] },
        { title: "Tracked Milestones", items: ["Foundation Class", "Water Baptism", "Holy Ghost Baptism", "Homecell"] }
      ]
    },
    rededications: {
      title: "Re-Dedications",
      subtitle: "Track re-dedication records, counselling and homecell reintegration.",
      actions: [{ label: "Add Re-Dedication", href: "#", variant: "primary" }, { label: "Assign Counsellor", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Active Cases", items: ["Peter Edet - counsellor and homecell pending", "Rita Oko - follow-up scheduled"] },
        { title: "Required Tracking", items: ["Date of Re-Dedication", "Counsellor", "Foundation Class", "Water Baptism", "Homecell"] }
      ]
    },
    workers: {
      title: "Workers / Leaders",
      subtitle: "General workforce and ministry-leadership categories.",
      actions: [{ label: "Add Worker", href: "#", variant: "primary" }, { label: "Assign Role", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Categories", items: ["Pastors", "District Pastors", "District Ministers", "Zone Ministers", "Homecell Leaders", "Unit Heads", "Coordinators"] },
        { title: "Actions", items: ["Add Worker", "Edit Worker", "Assign Role", "Assign Area"] }
      ]
    },
    users: {
      title: "Users",
      subtitle: "System users, roles and assignment scope.",
      actions: [{ label: "Add User", href: "#", variant: "primary" }, { label: "Assign Role", href: "#", variant: "light-primary" }],
      table: {
        title: "User Accounts",
        headers: ["Full Name", "Phone", "Email", "Role", "Assigned Area", "Status"],
        rows: [
          ["Adebisi Oladele", "+234 803 876 9000", "admin@livingfaithcentral.org", "Admin", "Main Church", "Active"],
          ["Ruth Eze", "+234 806 761 2055", "ruth.eze@livingfaithcentral.org", "District Minister", "District 1", "Active"],
          ["Samuel Ogunleye", "+234 805 119 4130", "samuel.ogunleye@livingfaithcentral.org", "Homecell Office Admin", "Homecell Office", "Reset Password"]
        ]
      }
    },
    pastors: {
      title: "Pastors",
      subtitle: "Pastoral roster and branch/district oversight assignments.",
      actions: [{ label: "Add Pastor", href: "#", variant: "primary" }, { label: "Assign to Branch", href: "#", variant: "light-primary" }],
      table: {
        title: "Pastors",
        headers: ["Name", "Phone", "Email", "Rank", "Assigned Church", "Status"],
        rows: [
          ["Pst. Samuel Adeyemi", "+234 803 111 2233", "samuel.adeyemi@lfc.org", "Pastor in Charge", "Lekki Central", "Active"],
          ["Pst. Florence Balogun", "+234 802 118 7722", "florence.balogun@lfc.org", "Branch Pastor", "Ajah Outreach", "Assigned"]
        ]
      }
    },
    "district-pastors": {
      title: "District Pastors",
      subtitle: "District-level pastoral placements and gaps.",
      actions: [{ label: "Add District Pastor", href: "#", variant: "primary" }, { label: "Assign District", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Assignments", items: ["District 1 - Pst. Chika Okafor", "District 4 - Vacancy"] }
      ]
    },
    "district-ministers": {
      title: "District Ministers",
      subtitle: "District minister records and assignment status.",
      actions: [{ label: "Add District Minister", href: "#", variant: "primary" }, { label: "Assign District", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Assignments", items: ["Min. Ruth Eze - District 1", "District 9 role pending reassignment"] }
      ]
    },
    "zone-ministers": {
      title: "Zone Ministers",
      subtitle: "Zone minister records and zone coverage gaps.",
      actions: [{ label: "Add Zone Minister", href: "#", variant: "primary" }, { label: "Assign Zone", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Assignments", items: ["Admiralty Zone - Bro. Kene Mba", "Chevron Zone - Vacancy"] }
      ]
    },
    "homecell-leaders": {
      title: "Homecell Leaders / Coordinators",
      subtitle: "Homecell leaders and coordinator-level placement.",
      actions: [{ label: "Add Homecell Leader", href: "#", variant: "primary" }, { label: "Assign Homecell", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Assignments", items: ["Grace Cell - Sis. Nkiru James", "Dominion Cell - temporary oversight"] }
      ]
    },
    assignments: {
      title: "Assignments",
      subtitle: "All assignment types across leadership, members, homecells and units.",
      actions: [{ label: "Create Assignment", href: "#", variant: "primary" }, { label: "Filter by Type", href: "#", variant: "light-primary" }],
      table: {
        title: "Assignment Queue",
        headers: ["Assignment Type", "Person", "Destination", "Status"],
        rows: [
          ["District Pastor to District", "Pst. Chika Okafor", "District 1", "Active"],
          ["Zone Minister to Zone", "Pending candidate", "Chevron Zone", "Unfilled"],
          ["Member to Homecell", "Mercy Akinola", "Awaiting assignment", "Queued"]
        ]
      }
    },
    "hospitality-unit": {
      title: "Hospitality Unit",
      subtitle: "First timer intake, hospitality follow-up and class handoff.",
      actions: [{ label: "Register First Timer", href: "#", variant: "primary" }, { label: "Assign Follow-Up", href: "#", variant: "light-primary" }],
      stats: [
        { label: "Total First Timers", value: "126", note: "Tracked in the unit" },
        { label: "This Week", value: "42", note: "Recent visitors" },
        { label: "Without Foundation Class", value: "29", note: "Need handoff" },
        { label: "Without Homecell", value: "17", note: "Pending assignment" }
      ]
    },
    "callers-squad": {
      title: "Callers Squad",
      subtitle: "Call follow-up queue for members missing key milestones.",
      actions: [{ label: "Call Member", href: "#", variant: "primary" }, { label: "Add Call Note", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Today’s Calls", items: ["Mercy Akinola - schedule foundation class", "Daniel Afolabi - water baptism reminder", "9 members still without units"] }
      ]
    },
    "counselling-unit": {
      title: "Counselling Unit",
      subtitle: "Counselling records for new converts and re-dedications.",
      actions: [{ label: "Record Counselling", href: "#", variant: "primary" }, { label: "Assign Counsellor", href: "#", variant: "light-primary" }],
      cards: [
        { title: "Current Workload", items: ["16 active counselling cases", "8 re-dedications awaiting counsellor"] }
      ]
    },
    "foundation-class": {
      title: "Believers Foundation Class",
      subtitle: "Class enrolment, completions and baptism follow-up readiness.",
      actions: [{ label: "Enroll Member", href: "#", variant: "primary" }, { label: "Mark Completed", href: "#", variant: "light-primary" }],
      stats: [
        { label: "Enrolled", value: "112", note: "Current students" },
        { label: "Completed Today", value: "8", note: "Latest completions" },
        { label: "Pending Water Baptism", value: "54", note: "Next milestone" }
      ]
    },
    "homecell-office": {
      title: "Homecell Office",
      subtitle: "Homecell expansion, assignment coverage and low-attendance monitoring.",
      actions: [{ label: "Create Homecell", href: "#", variant: "primary" }, { label: "Assign Member", href: "#", variant: "light-primary" }],
      stats: [
        { label: "Total Homecells", value: "83", note: "Configured network" },
        { label: "Members in Homecells", value: "91%", note: "Assignment coverage" },
        { label: "Low Attendance Cells", value: "12", note: "Needs review" },
        { label: "Awaiting Assignment", value: "16", note: "New member queue" }
      ]
    },
    "operations": {
      title: "Operations",
      subtitle: "Attendance, first timers, new converts, and rededications records.",
      actions: [
        { label: "Export Records", href: "#", variant: "primary" },
        { label: "View Weekly", href: "#", variant: "light-primary" },
        { label: "View Monthly", href: "#", variant: "light-primary" }
      ],
      stats: [
        { label: "Highest Attendance", value: "3,402", note: "This period" },
        { label: "Average Attendance", value: "2,876", note: "This period" },
        { label: "Total Attendance", value: "11,504", note: "This period" }
      ],
      table: {
        title: "Operations Records",
        headers: ["Report", "Date", "Total", "Status"],
        rows: [
          ["Sunday Service", "2026-03-15", "3,402", "Submitted"],
          ["Homecell Attendance", "2026-03-14", "2,116", "3 Missing"],
          ["Unit Attendance", "2026-03-13", "512", "Reviewed"]
        ]
      }
    },
    "homecell-reports": {
      title: "Homecell Report",
      subtitle: "Homecell attendance, submission coverage and leader-level reporting view.",
      table: {
        title: "Homecell Report",
        headers: ["Homecell", "Leader", "Branch", "Total", "Date Submitted"],
        rows: [
          ["Grace Cell", "Sis. Nkiru James", "Lekki Central", "31", "2026-03-14"],
          ["Victory Cell", "Bro. Ayo Alabi", "Ajah Outreach", "22", "2026-03-14"]
        ]
      }
    },
    "growth-reports": {
      title: "Branch Report",
      subtitle: "Branch network visibility across attendance, homecells, leadership coverage and structure health.",
      actions: [
        { label: "Export Branch Report", href: "#", variant: "primary" },
        { label: "View Branches", href: "branches.html", variant: "light-primary" }
      ],
      cards: [
        {
          title: "Live Data Status",
          items: [
            "Demo branch figures have been removed from this page.",
            "This report should eventually summarize branch attendance, homecells, and leadership coverage from live backend data."
          ]
        },
        {
          title: "Expected View",
          items: [
            "Branch name and tag",
            "Parent church or parent branch",
            "Homecell count and attendance totals",
            "Coverage and leadership gaps"
          ]
        }
      ]
    },
    "retention-reports": {
      title: "Member Report",
      subtitle: "People-flow reporting across first timers, new converts, re-dedications and follow-up readiness.",
      actions: [
        { label: "Add Member", href: "members.html", variant: "primary" },
        { label: "View Members", href: "member-registry.html", variant: "light-primary" }
      ],
      cards: [
        {
          title: "Live Data Status",
          items: [
            "Demo member report entries have been removed from this page.",
            "This report should eventually summarize first timers, new converts, re-dedications, and follow-up progress from live records."
          ]
        },
        {
          title: "Expected View",
          items: [
            "Person name and entry type",
            "Branch and service date",
            "Invited by or contact person",
            "Next action and follow-up status"
          ]
        }
      ]
    },
    "attendance-reports": {
      title: "Service Report",
      subtitle: "Service-level reporting across attendance, altar response counts and branch submission visibility.",
      actions: [
        { label: "Record Attendance", href: "attendance.html", variant: "primary" },
        { label: "View Schedule", href: "service-schedule.html", variant: "light-primary" }
      ],
      cards: [
        {
          title: "Live Data Status",
          items: [
            "Demo service report totals have been removed from this page.",
            "This report should eventually summarize service attendance, first timers, new converts, re-dedications, and recorders from live attendance data."
          ]
        },
        {
          title: "Expected View",
          items: [
            "Service date and branch",
            "Service label or schedule",
            "Attendance totals and altar response counts",
            "Recorded by and submission completeness"
          ]
        }
      ]
    },
    "baptism-reports": {
      title: "Baptism Reports",
      subtitle: "Water and Holy Ghost baptism completion metrics.",
      stats: [
        { label: "Water Baptism Completed", value: "82", note: "Current quarter" },
        { label: "Holy Ghost Completed", value: "46", note: "Current quarter" },
        { label: "Pending Baptism", value: "61", note: "Follow-up required" }
      ]
    },
    "foundation-class-reports": {
      title: "Foundation Class Reports",
      subtitle: "Enrolment, completion and pending class outcomes.",
      stats: [
        { label: "Enrolled", value: "112", note: "Current class members" },
        { label: "Completed", value: "63", note: "Quarter completions" },
        { label: "Pending", value: "49", note: "Awaiting updates" }
      ]
    },
    roles: {
      title: "Roles",
      subtitle: "Role catalogue for church administration and ministry operations.",
      actions: [{ label: "Create Role", href: "#", variant: "primary" }],
      cards: [
        { title: "Available Roles", items: ["Super Admin", "Admin", "District Pastor", "District Minister", "Zone Minister", "Homecell Leader", "Hospitality Unit", "Callers Squad", "Counselling Unit", "Foundation Class Admin", "Homecell Office Admin"] }
      ]
    },
    permissions: {
      title: "Permissions",
      subtitle: "Permission matrix by role and module.",
      actions: [{ label: "Enable / Disable", href: "#", variant: "primary" }],
      table: {
        title: "Permission Matrix",
        headers: ["Permission Group", "Admin", "District Pastor", "Homecell Office"],
        rows: [
          ["Members", "View / Create / Edit", "View / Edit Own Scope", "Assign Homecell"],
          ["Users", "Manage", "View", "No"],
          ["Reports", "All Reports", "District Reports", "Homecell Reports"],
          ["Assignments", "Manage", "Recommend", "Homecell Only"]
        ]
      }
    },
    "audit-logs": {
      title: "Audit Logs",
      subtitle: "Track user actions across system modules.",
      table: {
        title: "Audit Log",
        headers: ["User", "Action", "Module", "Date", "Time"],
        rows: [
          ["Adebisi Oladele", "User created", "Users", "2026-03-16", "09:14"],
          ["Ruth Eze", "Member updated", "Members", "2026-03-16", "08:47"],
          ["Samuel Ogunleye", "Homecell assigned", "Assignments", "2026-03-15", "17:33"]
        ]
      }
    },
    settings: {
      title: "Settings",
      subtitle: "General church settings, defaults and notification controls.",
      actions: [{ label: "Save Settings", href: "#", variant: "primary" }],
      cards: [
        { title: "General Settings", items: ["Church Name: Living Faith Central", "Time Zone: Africa/Lagos", "Contact Information: +234 801 234 5678", "Default Language: English"] },
        { title: "System Controls", items: ["Member ID format: LFC-{YEAR}-{SEQUENCE}", "Dashboard settings enabled", "Notification settings active", "Auto assignment rules: prototype only"] }
      ]
    },
    support: {
      title: "Support",
      subtitle: "Operational support, training support and escalation guidance.",
      cards: [
        { title: "Operational Support", items: ["help@churchflow.local", "Use for access issues, reporting issues and admin support"] },
        { title: "Training Support", items: ["Use section pages as guided onboarding", "Prepare role-based walkthroughs for ministry leads"] }
      ]
    }
  };

  const statusVariants = ["primary", "success", "danger", "warning"];
  const sectionKey = document.body.dataset.sectionKey;
  const root = document.getElementById("church-section-root");

  if (!sectionKey || !root || !sectionPages[sectionKey]) {
    return;
  }

  const config = sectionPages[sectionKey];
  document.title = `${config.title} | Church Management`;
  document.body.dataset.title = config.title;
  document.body.dataset.subtitle = config.subtitle;

  function buttonClass(variant) {
    return variant === "primary" ? "btn btn-primary" : `btn btn-${variant}`;
  }

  function renderStats(stats) {
    if (!stats || !stats.length) return "";
    return `
      <div class="row">
        ${stats.map((stat, index) => `
          <div class="col-md-6 col-xxl-3">
            <div class="card overview-details-box b-s-3-${statusVariants[index % statusVariants.length]}">
              <div class="card-body">
                <p class="text-dark f-w-600 mb-1">${stat.label}</p>
                <h3 class="text-${statusVariants[index % statusVariants.length]} mb-0">${stat.value}</h3>
                <span class="badge text-light-${statusVariants[index % statusVariants.length]} mt-2">${stat.note}</span>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderCards(cards) {
    if (!cards || !cards.length) return "";
    return `
      <div class="row">
        ${cards.map((card) => `
          <div class="col-lg-6">
            <div class="card">
              <div class="card-header"><h5 class="mb-0">${card.title}</h5></div>
              <div class="card-body">
                <ul class="list-group">
                  ${card.items.map((item) => `<li class="list-group-item">${item}</li>`).join("")}
                </ul>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTable(table) {
    if (!table) return "";
    return `
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header"><h5 class="mb-0">${table.title}</h5></div>
            <div class="card-body">
              <div class="table-responsive app-scroll">
                <table class="table table-bottom-border align-middle mb-0">
                  <thead>
                    <tr>${table.headers.map((header) => `<th>${header}</th>`).join("")}</tr>
                  </thead>
                  <tbody>
                    ${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  root.innerHTML = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
                <div>
                  <h4 class="mb-1">${config.title}</h4>
                  <p class="text-secondary mb-0">${config.subtitle}</p>
                </div>
                <div class="d-flex gap-2 flex-wrap">
                  ${(config.actions || []).map((action) => `<a class="${buttonClass(action.variant)}" href="${action.href}">${action.label}</a>`).join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${renderStats(config.stats)}
      ${renderTable(config.table)}
      ${renderCards(config.cards)}
    </div>
  `;
})();
