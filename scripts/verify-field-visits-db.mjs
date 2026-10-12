import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const requiredTables = [
  "field_visit_units",
  "field_visit_records",
  "field_visit_plans",
  "field_visit_plan_items",
];
const requiredIndexes = [
  "idx_field_visit_units_owner",
  "idx_field_visit_units_admin_block",
  "idx_field_visit_units_location",
  "idx_field_visit_records_unit_date",
  "idx_field_visit_records_recorded_by",
  "idx_field_visit_plans_owner_date",
  "idx_field_visit_plan_items_plan_order",
];
const requiredPolicies = [
  "Users can read their field visit units",
  "Users can manage their field visit units",
  "Users can read allowed field visit records",
  "Users can manage allowed field visit records",
  "Users can manage own field visit plans",
  "Users can manage allowed field visit plan items",
];

loadDotEnv();
verifyMigrationSql();
await verifyLiveSmoke();

function verifyMigrationSql() {
  const migrationsDir = path.join(root, "supabase", "migrations");
  const sql = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => fs.readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");

  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`public\\.${table}\\b`), `${table} migration SQL missing`);
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"), `${table} RLS missing`);
  }
  for (const index of requiredIndexes) {
    assert.match(sql, new RegExp(`create index if not exists ${index}\\b`, "i"), `${index} missing`);
  }
  for (const policy of requiredPolicies) {
    assert.match(sql, new RegExp(`create policy "${escapeRegExp(policy)}"`, "i"), `${policy} missing`);
  }
  assert.match(
    sql,
    /recorded_by = auth\.uid\(\)[\s\S]*u\.owner_id = auth\.uid\(\) or u\.owner_id is null/i,
    "record write policy must be scoped to owned/shared units",
  );
  assert.match(
    sql,
    /join public\.field_visit_units u on u\.id = unit_id[\s\S]*p\.owner_id = auth\.uid\(\)[\s\S]*u\.owner_id = auth\.uid\(\) or u\.owner_id is null/i,
    "plan item policy must be scoped to owned/shared units",
  );
  console.log("Local migration SQL audit passed.");
}

async function verifyLiveSmoke() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.log("Live DB smoke skipped: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.");
    return;
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      throw new Error(`Live DB smoke failed for ${table}: ${error.message}`);
    }
  }

  const { error: nestedUnitsError } = await supabase
    .from("field_visit_units")
    .select("*, field_visit_records(*)")
    .limit(1);
  if (nestedUnitsError) {
    throw new Error(`Live DB nested records check failed: ${nestedUnitsError.message}`);
  }

  const { error: nestedPlansError } = await supabase
    .from("field_visit_plans")
    .select("*, field_visit_plan_items(*)")
    .limit(1);
  if (nestedPlansError) {
    throw new Error(`Live DB nested plan items check failed: ${nestedPlansError.message}`);
  }

  console.log("Live DB smoke passed.");
}

function loadDotEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
