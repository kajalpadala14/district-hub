import { differenceInCalendarDays, parseISO } from "date-fns";

export type FieldVisitUnit = {
  id: string;
  owner_id: string | null;
  administrative_unit: string;
  block_name: string;
  gp_name: string;
  latitude: number | null;
  longitude: number | null;
  is_legacy: boolean;
  priority_score: number;
  created_at: string;
  updated_at: string;
};

export type FieldVisitRecord = {
  id: string;
  unit_id: string;
  visited_on: string;
  status: "visited" | "legacy";
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
};

export type FieldVisitPlan = {
  id: string;
  owner_id: string | null;
  title: string;
  plan_date: string;
  notes: string | null;
  status: "draft" | "scheduled" | "sent" | "completed";
  created_at: string;
  updated_at: string;
};

export type FieldVisitUnitWithRecords = FieldVisitUnit & {
  field_visit_records?: FieldVisitRecord[];
};

export type VisitStatus = "visited" | "pending" | "legacy";

export type CoverageUnit = FieldVisitUnit & {
  lastVisit: FieldVisitRecord | null;
  status: VisitStatus;
  daysPending: number | null;
};

export type ParsedFieldVisitCsvRow = {
  administrative_unit: string;
  block_name: string;
  gp_name: string;
  latitude: number | null;
  longitude: number | null;
  is_legacy: boolean;
  priority_score: number;
};

export type FieldVisitCsvIssue = {
  row: number;
  severity: "error" | "warning";
  message: string;
};

export type FieldVisitCsvAnalysis = {
  rows: ParsedFieldVisitCsvRow[];
  issues: FieldVisitCsvIssue[];
  totalRows: number;
  duplicateRows: number;
};

export function normalizeCoverageUnit(
  unit: FieldVisitUnitWithRecords,
  today = new Date(),
): CoverageUnit {
  const records = [...(unit.field_visit_records ?? [])].sort((a, b) =>
    b.visited_on.localeCompare(a.visited_on),
  );
  const lastVisit = records[0] ?? null;
  const status: VisitStatus =
    unit.is_legacy || lastVisit?.status === "legacy" ? "legacy" : lastVisit ? "visited" : "pending";
  const daysPending = lastVisit
    ? Math.max(0, differenceInCalendarDays(today, parseISO(lastVisit.visited_on)))
    : null;

  return {
    ...unit,
    latitude: unit.latitude === null ? null : Number(unit.latitude),
    longitude: unit.longitude === null ? null : Number(unit.longitude),
    priority_score: Number(unit.priority_score ?? 50),
    lastVisit,
    status,
    daysPending,
  };
}

export function coverageMetrics(units: CoverageUnit[]) {
  const total = units.length;
  const visited = units.filter((unit) => unit.status === "visited").length;
  const legacy = units.filter((unit) => unit.status === "legacy").length;
  const neverVisited = units.filter((unit) => !unit.lastVisit && unit.status !== "legacy").length;
  const pending90 = units.filter(
    (unit) => unit.status === "pending" || (unit.daysPending ?? 0) >= 90,
  ).length;
  const actionNeeded = units.filter((unit) => needsAttention(unit)).length;
  const coverage = total ? Math.round(((visited + legacy) / total) * 100) : 0;
  const readiness = total ? Math.round(((visited + Math.round(legacy * 0.5)) / total) * 100) : 0;
  const recentVisits = units.filter(
    (unit) => unit.daysPending !== null && unit.daysPending <= 30,
  ).length;

  return {
    total,
    visited,
    legacy,
    neverVisited,
    pending90,
    actionNeeded,
    coverage,
    readiness,
    recentVisits,
  };
}

export function needsAttention(unit: CoverageUnit) {
  return (
    unit.status === "pending" ||
    !unit.lastVisit ||
    (unit.daysPending ?? 0) >= 90 ||
    unit.priority_score >= 75
  );
}

export function priorityLabel(unit: CoverageUnit) {
  if (!unit.lastVisit) return "Never visited";
  if ((unit.daysPending ?? 0) >= 90) return "90+ days pending";
  if (unit.priority_score >= 75) return "High priority";
  return "Follow-up";
}

