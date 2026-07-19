import { supabaseAdmin } from "../config/supabase.js";
import { ApiError, mapPriority, mapStatus } from "../utils/http.js";
import { disableSourceCalendarEvents, queueSyncJob } from "./calendarService.js";

const taskSelect = `
  id, task_number, title, description, priority, status, due_date, due_time,
  backend_assigned_to, backend_allocated_by, department, agency, attachment_url,
  comments_count, created_by, created_at, updated_at, completed_at,
  calendar_sync_enabled, calendar_sync_status, google_calendar_event_id,
  calendar_event_html_link, calendar_last_synced_at, calendar_sync_error
`;

export async function markOverdueTasks() {
  const today = new Date().toISOString().slice(0, 10);
  await supabaseAdmin
    .from("tasks")
    .update({ status: "blocked" })
    .lt("due_date", today)
    .neq("status", "done")
    .neq("status", "blocked");
}

export function canSeeTask(user, task) {
  return user.role === "admin" || user.role === "manager" || task.backend_assigned_to === user.id;
}

export function normalizeTaskPayload(payload, user) {
  return {
    title: payload.title,
    description: payload.description ?? null,
    priority: payload.priority ? mapPriority(payload.priority) : undefined,
    status: payload.status ? mapStatus(payload.status) : undefined,
    due_date: payload.due_date ?? null,
    due_time: payload.due_time ?? null,
    backend_assigned_to: payload.assigned_to ?? payload.backend_assigned_to ?? null,
    backend_allocated_by: user.id,
    department: payload.department ?? null,
    agency: payload.agency ?? null,
    attachment_url: payload.attachment_url ?? null,
    calendar_sync_enabled: payload.calendar_sync_enabled ?? false,
  };
}

export async function listTasks(user, query) {
  await markOverdueTasks();

  let request = supabaseAdmin.from("tasks").select(taskSelect).order("created_at", { ascending: false });

  if (user.role === "employee") request = request.eq("backend_assigned_to", user.id);
  if (query.status) request = request.eq("status", mapStatus(query.status));
  if (query.department) request = request.eq("department", query.department);
  if (query.agency) request = request.eq("agency", query.agency);
  if (query.priority) request = request.eq("priority", mapPriority(query.priority));
  if (query.assigned_to) request = request.eq("backend_assigned_to", query.assigned_to);
  if (query.search) {
    const value = `%${query.search}%`;
    request = request.or(`task_number.ilike.${value},title.ilike.${value},description.ilike.${value}`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function getTaskOrThrow(user, id) {
  const { data, error } = await supabaseAdmin.from("tasks").select(taskSelect).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "Task not found");
  if (!canSeeTask(user, data)) throw new ApiError(403, "You cannot access this task");
  return data;
}

export async function createTask(user, payload) {
  const body = normalizeTaskPayload(payload, user);
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      ...body,
      created_by: user.id,
    })
    .select(taskSelect)
    .single();
  if (error) throw error;
  await createAssignmentNotification(data);
  if (data.calendar_sync_enabled) {
    await queueCalendarJobSafe(user.id, data.id, "create");
  }
  return data;
}

export async function updateTask(user, id, payload) {
  const existing = await getTaskOrThrow(user, id);
  if (user.role === "employee") throw new ApiError(403, "Users can update task status only");

  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update(normalizeTaskPayload({ ...existing, ...payload }, user))
    .eq("id", id)
    .select(taskSelect)
    .single();
  if (error) throw error;
  await createAssignmentNotification(data);
  if (data.calendar_sync_enabled) {
    await queueCalendarJobSafe(user.id, data.id, "update");
  }
  return data;
}

export async function deleteTask(user, id) {
  const task = await getTaskOrThrow(user, id);
  if (user.role !== "admin") throw new ApiError(403, "Only admins can delete tasks");
  if (task.calendar_sync_enabled) {
    await queueCalendarJobSafe(user.id, id, "delete");
    await disableSourceCalendarEvents({ sourceType: "task", sourceId: id });
  }
  const { error } = await supabaseAdmin.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

export async function updateTaskStatus(user, id, status) {
  const task = await getTaskOrThrow(user, id);
  if (user.role === "employee" && task.backend_assigned_to !== user.id) {
    throw new ApiError(403, "Users can only update assigned task status");
  }
  const mapped = mapStatus(status);
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .update({
      status: mapped,
      completed_at: mapped === "done" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select(taskSelect)
    .single();
  if (error) throw error;
  return data;
}

export async function addComment(user, id, comment) {
  await getTaskOrThrow(user, id);
  const { data, error } = await supabaseAdmin
    .from("task_comments")
    .insert({ task_id: id, user_id: user.id, comment })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function addAttachment(user, id, attachment) {
  await getTaskOrThrow(user, id);
  const { data, error } = await supabaseAdmin
    .from("task_attachments")
    .insert({ task_id: id, user_id: user.id, ...attachment })
    .select("*")
    .single();
  if (error) throw error;

  await supabaseAdmin.from("tasks").update({ attachment_url: attachment.file_url }).eq("id", id);
  return data;
}

export async function bulkEdit(user, taskIds, updates) {
  if (user.role === "employee") throw new ApiError(403, "Users cannot bulk edit tasks");
  const body = normalizeTaskPayload(updates, user);
  const { data, error } = await supabaseAdmin.from("tasks").update(body).in("id", taskIds).select(taskSelect);
  if (error) throw error;
  return data ?? [];
}

export async function createAssignmentNotification(task) {
  if (!task.backend_assigned_to) return;
  await supabaseAdmin.from("task_notifications").insert({
    task_id: task.id,
    user_id: task.backend_assigned_to,
    title: "Task assigned",
    message: `${task.task_number ?? "Task"}: ${task.title}`,
  });
}

async function queueCalendarJobSafe(userId, taskId, action) {
  try {
    await queueSyncJob({ userId, sourceType: "task", sourceId: taskId, provider: "google", action });
  } catch (error) {
    console.warn("[Calendar] Failed to queue sync job", error);
  }
}

export function toCsv(tasks) {
  const headers = ["task_number", "title", "status", "priority", "due_date", "due_time", "department", "agency", "created_at"];
  const rows = tasks.map((task) =>
    headers
      .map((header) => `"${String(task[header] ?? "").replaceAll('"', '""')}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}
