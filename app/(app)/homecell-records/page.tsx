"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BranchHierarchyFilter } from "@/components/filters/branch-hierarchy-filter";
import { TemplateLoader } from "@/components/ui/template-loader";
import { useSessionContext } from "@/components/providers/auth-guard";
import { formatDate } from "@/lib/format";
import { getDescendantBranchIds } from "@/lib/branch-hierarchy";
import { formatCurrency, getRangeDates, getTodayDate, looksLikeRoleLabel } from "@/lib/homecell-utils";
import { isHomecellLeaderSession } from "@/lib/session";
import {
  fetchBranches,
  fetchChurch,
  fetchHomecellAttendanceRecordsWithFilters,
  fetchHomecellAttendanceSummary,
  fetchHomecells,
  getBranchId,
  getChurchId,
} from "@/lib/workspace-api";
import type {
  BranchRecord,
  HomecellAttendanceRecord,
  HomecellAttendanceSummaryResponse,
  HomecellRecord,
} from "@/types/api";

export default function HomecellRecordsRoute() {
  const session = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const churchId = getChurchId(session);
  const branchId = getBranchId(session);
  const isHomecellLeader = isHomecellLeaderSession(session);
  const activeHomecellId = session.homecell?.id ? Number(session.homecell.id) : null;

  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [homecells, setHomecells] = useState<HomecellRecord[]>([]);
  const [churchUsers, setChurchUsers] = useState<Array<{ id: number; name?: string | null }>>([]);
  const [records, setRecords] = useState<HomecellAttendanceRecord[]>([]);
  const [summary, setSummary] = useState<HomecellAttendanceSummaryResponse["data"] | null>(null);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [date, setDate] = useState(getTodayDate());
  const [branchFilter, setBranchFilter] = useState(branchId ? String(branchId) : "");
  const [homecellFilter, setHomecellFilter] = useState(activeHomecellId ? String(activeHomecellId) : "");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const successMessage = searchParams.get("updated") === "1" ? "Attendance record updated successfully." : "";

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [churchResponse, branchesResponse, homecellsResponse] = await Promise.all([
          fetchChurch(churchId),
          fetchBranches(churchId, branchId),
          fetchHomecells(churchId, branchId),
        ]);

        if (!active) {
          return;
        }

        setChurchUsers(churchResponse.data?.users || []);
        setBranches(branchesResponse.data || []);
        setHomecells(homecellsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell records.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, [branchId, churchId]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const range = getRangeDates(date, period);
        const effectiveBranchId = isHomecellLeader ? (session.homecell?.branch?.id || branchId) : (Number(branchFilter || 0) || undefined);
        const effectiveHomecellId = isHomecellLeader ? (activeHomecellId || undefined) : (Number(homecellFilter || 0) || undefined);

        const [summaryResponse, recordsResponse] = await Promise.all([
          fetchHomecellAttendanceSummary(churchId, effectiveBranchId, effectiveHomecellId, period),
          fetchHomecellAttendanceRecordsWithFilters({
            churchId,
            branchId: effectiveBranchId,
            homecellId: effectiveHomecellId,
            dateFrom: range.start,
            dateTo: range.end,
            limit: 50,
          }),
        ]);

        if (!active) {
          return;
        }

        setSummary(summaryResponse.data || null);
        setRecords(recordsResponse.data || []);
      } catch (loadError) {
        if (active) {
          setErrorMessage(loadError instanceof Error ? loadError.message : "Unable to load homecell attendance records.");
        }
      }
    }

    void loadData();

    return () => {
      active = false;
    };
  }, [activeHomecellId, branchFilter, branchId, churchId, date, homecellFilter, isHomecellLeader, period, session.homecell?.branch?.id]);

  const filteredHomecells = useMemo(() => {
    const selectedBranchId = Number(branchFilter || 0) || null;
    const scopedBranchIds = selectedBranchId ? getDescendantBranchIds(branches, selectedBranchId) : [];
    return homecells.filter((homecell) => !selectedBranchId || scopedBranchIds.includes(Number(homecell.branch?.id || 0)));
  }, [branchFilter, branches, homecells]);

  async function exportRecordsAsExcel() {
    setErrorMessage("");

    try {
      const range = getRangeDates(date, period);
      const effectiveBranchId = isHomecellLeader ? (session.homecell?.branch?.id || branchId) : (Number(branchFilter || 0) || undefined);
      const effectiveHomecellId = isHomecellLeader ? (activeHomecellId || undefined) : (Number(homecellFilter || 0) || undefined);
      const response = await fetchHomecellAttendanceRecordsWithFilters({
        churchId,
        branchId: effectiveBranchId,
        homecellId: effectiveHomecellId,
        dateFrom: range.start,
        dateTo: range.end,
        limit: 1000,
      });
      const exportRecords = response.data || [];

      if (exportRecords.length === 0) {
        setErrorMessage("There are no homecell records to export for the current filters.");
        return;
      }

      const workbookXml = buildWsfWorkbookXml({
        branchMap: new Map(branches.map((branch) => [branch.id, branch])),
        churchName: session.church?.name || "LFC Jahi",
        period,
        records: exportRecords,
        reportDate: date,
      });

      const blob = new Blob([workbookXml], { type: "application/vnd.ms-excel" });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `wsf-report-${formatFileLabel(date || getTodayDate())}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (exportError) {
      setErrorMessage(exportError instanceof Error ? exportError.message : "Unable to export the WSF report.");
    }
  }

  if (isLoading) {
    return <TemplateLoader />;
  }

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="mb-1">Homecell Records</h4>
                  <p className="text-secondary mb-0">Review recent submissions by period, branch, or homecell, then open any record back in the attendance page for editing.</p>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <button className="btn btn-outline-success" onClick={exportRecordsAsExcel} type="button">
                    <i className="ti ti-file-spreadsheet me-1" />
                    Export Excel
                  </button>
                  <Link className="btn btn-outline-secondary" href="/homecell-attendance">
                    <i className="ti ti-clipboard-plus me-1" />
                    {isHomecellLeader ? "Record My Attendance" : "Record Attendance"}
                  </Link>
                  {!isHomecellLeader ? (
                    <Link className="btn btn-primary" href="/homecell-reports">
                      <i className="ti ti-chart-bar me-1" />
                      View Reports
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className={`alert alert-success ${successMessage ? "" : "d-none"}`}>{successMessage}</div>
          <div className={`alert alert-danger ${errorMessage ? "" : "d-none"}`}>{errorMessage}</div>
        </div>

        <StatCard borderClass="b-s-3-primary" badgeClass="text-light-primary" label="Total Attendance" value={Number(summary?.total_attendance || 0)} valueClass="text-primary">
          {period === "monthly" ? "Current month" : "Current week"}
        </StatCard>
        <StatCard borderClass="b-s-3-success" badgeClass="text-light-success" label="Reports Submitted" value={Number(summary?.reports_submitted || 0)} valueClass="text-success">
          Submitted records
        </StatCard>
        <StatCard borderClass="b-s-3-warning" badgeClass="text-light-warning" label="Average Attendance" value={Number(summary?.average_attendance || 0)} valueClass="text-warning">
          Per homecell meeting
        </StatCard>
        <StatCard
          borderClass="b-s-3-info"
          badgeClass="text-light-info"
          label="Coverage"
          value={`${summary?.homecells_covered || 0} / ${summary?.active_homecells || 0}`}
          valueClass="text-info"
        >
          {`${summary?.pending_homecells || 0} pending`}
        </StatCard>

        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
              <h5 className="mb-0">Homecell Records</h5>
              <div className="d-flex gap-2 flex-wrap">
                <select className="form-select form-select-sm" onChange={(event) => setPeriod(event.target.value as "weekly" | "monthly")} style={{ width: 140 }} value={period}>
                  <option value="weekly">This Week</option>
                  <option value="monthly">This Month</option>
                </select>
                <input className="form-control form-control-sm" onChange={(event) => setDate(event.target.value)} style={{ width: 170 }} type="date" value={date} />
                <BranchHierarchyFilter
                  branches={branches}
                  disabled={Boolean(branchId) || isHomecellLeader}
                  onChange={setBranchFilter}
                  value={branchFilter}
                />
                <select
                  className="form-select form-select-sm"
                  disabled={Boolean(activeHomecellId)}
                  onChange={(event) => setHomecellFilter(event.target.value)}
                  style={{ width: 220 }}
                  value={homecellFilter}
                >
                  <option value="">All Homecells</option>
                  {filteredHomecells.map((homecell) => (
                    <option key={homecell.id} value={homecell.id}>
                      {homecell.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Homecell</th>
                      <th>Branch</th>
                      <th>Breakdown</th>
                      <th>Total</th>
                      <th>Guests</th>
                      <th>Offering</th>
                      <th>Recorded By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length === 0 ? (
                      <tr>
                        <td className="text-center text-muted py-4" colSpan={9}>No homecell attendance records found for the current filters.</td>
                      </tr>
                    ) : records.map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.meeting_date)}</td>
                        <td>
                          <strong>{record.homecell?.name || "--"}</strong>
                          <div className="small text-secondary">{record.homecell?.code || "--"}</div>
                        </td>
                        <td>{record.branch?.name || <span className="text-muted">Unassigned</span>}</td>
                        <td className="small">
                          M: {record.male_count || 0}<br />
                          F: {record.female_count || 0}<br />
                          C: {record.children_count || 0}
                        </td>
                        <td><span className="badge text-light-primary">{record.total_count || 0}</span></td>
                        <td className="small">
                          FT: {record.first_timers_count || 0}<br />
                          NC: {record.new_converts_count || 0}
                        </td>
                        <td>{formatCurrency(record.offering_amount)}</td>
                        <td>{getResolvedRecorderName(record.recorded_by, churchUsers)}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-light-primary"
                            onClick={() => router.push(`/homecell-attendance?record_id=${record.id}&return_to=records`)}
                            type="button"
                          >
                            <i className="ti ti-edit me-1" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="alert alert-info mb-0">
            <i className="ti ti-info-circle me-2" />
            <strong>How it works:</strong> Filters here shape both the summary cards and the records table. Use <strong>Edit</strong> to return to the attendance page with the selected record preloaded.
          </div>
        </div>
      </div>
    </div>
  );
}

function getResolvedRecorderName(
  recorder: HomecellAttendanceRecord["recorded_by"],
  churchUsers: Array<{ id: number; name?: string | null }>,
) {
  if (!recorder) {
    return "System";
  }

  const directName = String(recorder.name || "").trim();

  if (directName && !looksLikeRoleLabel(directName)) {
    return directName;
  }

  return churchUsers.find((user) => user.id === recorder.id && user.name && !looksLikeRoleLabel(user.name))?.name || directName || "System";
}

function StatCard({
  borderClass,
  badgeClass,
  label,
  value,
  valueClass,
  children,
}: {
  borderClass: string;
  badgeClass: string;
  label: string;
  value: number | string;
  valueClass: string;
  children: string;
}) {
  return (
    <div className="col-md-3">
      <div className={`card overview-details-box ${borderClass}`}>
        <div className="card-body">
          <p className="text-dark f-w-600 mb-1">{label}</p>
          <h3 className={`${valueClass} mb-0`}>{value}</h3>
          <span className={`badge ${badgeClass} mt-2`}>{children}</span>
        </div>
      </div>
    </div>
  );
}

interface WsfWorkbookArgs {
  branchMap: Map<number, BranchRecord>;
  churchName: string;
  period: "weekly" | "monthly";
  records: HomecellAttendanceRecord[];
  reportDate: string;
}

interface WsfCell {
  value?: number | string;
  styleId?: string;
  mergeAcross?: number;
}

function buildWsfWorkbookXml({
  branchMap,
  churchName,
  period,
  records,
  reportDate,
}: WsfWorkbookArgs) {
  const summaryRows = buildWsfSummaryRows({ branchMap, churchName, records, reportDate });
  const weeklyRows = buildWsfWeeklyRows({ branchMap, churchName, period, records, reportDate });

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    buildWsfStylesXml(),
    buildWorksheetXml("DISTRICTS' SUMMARY REPORT", summaryRows, 13),
    buildWorksheetXml("DISTRICTS'WEEKLY REPORT", weeklyRows, 17),
    "</Workbook>",
  ].join("");
}

function buildWsfSummaryRows({
  branchMap,
  churchName,
  records,
  reportDate,
}: Omit<WsfWorkbookArgs, "period">) {
  const monthYear = getReportMonthYear(records, reportDate);
  const weekText = getReportWeekText(records, reportDate);
  const summaryMap = new Map<string, {
    district: string;
    zone: string;
    male: number;
    female: number;
    children: number;
    total: number;
    firstTimers: number;
    newConverts: number;
  }>();
  const districtTotals = new Map<string, number>();

  for (const record of records) {
    const { district, zone } = resolveWsfBranchLabels(branchMap, record);
    const key = `${district}::${zone}`;
    const existing = summaryMap.get(key) || {
      district,
      zone,
      male: 0,
      female: 0,
      children: 0,
      total: 0,
      firstTimers: 0,
      newConverts: 0,
    };

    existing.male += getCount(record.male_count);
    existing.female += getCount(record.female_count);
    existing.children += getCount(record.children_count);
    existing.total += getCount(record.total_count);
    existing.firstTimers += getCount(record.first_timers_count);
    existing.newConverts += getCount(record.new_converts_count);
    summaryMap.set(key, existing);
    districtTotals.set(district, (districtTotals.get(district) || 0) + getCount(record.total_count));
  }

  const rows: WsfCell[][] = [
    [{ value: `WINNERS SATELLITE FELLOWSHIP (WSF), ${churchName.toUpperCase()}`, styleId: "title", mergeAcross: 12 }],
    [{ value: `SUMMARY OF DISTRICTS' REPORT FOR ${monthYear}`, styleId: "subtitle", mergeAcross: 12 }],
    [createBlankCell()],
    [{ value: `${monthYear} REPORT FOR WEEK: ${weekText}`, styleId: "subtitle", mergeAcross: 12 }],
    [
      { value: "SN", styleId: "header" },
      { value: "DISTRICT NAME", styleId: "header" },
      { value: "ZONE NAME", styleId: "header" },
      { value: "M", styleId: "header" },
      { value: "F", styleId: "header" },
      { value: "C", styleId: "header" },
      { value: "Total", styleId: "header" },
      { value: "First Timers", styleId: "header" },
      { value: "New Converts", styleId: "header" },
      { value: "Total No of Adults", styleId: "header" },
      { value: "New Cell Opened", styleId: "header" },
      { value: "District Total", styleId: "header" },
      { value: "Total No of Cells", styleId: "header" },
    ],
  ];

  const summaryItems = Array.from(summaryMap.values()).sort((left, right) => {
    if (left.district === right.district) {
      return left.zone.localeCompare(right.zone);
    }

    return left.district.localeCompare(right.district);
  });

  let serialNumber = 1;
  let activeDistrict = "";

  for (const item of summaryItems) {
    const firstInDistrict = item.district !== activeDistrict;
    const adults = item.male + item.female;

    rows.push([
      { value: firstInDistrict ? serialNumber : "", styleId: "body" },
      { value: firstInDistrict ? item.district : "", styleId: "body" },
      { value: item.zone, styleId: "body" },
      { value: item.male, styleId: "number" },
      { value: item.female, styleId: "number" },
      { value: item.children, styleId: "number" },
      { value: item.total, styleId: "number" },
      { value: item.firstTimers, styleId: "number" },
      { value: item.newConverts, styleId: "number" },
      { value: adults, styleId: "number" },
      createBlankCell("body"),
      { value: firstInDistrict ? districtTotals.get(item.district) || 0 : "", styleId: "number" },
      createBlankCell("body"),
    ]);

    if (firstInDistrict) {
      serialNumber += 1;
      activeDistrict = item.district;
    }
  }

  return rows;
}