export function sortByAttention(a: CoverageUnit, b: CoverageUnit) {
  const priorityDelta = attentionScore(b) - attentionScore(a);
  if (priorityDelta !== 0) return priorityDelta;
  return (b.daysPending ?? 9999) - (a.daysPending ?? 9999);
}

export function attentionScore(unit: CoverageUnit) {
  let score = unit.priority_score;
  if (!unit.lastVisit) score += 35;
  if ((unit.daysPending ?? 0) >= 90) score += 25;
  if (unit.status === "legacy") score -= 20;
  return score;
}

export function parseFieldVisitCsv(text: string): ParsedFieldVisitCsvRow[] {
  return analyzeFieldVisitCsv(text).rows;
}

export function analyzeFieldVisitCsv(text: string): FieldVisitCsvAnalysis {
  const [headerLine, ...rows] = parseCsvRows(text).filter((row) =>
    row.some((cell) => cell.trim()),
  );
  if (!headerLine) {
    return {
      rows: [],
      issues: [{ row: 1, severity: "error", message: "CSV file is empty." }],
      totalRows: 0,
      duplicateRows: 0,
    };
  }

  const headers = headerLine.map((header) => normalizeHeader(header));
  const issues: FieldVisitCsvIssue[] = [];
  const parsedRows: ParsedFieldVisitCsvRow[] = [];
  const seen = new Set<string>();
  let duplicateRows = 0;

  for (const [index, cells] of rows.entries()) {
    const rowNumber = index + 2;
    const value = (name: string) => cells[headers.indexOf(name)]?.trim() ?? "";
    const gpName = value("gp_name") || value("gp") || value("gram_panchayat");

    if (!gpName) {
      issues.push({
        row: rowNumber,
        severity: "error",
        message: "GP name is missing. Row skipped.",
      });
      continue;
    }

    const rawLatitude = value("latitude");
    const rawLongitude = value("longitude");
    const rawPriority = value("priority_score") || value("priority");
    const latitude = parseOptionalNumber(rawLatitude);
    const longitude = parseOptionalNumber(rawLongitude);
    const priority = Number(rawPriority || 50);

    if (rawLatitude && latitude === null) {
      issues.push({
        row: rowNumber,
        severity: "warning",
        message: "Latitude is invalid. It will be imported as blank.",
      });
    }
    if (rawLongitude && longitude === null) {
      issues.push({
        row: rowNumber,
        severity: "warning",
        message: "Longitude is invalid. It will be imported as blank.",
      });
    }
    if (rawPriority && !Number.isFinite(priority)) {
      issues.push({
        row: rowNumber,
        severity: "warning",
        message: "Priority score is invalid. It will be imported as 50.",
      });
    }

    const parsedRow = {
      administrative_unit: value("administrative_unit") || value("district") || "District",
      block_name: value("block_name") || value("block") || "Unassigned Block",
      gp_name: gpName,
      latitude,
      longitude,
      is_legacy: /^(true|yes|1|legacy)$/i.test(value("legacy_visited") || value("is_legacy")),
      priority_score: clampPriority(priority),
    };

    const key = [
      normalizeKey(parsedRow.administrative_unit),
      normalizeKey(parsedRow.block_name),
      normalizeKey(parsedRow.gp_name),
    ].join("|");
    if (seen.has(key)) {
      duplicateRows += 1;
      issues.push({
        row: rowNumber,
        severity: "warning",
        message: "Duplicate administrative unit/block/GP. Duplicate row skipped.",
      });
      continue;
    }
    seen.add(key);
    parsedRows.push(parsedRow);
  }

  return { rows: parsedRows, issues, totalRows: rows.length, duplicateRows };
}

export function coverageCsvTemplate() {
  return [
    "administrative_unit,block_name,gp_name,latitude,longitude,legacy_visited,priority_score",
    "Dantewada,Block Name,Gram Panchayat Name,18.9000000,81.3500000,false,75",
  ].join("\n");
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/\s+/g, "_");
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseCsvRows(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && next === "\n") index += 1;
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function clampPriority(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}
