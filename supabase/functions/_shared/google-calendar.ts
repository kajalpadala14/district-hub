import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  scheduled_date?: string | null;
  end_time?: string | null;
  assignee_id: string | null;
  created_by: string;
  google_calendar_event_id: string | null;
  calendar_event_html_link?: string | null;
  calendar_sync_status?: string | null;
  calendar_last_synced_at?: string | null;
  calendar_sync_error?: string | null;
  calendar_sync_enabled?: boolean | null;
  calendar_retry_count: number;
  source_type?: "task" | "planner_event";
};

type ConnectionRow = {
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

const supabaseUrl = requiredEnv("SUPABASE_URL");
const anonKey = requiredEnv("SUPABASE_ANON_KEY");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");

export const serviceClient = createClient(supabaseUrl, serviceRoleKey);

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new HttpError("Missing Authorization header", 401);

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError("User session is invalid", 401);
  return data.user;
}

export async function assertTaskAccess(userId: string, task: TaskRow) {
  if (task.created_by === userId || task.assignee_id === userId) return;

  const { data } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"])
    .maybeSingle();

  if (!data) throw new HttpError("You do not have permission for this task", 403);
}

export async function loadTask(taskId: string) {
  const { data, error } = await serviceClient
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("Task not found", 404);
  return { ...(data as TaskRow), source_type: "task" as const };
}

export async function loadCalendarSource(sourceId: string) {
  const task = await serviceClient.from("tasks").select("*").eq("id", sourceId).maybeSingle();
  if (task.error) throw task.error;
  if (task.data) return { ...(task.data as TaskRow), source_type: "task" as const };

  const { data, error } = await serviceClient
    .from("planner_events")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("Calendar source not found", 404);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    due_date: data.date,
    scheduled_date: data.date,
    due_time: data.is_all_day ? null : data.start_time,
    end_time: data.is_all_day ? null : data.end_time,
    assignee_id: null,
    created_by: data.user_id,
    google_calendar_event_id: null,
    calendar_retry_count: 0,
    source_type: "planner_event" as const,
  } satisfies TaskRow;
}

function googleCalendarId() {
  return Deno.env.get("GOOGLE_CALENDAR_ID") || "primary";
}