function buildWsfWeeklyRows({
  branchMap,
  churchName,
  period,
  records,
  reportDate,
}: WsfWorkbookArgs) {
  const monthYear = getReportMonthYear(records, reportDate);
  const weekText = getReportWeekText(records, reportDate);
  const weeklyMap = new Map<string, {
    district: string;
    total: number;
    firstTimers: number;
    newConverts: number;
    weeklyAttendance: [number, number, number, number, number];
    weeklyFirstTimers: [number, number, number, number, number];
  }>();

  for (const record of records) {
    const { district } = resolveWsfBranchLabels(branchMap, record);
    const weekIndex = Math.max(0, Math.min(4, getWeekOfMonth(record.meeting_date) - 1));
    const existing = weeklyMap.get(district) || {
      district,
      total: 0,
      firstTimers: 0,
      newConverts: 0,
      weeklyAttendance: [0, 0, 0, 0, 0],
      weeklyFirstTimers: [0, 0, 0, 0, 0],
    };

    existing.total += getCount(record.total_count);
    existing.firstTimers += getCount(record.first_timers_count);
    existing.newConverts += getCount(record.new_converts_count);
    existing.weeklyAttendance[weekIndex] += getCount(record.total_count);
    existing.weeklyFirstTimers[weekIndex] += getCount(record.first_timers_count);
    weeklyMap.set(district, existing);
  }

  const rows: WsfCell[][] = [
    [{ value: `WINNERS SATELLITE FELLOWSHIP (WSF), ${churchName.toUpperCase()}`, styleId: "title", mergeAcross: 16 }],
    [{ value: `DISTRICTS' WEEKLY REPORT FOR ${monthYear}`, styleId: "subtitle", mergeAcross: 16 }],
    [createBlankCell()],
    [{ value: `${monthYear} REPORT FOR WEEK: ${weekText}`, styleId: "subtitle", mergeAcross: 16 }],
    [
      { value: "SN", styleId: "header" },
      { value: "DISTRICT NAME", styleId: "header" },
      { value: "Total", styleId: "header" },
      { value: "First Timers", styleId: "header" },
      { value: "New Converts", styleId: "header" },
      { value: "New Cell Opened", styleId: "header" },
      { value: "District Total", styleId: "header" },
      { value: "1ST", styleId: "header" },
      { value: "2ND", styleId: "header" },
      { value: "3RD", styleId: "header" },
      { value: "4TH", styleId: "header" },
      { value: "5TH", styleId: "header" },
      { value: "FIRST TIMERS", styleId: "header", mergeAcross: 4 },
    ],
    [
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      createBlankCell("body"),
      { value: "1ST", styleId: "header" },
      { value: "2ND", styleId: "header" },
      { value: "3RD", styleId: "header" },
      { value: "4TH", styleId: "header" },
      { value: "5TH", styleId: "header" },
    ],
  ];

  const weeklyItems = Array.from(weeklyMap.values()).sort((left, right) => left.district.localeCompare(right.district));

  rows.push(
    ...weeklyItems.map((item, index) => [
      { value: index + 1, styleId: "body" },
      { value: item.district, styleId: "body" },
      { value: item.total, styleId: "number" },
      { value: item.firstTimers, styleId: "number" },
      { value: item.newConverts, styleId: "number" },
      createBlankCell("body"),
      { value: item.total, styleId: "number" },
      { value: item.weeklyAttendance[0], styleId: "number" },
      { value: item.weeklyAttendance[1], styleId: "number" },
      { value: item.weeklyAttendance[2], styleId: "number" },
      { value: item.weeklyAttendance[3], styleId: "number" },
      { value: item.weeklyAttendance[4], styleId: "number" },
      { value: item.weeklyFirstTimers[0], styleId: "number" },
      { value: item.weeklyFirstTimers[1], styleId: "number" },
      { value: item.weeklyFirstTimers[2], styleId: "number" },
      { value: item.weeklyFirstTimers[3], styleId: "number" },
      { value: item.weeklyFirstTimers[4], styleId: "number" },
    ]),
  );

  return rows;
}

