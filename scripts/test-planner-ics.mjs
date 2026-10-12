import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const serverSource = await readFile(new URL("../src/server.ts", import.meta.url), "utf8");
const plannerSource = await readFile(
  new URL("../src/routes/_authenticated/planner.tsx", import.meta.url),
  "utf8",
);
const migrationSource = await readFile(
  new URL("../supabase/migrations/20260721130000_stabilize_planner_ics_subscription.sql", import.meta.url),
  "utf8",
);

test("Planner ICS export resolves settings and planner events on every request", () => {
  assert.match(serverSource, /async function handlePlannerIcsExport\(request: Request, url: URL\)/);
  assert.match(serverSource, /const settings = await resolvePlannerSettingsByToken\(token, "user_id"\)/);
  assert.match(serverSource, /const plannerTasks = await fetchPlannerTasksForCalendar\(settings\.user_id\)/);
  assert.match(serverSource, /\.from\("planner_events"\)\s+\.select\(selectColumns\)/);
});

test("Planner ICS export emits update detection headers without cached planner data", () => {
  assert.match(serverSource, /function plannerIcsFeedMeta\(tasks: PlannerIcsTask\[\]\)/);
  assert.match(serverSource, /etag: `"planner-events-\$\{tasks\.length\}-\$\{hashText\(updatedSignature\)\}"`/);
  assert.match(serverSource, /"last-modified": meta\.lastModified/);
  assert.match(serverSource, /"cache-control": "no-store, no-cache, max-age=0, must-revalidate"/);
  assert.match(serverSource, /pragma: "no-cache"/);
  assert.match(serverSource, /expires: "0"/);
  assert.match(serverSource, /function plannerIcsNotModified\(request: Request, meta: PlannerFeedMeta\)/);
  assert.match(serverSource, /status: 304/);
  assert.doesNotMatch(serverSource, /"content-disposition": 'attachment; filename="planner\.ics"'/);
});

test("Planner ICS export returns a valid calendar even when no events exist", () => {
  assert.doesNotMatch(serverSource, /if \(!plannerTasks\.length\)\s*\{/);
  assert.match(serverSource, /const ics = buildPlannerIcsContent\(plannerTasks\)/);
  assert.match(serverSource, /const headers = plannerIcsHeaders\(feedMeta\)/);
  assert.match(serverSource, /status: 200,\s+headers,/);
});

test("Planner ICS events include Google and Apple compatible metadata", () => {
  assert.match(serverSource, /"BEGIN:VCALENDAR"/);
  assert.match(serverSource, /"VERSION:2\.0"/);
  assert.match(serverSource, /"PRODID:-\/\/Review Dashboard\/\/Planner\/\/EN"/);
  assert.match(serverSource, /"REFRESH-INTERVAL;VALUE=DURATION:PT15M"/);
  assert.match(serverSource, /"X-PUBLISHED-TTL:PT15M"/);
  assert.match(serverSource, /`UID:\$\{escapeIcs\(task\.id\)\}@review-dashboard-planner`/);
  assert.match(serverSource, /`SEQUENCE:\$\{Math\.max\(0, Number\(task\.sequence\) \|\| 0\)\}`/);
  assert.match(serverSource, /`DTSTAMP:\$\{toIcsDateTime\(new Date\(updated\)\)\}`/);
  assert.match(serverSource, /`LAST-MODIFIED:\$\{toIcsDateTime\(new Date\(updated\)\)\}`/);
});

test("Planner token lifecycle is atomic and synchronized in the database", () => {
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.rotate_planner_subscription_token\(p_user_id uuid\)/);
  assert.match(migrationSource, /FOR UPDATE/);
  assert.match(migrationSource, /v_existing_settings_found := FOUND/);
  assert.match(migrationSource, /SET subscription_token = v_token,\s+ics_token = v_token,\s+updated_at = now\(\)/);
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.sync_planner_settings_calendar_columns\(\)/);
  assert.match(migrationSource, /NEW\.subscription_token := NEW\.ics_token/);
});

test("Planner event create and update keep the existing subscription URL stable", () => {
  assert.match(plannerSource, /const icsHttpsUrl = useMemo\(\s*\(\) => buildPlannerIcsUrl\(plannerSettings\.token, "https"\)/);
  assert.match(plannerSource, /const icsWebcalUrl = useMemo\(\s*\(\) => buildPlannerIcsUrl\(plannerSettings\.token, "webcal"\)/);
  assert.match(plannerSource, /async function savePlannerTask\(/);
  assert.match(plannerSource, /fetch\("\/api\/planner\/tasks"/);
  const savePlannerTaskBody = plannerSource.slice(
    plannerSource.indexOf("async function savePlannerTask("),
    plannerSource.indexOf("async function savePlannerEventFallback("),
  );
  assert.doesNotMatch(savePlannerTaskBody, /createPlannerToken|rotate_planner_subscription_token|rotatePlannerToken/i);
});

test("Planner event sequence increments only when event content changes", () => {
  assert.match(migrationSource, /ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 0/);
  assert.match(migrationSource, /CREATE OR REPLACE FUNCTION public\.bump_planner_event_sequence\(\)/);
  assert.match(migrationSource, /to_jsonb\(NEW\) - 'updated_at' - 'sequence' - 'created_at'/);
  assert.match(migrationSource, /NEW\.sequence := COALESCE\(OLD\.sequence, 0\) \+ 1/);
  assert.match(migrationSource, /CREATE TRIGGER trg_planner_events_sequence/);
});
