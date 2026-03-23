import { getTodayDate } from "@/lib/homecell-utils";
import type { BranchRecord, HomecellAttendanceRecord } from "@/types/api";

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

export function buildWsfWorkbookXml({
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

export function formatFileLabel(value: string) {
  return value.replace(/[^0-9A-Za-z-]+/g, "-");
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

  void period;

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

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