function buildWsfStylesXml() {
  return [
    "<Styles>",
    '<Style ss:ID="Default" ss:Name="Normal">',
    '<Alignment ss:Vertical="Center" ss:WrapText="1"/>',
    '<Borders/>',
    '<Font ss:FontName="Calibri" ss:Size="11"/>',
    '<Interior/>',
    '<NumberFormat/>',
    '<Protection/>',
    "</Style>",
    '<Style ss:ID="title">',
    '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>',
    '<Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/>',
    "</Style>",
    '<Style ss:ID="subtitle">',
    '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>',
    '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>',
    "</Style>",
    '<Style ss:ID="header">',
    '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>',
    '<Borders>',
    '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>',
    "</Borders>",
    '<Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>',
    '<Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/>',
    "</Style>",
    '<Style ss:ID="body">',
    '<Alignment ss:Vertical="Center" ss:WrapText="1"/>',
    '<Borders>',
    '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>',
    "</Borders>",
    "</Style>",
    '<Style ss:ID="number">',
    '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>',
    '<Borders>',
    '<Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>',
    '<Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>',
    "</Borders>",
    "</Style>",
    "</Styles>",
  ].join("");
}

function buildWorksheetXml(name: string, rows: WsfCell[][], columnCount: number) {
  return [
    `<Worksheet ss:Name="${escapeXml(name)}">`,
    "<Table>",
    buildWorksheetColumns(columnCount),
    rows.map((row) => buildWorksheetRowXml(row)).join(""),
    "</Table>",
    '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">',
    "<ProtectObjects>False</ProtectObjects>",
    "<ProtectScenarios>False</ProtectScenarios>",
    "</WorksheetOptions>",
    "</Worksheet>",
  ].join("");
}

