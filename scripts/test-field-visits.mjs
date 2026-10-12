import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeFieldVisitCsv,
  coverageMetrics,
  normalizeCoverageUnit,
  parseFieldVisitCsv,
  sortByAttention,
} from "../src/lib/fieldVisits.ts";

const today = new Date("2026-08-20T00:00:00.000Z");

test("Field visit CSV parser accepts aliases, quoted cells, BOM, and removes duplicates", () => {
  const rows = parseFieldVisitCsv(
    [
      "\uFEFFdistrict,block,gp,latitude,longitude,legacy_visited,priority",
      'Dhamtari,Kurud,"A, quoted GP",20.1234567,81.7654321,yes,99',
      'Dhamtari,Kurud,"A, quoted GP",20.1234567,81.7654321,yes,99',
      "Dhamtari,Nagri,Plain GP,not-a-number,,false,120",
      "Dhamtari,Nagri,,20,81,false,25",
    ].join("\r\n"),
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    administrative_unit: "Dhamtari",
    block_name: "Kurud",
    gp_name: "A, quoted GP",
    latitude: 20.1234567,
    longitude: 81.7654321,
    is_legacy: true,
    priority_score: 99,
  });
  assert.equal(rows[1].latitude, null);
  assert.equal(rows[1].longitude, null);
  assert.equal(rows[1].priority_score, 100);
});

test("Field visit CSV analysis reports skipped rows and warnings for preview", () => {
  const analysis = analyzeFieldVisitCsv(
    [
      "district,block,gp,latitude,longitude,priority",
      "Dhamtari,Kurud,Valid GP,20,81,75",
      "Dhamtari,Kurud,Valid GP,20,81,75",
      "Dhamtari,Nagri,,20,81,50",
      "Dhamtari,Nagri,Bad Numbers,nope,also-nope,nope",
    ].join("\n"),
  );

  assert.equal(analysis.totalRows, 4);
  assert.equal(analysis.rows.length, 2);
  assert.equal(analysis.duplicateRows, 1);
  assert.equal(analysis.issues.filter((issue) => issue.severity === "error").length, 1);
  assert.equal(analysis.issues.filter((issue) => issue.severity === "warning").length, 4);
});

test("Coverage metrics follow visited, legacy, pending, and readiness rules", () => {
  const units = [
    unit({ id: "visited", records: [record("visited", "2026-08-10")] }),
    unit({ id: "legacy", is_legacy: true }),
    unit({ id: "pending" }),
    unit({ id: "old", priority_score: 20, records: [record("visited", "2026-04-01")] }),
  ].map((row) => normalizeCoverageUnit(row, today));

  const metrics = coverageMetrics(units);

  assert.equal(metrics.total, 4);
  assert.equal(metrics.visited, 2);
  assert.equal(metrics.legacy, 1);
  assert.equal(metrics.neverVisited, 1);
  assert.equal(metrics.pending90, 2);
  assert.equal(metrics.coverage, 75);
  assert.equal(metrics.readiness, 75);
  assert.equal(metrics.recentVisits, 1);
});

test("Attention sorting uses score first, then longest pending duration", () => {
  const units = [
    unit({ id: "routine", priority_score: 20, records: [record("visited", "2026-08-01")] }),
    unit({ id: "never", priority_score: 50 }),
    unit({ id: "high", priority_score: 90, records: [record("visited", "2026-08-01")] }),
  ].map((row) => normalizeCoverageUnit(row, today));

  assert.deepEqual(
    [...units].sort(sortByAttention).map((row) => row.id),
    ["high", "never", "routine"],
  );
});

function unit(overrides = {}) {
  return {
    id: overrides.id ?? "unit",
    owner_id: "owner",
    administrative_unit: "Dhamtari",
    block_name: "Kurud",
    gp_name: overrides.id ?? "GP",
    latitude: null,
    longitude: null,
    is_legacy: overrides.is_legacy ?? false,
    priority_score: overrides.priority_score ?? 50,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    field_visit_records: overrides.records ?? [],
  };
}

function record(status, visited_on) {
  return {
    id: `${status}-${visited_on}`,
    unit_id: "unit",
    visited_on,
    status,
    notes: null,
    recorded_by: "owner",
    created_at: `${visited_on}T00:00:00.000Z`,
  };
}
