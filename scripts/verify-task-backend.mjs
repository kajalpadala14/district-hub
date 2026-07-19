import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const checks = [
  {
    table: "profiles",
    select: "id,email,full_name,phone,department,job_title,created_at,updated_at",
  },
  {
    table: "departments",
    select: "id,name,created_at,updated_at",
  },
  {
    table: "tasks",
    select: [
      "id",
      "title",
      "description",
      "priority",
      "status",
      "due_date",
      "due_time",
      "scheduled_date",
      "assignee_id",
      "department",
      "completed_at",
      "calendar_sync_enabled",
      "calendar_sync_status",
      "google_calendar_event_id",
      "calendar_event_html_link",
      "calendar_last_synced_at",
      "calendar_sync_error",
      "calendar_retry_count",
      "created_by",
      "created_at",
      "updated_at",
    ].join(","),
  },
  { table: "task_comments", select: "id,task_id,comment,commented_by,created_at" },
  { table: "task_attachments", select: "id,task_id,file_name,file_url,uploaded_by,uploaded_at" },
  { table: "task_audit_logs", select: "id,task_id,action,actor_id,metadata,created_at" },
  { table: "user_roles", select: "user_id,role,created_at" },
];

let failed = false;
for (const check of checks) {
  const { error } = await supabase.from(check.table).select(check.select).limit(1);
  if (error) {
    failed = true;
    console.error(`${check.table}: FAILED - ${error.message}`);
  } else {
    console.log(`${check.table}: OK`);
  }
}

if (!failed) {
  failed = !(await runWriteSmokeTest());
}

if (failed) process.exit(1);
console.log("Task backend schema verification passed.");

async function runWriteSmokeTest() {
  const marker = `backend-smoke-${Date.now()}`;
  const cleanup = {
    taskId: null,
    profileId: crypto.randomUUID(),
    departmentName: `Backend Smoke ${Date.now()}`,
  };

  try {
    const { data: userList, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (usersError) throw usersError;
    const authUser = userList.users[0];
    if (!authUser) {
      console.warn("write smoke: SKIPPED - create at least one Supabase Auth user to test task inserts.");
      return true;
    }

    const departmentInsert = await supabase
      .from("departments")
      .insert({ name: cleanup.departmentName })
      .select("id,name")
      .single();
    if (departmentInsert.error) throw new Error(`departments write failed: ${departmentInsert.error.message}`);

    const profileInsert = await supabase
      .from("profiles")
      .insert({
        id: cleanup.profileId,
        email: `${marker}@local.employee`,
        full_name: "Backend Smoke Employee",
        phone: "9999999999",
        job_title: "Smoke Test",
        department: cleanup.departmentName,
      })
      .select("id")
      .single();
    if (profileInsert.error) throw new Error(`profiles write failed: ${profileInsert.error.message}`);

    const taskInsert = await supabase
      .from("tasks")
      .insert({
        title: "Backend Smoke Task",
        description: "Created and deleted by backend verification.",
        priority: "medium",
        status: "todo",
        due_date: new Date().toISOString().slice(0, 10),
        scheduled_date: new Date().toISOString().slice(0, 10),
        assignee_id: cleanup.profileId,
        department: cleanup.departmentName,
        created_by: authUser.id,
        calendar_sync_enabled: false,
      })
      .select("id")
      .single();
    if (taskInsert.error) throw new Error(`tasks write failed: ${taskInsert.error.message}`);
    cleanup.taskId = taskInsert.data.id;

    const auditInsert = await supabase
      .from("task_audit_logs")
      .insert({
        task_id: cleanup.taskId,
        actor_id: authUser.id,
        action: "task_created",
        metadata: { marker },
      })
      .select("id")
      .single();
    if (auditInsert.error) throw new Error(`task_audit_logs write failed: ${auditInsert.error.message}`);

    console.log("write smoke: OK");
    return true;
  } catch (error) {
    console.error(`write smoke: FAILED - ${error instanceof Error ? error.message : String(error)}`);
    return false;
  } finally {
    if (cleanup.taskId) await supabase.from("tasks").delete().eq("id", cleanup.taskId);
    await supabase.from("profiles").delete().eq("id", cleanup.profileId);
    await supabase.from("departments").delete().eq("name", cleanup.departmentName);
  }
}