function buildWorksheetColumns(columnCount: number) {
  return new Array(columnCount)
    .fill(null)
    .map((_, index) => {
      const width = index === 0 ? 45 : index <= 2 ? 120 : 85;
      return `<Column ss:AutoFitWidth="0" ss:Width="${width}"/>`;
    })
    .join("");
}

function buildWorksheetRowXml(cells: WsfCell[]) {
  return `<Row>${cells.map((cell) => buildWorksheetCellXml(cell)).join("")}</Row>`;
}

function buildWorksheetCellXml(cell: WsfCell) {
  const attributes: string[] = [];

  if (cell.styleId) {
    attributes.push(` ss:StyleID="${cell.styleId}"`);
  }

  if (typeof cell.mergeAcross === "number" && cell.mergeAcross > 0) {
    attributes.push(` ss:MergeAcross="${cell.mergeAcross}"`);
  }

  if (cell.value === undefined || cell.value === "") {
    return `<Cell${attributes.join("")}/>`;
  }

  const type = typeof cell.value === "number" ? "Number" : "String";
  return `<Cell${attributes.join("")}><Data ss:Type="${type}">${escapeXml(String(cell.value))}</Data></Cell>`;
}

function createBlankCell(styleId = "body"): WsfCell {
  return { value: "", styleId };
}