export async function loadConnection(userId: string) {
  const { data, error } = await serviceClient
    .from("google_calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as ConnectionRow | null;
}

export async function refreshAccessToken(connection: ConnectionRow) {
  if (connection.expires_at && new Date(connection.expires_at).getTime() > Date.now() + 60_000) {
    return connection.access_token;
  }
  if (!connection.refresh_token)
    throw new HttpError("Google refresh token is missing. Reconnect Google Calendar.", 400);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json();
  if (!response.ok)
    throw new HttpError(payload.error_description ?? "Google token refresh failed", 400);

  const expiresAt = new Date(Date.now() + Number(payload.expires_in ?? 3600) * 1000).toISOString();
  await serviceClient
    .from("google_calendar_connections")
    .update({
      access_token: payload.access_token,
      expires_at: expiresAt,
      scope: payload.scope,
      token_type: payload.token_type ?? "Bearer",
    })
    .eq("user_id", connection.user_id);

  return payload.access_token as string;
}

export async function upsertCalendarEvent(task: TaskRow, ownerUserId: string, accessToken: string) {
  const event = buildEvent(task);
  const existing = await loadExistingCalendarEvent(task, ownerUserId);
  const eventId =
    existing?.google_calendar_event_id ??
    (ownerUserId === task.created_by ? task.google_calendar_event_id : null);
  const calendarId = googleCalendarId();
  const url = eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`
    : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`;

  console.info("[Planner Google Calendar Sync] Google API request", {
    sourceType: task.source_type ?? "task",
    sourceId: task.id,
    ownerUserId,
    calendarId,
    method: eventId ? "PUT" : "POST",
    eventId: eventId ?? null,
    start: event.start,
    end: event.end,
  });

  const response = await fetch(url, {
    method: eventId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  const payload = await response.json();
  console.info("[Planner Google Calendar Sync] Google API response", {
    sourceType: task.source_type ?? "task",
    sourceId: task.id,
    status: response.status,
    ok: response.ok,
    googleEventId: typeof payload.id === "string" ? payload.id : null,
    error: payload.error?.message ?? null,
  });
  if (!response.ok)
    throw new HttpError(
      payload.error?.message ?? "Google Calendar event sync failed",
      response.status,
    );

  return {
    id: payload.id as string,
    htmlLink: (payload.htmlLink as string | undefined) ?? null,
  };
}

export async function deleteCalendarEvent(eventId: string, accessToken: string) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const payload = await response.json().catch(() => ({}));
    throw new HttpError(
      payload.error?.message ?? "Google Calendar event delete failed",
      response.status,
    );
  }
}

export async function saveCalendarSuccess(
  task: TaskRow,
  userId: string,
  event: { id: string; htmlLink: string | null },
) {
  const now = new Date().toISOString();
  if (task.source_type === "planner_event") {
    const { error } = await serviceClient.from("calendar_events").upsert(
      {
        source_type: "planner_event",
        source_id: task.id,
        provider: "google",
        user_id: userId,
        external_event_id: event.id,
        external_event_url: event.htmlLink,
        sync_status: "synced",
        sync_error: null,
        retry_count: 0,
        last_synced_at: now,
      },
      { onConflict: "source_type,source_id,provider,user_id" },
    );
    if (error) throw error;
    return;
  }

  const { error: taskEventError } = await serviceClient.from("task_calendar_events").upsert({
    task_id: task.id,
    user_id: userId,
    google_calendar_event_id: event.id,
    calendar_event_html_link: event.htmlLink,
    calendar_sync_status: "synced",
    calendar_last_synced_at: now,
    calendar_sync_error: null,
    calendar_retry_count: 0,
  });
  if (taskEventError) throw taskEventError;

  if (userId === task.created_by || !task.google_calendar_event_id) {
    const { error: taskUpdateError } = await serviceClient
      .from("tasks")
      .update({
        google_calendar_event_id: event.id,
        calendar_event_html_link: event.htmlLink,
        calendar_sync_status: "synced",
        calendar_last_synced_at: now,
        calendar_sync_error: null,
        calendar_retry_count: 0,
      })
      .eq("id", task.id);
    if (taskUpdateError) throw taskUpdateError;
  }
}

export async function saveCalendarFailure(task: TaskRow, message: string) {
  if (task.source_type === "planner_event") {
    const { error } = await serviceClient.from("calendar_events").upsert(
      {
        source_type: "planner_event",
        source_id: task.id,
        provider: "google",
        user_id: task.created_by,
        sync_status: "failed",
        sync_error: message,
        retry_count: (task.calendar_retry_count ?? 0) + 1,
      },
      { onConflict: "source_type,source_id,provider,user_id" },
    );
    if (error) throw error;
    return;
  }

  const { error } = await serviceClient
    .from("tasks")
    .update({
      calendar_sync_status: "failed",
      calendar_sync_error: message,
      calendar_retry_count: (task.calendar_retry_count ?? 0) + 1,
    })
    .eq("id", task.id);
  if (error) throw error;
}

export async function logAudit(
  taskId: string | null,
  actorId: string,
  action: "calendar_synced" | "calendar_sync_failed" | "task_deleted",
  metadata: Record<string, unknown>,
) {
  const modernPayload = {
    task_id: taskId,
    action_type: action,
    old_value: null,
    new_value: metadata,
    performed_by: actorId,
  };
  const modern = await serviceClient.from("task_audit_logs").insert(modernPayload);
  if (!modern.error) return;

  const withoutTask = await serviceClient
    .from("task_audit_logs")
    .insert({ ...modernPayload, task_id: null });
  if (!withoutTask.error) return;

  console.warn(
    "[Task Audit] modern audit insert failed, trying legacy shape",
    modern.error,
    withoutTask.error,
  );
  const legacy = await serviceClient.from("task_audit_logs").insert({
    task_id: taskId,
    actor_id: actorId,
    action,
    metadata,
  });
  if (legacy.error) {
    console.warn("[Task Audit] legacy audit insert failed", legacy.error);
  }
}

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(`${name} is not configured`, 500);
  return value;
}

export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function buildEvent(task: TaskRow) {
  const date = task.due_date ?? task.scheduled_date ?? new Date().toISOString().slice(0, 10);
  const time = normalizeCalendarTime(task.due_time) ?? "17:00";
  const endTime = normalizeCalendarTime(task.end_time);
  const start = new Date(`${date}T${time}:00+05:30`);
  const end = endTime
    ? new Date(`${date}T${endTime}:00+05:30`)
    : new Date(start.getTime() + 30 * 60 * 1000);

  console.info("[Planner Booking Debug] final Google calendar event", {
    sourceType: task.source_type ?? "task",
    sourceId: task.id,
    selectedSlot: task.due_time,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    timeZone: "Asia/Kolkata",
  });

  return {
    summary: task.title,
    description: task.description ?? "",
    start: {
      dateTime: start.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "Asia/Kolkata",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },
        { method: "email", minutes: 24 * 60 },
      ],
    },
  };
}

function normalizeCalendarTime(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

async function loadExistingCalendarEvent(task: TaskRow, userId: string) {
  if (task.source_type === "planner_event") {
    const { data, error } = await serviceClient
      .from("calendar_events")
      .select("external_event_id")
      .eq("source_type", "planner_event")
      .eq("source_id", task.id)
      .eq("provider", "google")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.external_event_id
      ? { google_calendar_event_id: data.external_event_id as string }
      : null;
  }

  const { data, error } = await serviceClient
    .from("task_calendar_events")
    .select("google_calendar_event_id")
    .eq("task_id", task.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { google_calendar_event_id: string } | null;
}
