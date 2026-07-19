import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  due_time: string | null;
  assignee_id: string | null;
  created_by: string;
  google_calendar_event_id: string | null;
  calendar_retry_count: number;
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
  const { data, error } = await serviceClient.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError("Task not found", 404);
  return data as TaskRow;
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
  if (!connection.refresh_token) throw new HttpError("Google refresh token is missing. Reconnect Google Calendar.", 400);

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
  if (!response.ok) throw new HttpError(payload.error_description ?? "Google token refresh failed", 400);

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
  const existing = await loadTaskCalendarEvent(task.id, ownerUserId);
  const eventId = existing?.google_calendar_event_id ?? (ownerUserId === task.created_by ? task.google_calendar_event_id : null);
  const url = eventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all";

  const response = await fetch(url, {
    method: eventId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
  const payload = await response.json();
  if (!response.ok) throw new HttpError(payload.error?.message ?? "Google Calendar event sync failed", response.status);

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
    throw new HttpError(payload.error?.message ?? "Google Calendar event delete failed", response.status);
  }
}

export async function saveCalendarSuccess(task: TaskRow, userId: string, event: { id: string; htmlLink: string | null }) {
  const now = new Date().toISOString();
  await serviceClient.from("task_calendar_events").upsert({
    task_id: task.id,
    user_id: userId,
    google_calendar_event_id: event.id,
    calendar_event_html_link: event.htmlLink,
    calendar_sync_status: "synced",
    calendar_last_synced_at: now,
    calendar_sync_error: null,
    calendar_retry_count: 0,
  });

  if (userId === task.created_by || !task.google_calendar_event_id) {
    await serviceClient
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
  }
}

export async function saveCalendarFailure(task: TaskRow, message: string) {
  await serviceClient
    .from("tasks")
    .update({
      calendar_sync_status: "failed",
      calendar_sync_error: message,
      calendar_retry_count: (task.calendar_retry_count ?? 0) + 1,
    })
    .eq("id", task.id);
}

export async function logAudit(
  taskId: string | null,
  actorId: string,
  action: "calendar_synced" | "calendar_sync_failed" | "task_deleted",
  metadata: Record<string, unknown>,
) {
  await serviceClient.from("task_audit_logs").insert({
    task_id: taskId,
    actor_id: actorId,
    action,
    metadata,
  });
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
  const date = task.due_date ?? new Date().toISOString().slice(0, 10);
  const time = task.due_time ?? "17:00";
  const start = new Date(`${date}T${time}:00+05:30`);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

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

async function loadTaskCalendarEvent(taskId: string, userId: string) {
  const { data, error } = await serviceClient
    .from("task_calendar_events")
    .select("google_calendar_event_id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as { google_calendar_event_id: string } | null;
}