function resolveWsfBranchLabels(branchMap: Map<number, BranchRecord>, record: HomecellAttendanceRecord) {
  const branchId = Number(record.branch?.id || 0);
  const fallbackName = String(record.branch?.name || "Main Church").trim() || "Main Church";
  const branch = branchId ? branchMap.get(branchId) || null : null;

  if (!branch) {
    return {
      district: fallbackName,
      zone: fallbackName,
    };
  }

  const lineage = getBranchLineage(branchMap, branch.id);

  if (lineage.length >= 2) {
    return {
      district: String(lineage[0]?.name || fallbackName).trim() || fallbackName,
      zone: String(lineage[1]?.name || lineage[lineage.length - 1]?.name || fallbackName).trim() || fallbackName,
    };
  }

  if (branch.current_parent?.type === "branch" && branch.current_parent.name) {
    return {
      district: String(branch.current_parent.name).trim() || fallbackName,
      zone: String(branch.name || fallbackName).trim() || fallbackName,
    };
  }

  return {
    district: String(branch.name || fallbackName).trim() || fallbackName,
    zone: String(branch.name || fallbackName).trim() || fallbackName,
  };
}

function getBranchLineage(branchMap: Map<number, BranchRecord>, branchId: number) {
  const lineage: BranchRecord[] = [];
  let currentBranch = branchMap.get(branchId) || null;

  while (currentBranch) {
    lineage.unshift(currentBranch);

    if (currentBranch.current_parent?.type !== "branch" || !currentBranch.current_parent.id) {
      break;
    }

    currentBranch = branchMap.get(currentBranch.current_parent.id) || null;
  }

  return lineage;
}

function getReportMonthYear(records: HomecellAttendanceRecord[], reportDate: string) {
  const baseDate = normalizeDateOnly(reportDate) || normalizeDateOnly(records[0]?.meeting_date) || getTodayDate();
  return new Date(`${baseDate}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }).toUpperCase();
}

function getReportWeekText(records: HomecellAttendanceRecord[], reportDate: string) {
  const weekNumbers = Array.from(new Set(
    records
      .map((record) => getWeekOfMonth(record.meeting_date))
      .filter((value) => value > 0),
  )).sort((left, right) => left - right);

  if (weekNumbers.length === 0) {
    weekNumbers.push(getWeekOfMonth(reportDate));
  }

  if (weekNumbers.length === 1) {
    return String(weekNumbers[0]);
  }

  if (weekNumbers.length === 2) {
    return `${weekNumbers[0]} & ${weekNumbers[1]}`;
  }

  return `${weekNumbers.slice(0, -1).join(", ")} & ${weekNumbers[weekNumbers.length - 1]}`;
}

function getWeekOfMonth(value?: string | null) {
  const normalized = normalizeDateOnly(value);
  const parts = normalized.split("-");
  const day = Number(parts[2] || 1);

  if (!day) {
    return 1;
  }

  return Math.min(5, Math.floor((day - 1) / 7) + 1);
}

function normalizeDateOnly(value?: string | null) {
  const directMatch = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return directMatch ? directMatch[1] : "";
}

function getCount(value?: number | null) {
  return Number(value || 0);
}

function formatFileLabel(value: string) {
  return value.replace(/[^0-9A-Za-z-]+/g, "-");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
