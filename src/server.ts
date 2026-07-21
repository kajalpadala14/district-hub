import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/planner/export.ics") {
        return await handlePlannerIcsExport(url);
      }
      if (url.pathname === "/api/planner/imported-events") {
        return await handlePlannerImportedEvents(url);
      }
      if (url.pathname === "/api/planner/tasks") {
        return await handlePlannerTaskSave(request);
      }
      if (url.pathname === "/api/tasks") {
        return await handleTaskSave(request);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};

async function handleTaskSave(request: Request) {
  if (!["POST", "PUT", "DELETE"].includes(request.method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const user = await authenticatedPlannerUser(request);
    const body = (await request.json()) as TaskSaveRequest;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (request.method === "DELETE") {
      if (!body.id) {
        return new Response("Task id required", {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const existing = await getTaskForUser(body.id, user.id, user.canManageAllTasks);
      if (!existing) {
        return new Response("Task not found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const { error } = await supabaseAdmin.from("tasks").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { status: 200 });
    }

    const payload = taskPayload(body);

    if (request.method === "PUT") {
      if (!body.id) {
        return new Response("Task id required", {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const existing = await getTaskForUser(body.id, user.id, user.canManageAllTasks);
      if (!existing) {
        return new Response("Task not found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("tasks")
        .update(payload)
        .eq("id", body.id)
        .select(legacyPlannerTaskSelect)
        .single();
      if (error) throw error;
      return Response.json({ task: data }, { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from("tasks")
      .insert({ ...payload, created_by: user.id })
      .select(legacyPlannerTaskSelect)
      .single();
    if (error) throw error;
    return Response.json({ task: data }, { status: 201 });
  } catch (error) {
    console.error("[Task Save] failed", error);
    return new Response(error instanceof Error ? error.message : "Task save failed", {
      status: error instanceof PlannerAuthError ? error.status : 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

async function handlePlannerIcsExport(url: URL) {
  try {
    const token = url.searchParams.get("token")?.trim();
    if (!token) {
      return new Response("Planner subscription token is required", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: settings, error: settingsError } = await supabaseAdmin
      .from("planner_settings")
      .select("user_id")
      .eq("subscription_token", token)
      .maybeSingle();

    if (!settings && !settingsError) {
      const fallback = await supabaseAdmin
        .from("planner_settings")
        .select("user_id")
        .eq("ics_token", token)
        .maybeSingle();
      settings = fallback.data;
      settingsError = isPlannerSettingsTokenAliasUnavailable(fallback.error)
        ? null
        : fallback.error;
    }

    if (settingsError) throw settingsError;
    if (!settings) {
      return new Response("Planner subscription token not found", {
        status: 401,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const plannerTasks = await fetchPlannerTasksForCalendar(settings.user_id);

    if (!plannerTasks.length) {
      const diagnostic = await explainEmptyPlannerCalendar(settings.user_id);
      return new Response(diagnostic, {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const ics = buildPlannerIcsContent(plannerTasks);

    return new Response(ics, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'attachment; filename="planner.ics"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Planner ICS Export] failed", error);
    return new Response("Planner calendar export failed", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

async function handlePlannerTaskSave(request: Request) {
  if (!["POST", "PUT", "DELETE"].includes(request.method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const user = await authenticatedPlannerUser(request);
    const body = (await request.json()) as PlannerTaskSaveRequest;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    console.info("[Planner Booking Debug] API received", {
      method: request.method,
      id: body.id ?? null,
      selectedSlot: body.due_time ?? null,
      scheduledDate: body.scheduled_date ?? body.due_date ?? null,
    });

    if (request.method === "DELETE") {
      if (!body.id || body.id.startsWith("ics-")) {
        return new Response("Planner event id required", {
          status: 400,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const existing = await getPlannerTaskForUser(body.id, user.id);
      if (!existing) {
        return new Response("Planner task not found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const { error } = await supabaseAdmin.from("planner_events").delete().eq("id", body.id);
      if (error) throw error;
      return Response.json({ ok: true }, { status: 200 });
    }

    const payload = plannerTaskPayload(body);
    console.info("[Planner Booking Debug] normalized database payload", {
      selectedSlot: body.due_time ?? null,
      databaseValue: payload.start_time,
      databaseEndValue: payload.end_time,
      date: payload.date,
    });

    const shouldUpdate = request.method === "PUT" && body.id && !body.id.startsWith("ics-");

    if (shouldUpdate) {
      const existing = await getPlannerTaskForUser(body.id!, user.id);
      if (!existing) {
        return new Response("Planner task not found", {
          status: 404,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }

      const { data, error } = await supabaseAdmin
        .from("planner_events")
        .update(payload)
        .eq("id", body.id)
        .select(plannerTaskSelect)
        .single();
      if (error) {
        throw error;
      }
      console.info("[Planner Booking Debug] database saved", {
        id: data.id,
        databaseValue: data.start_time,
        databaseEndValue: data.end_time,
      });
      return Response.json({ task: data }, { status: 200 });
    }

    const { data, error } = await supabaseAdmin
      .from("planner_events")
      .insert({ ...payload, user_id: user.id })
      .select(plannerTaskSelect)
      .single();
    if (error) {
      throw error;
    }
    console.info("[Planner Booking Debug] database saved", {
      id: data.id,
      databaseValue: data.start_time,
      databaseEndValue: data.end_time,
    });
    return Response.json({ task: data }, { status: 201 });
  } catch (error) {
    console.error("[Planner Task Save] failed", error);
    return new Response(error instanceof Error ? error.message : "Planner task save failed", {
      status: error instanceof PlannerAuthError ? error.status : 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

async function handlePlannerImportedEvents(url: URL) {
  try {
    const token = url.searchParams.get("token")?.trim();
    if (!token) {
      return new Response("Planner subscription token is required", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("planner_settings")
      .select("apple_ics_url")
      .eq("subscription_token", token)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) {
      return new Response("Planner subscription token not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const requestedIcsUrl = url.searchParams.get("icsUrl")?.trim();
    const events = await fetchImportedPlannerEvents(requestedIcsUrl || settings.apple_ics_url);
    return Response.json({ events }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[Planner Imported Events] failed", error);
    return new Response("Planner imported events fetch failed", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
}

type PlannerIcsTask = {
  id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  department?: string | null;
  scheduled_date: string | null;
  due_date: string | null;
  due_time: string | null;
  end_time?: string | null;
  is_all_day?: boolean | null;
  updated_at: string | null;
  created_at: string | null;
  status: string | null;
  [key: string]: string | boolean | null | undefined;
};

type PlannerTaskSaveRequest = {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  department?: string | null;
  scheduled_date?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  status?: string | null;
  priority?: string | null;
  calendar_sync_enabled?: boolean | null;
};

type TaskSaveRequest = PlannerTaskSaveRequest & {
  completed_at?: string | null;
};

type AuthenticatedPlannerUser = {
  id: string;
  canManageAllTasks: boolean;
};

class PlannerAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ImportedIcsEvent = {
  uid: string | null;
  summary: string | null;
  description: string | null;
  location: string | null;
  status: string | null;
  dtstart: string | null;
  dtend: string | null;
};

const plannerDateFields = [
  "scheduled_date",
  "due_date",
  "date",
  "meeting_date",
  "start_date",
  "event_date",
] as const;
const plannerTaskSelect =
  "id,title,description,location,date,start_time,end_time,is_all_day,updated_at,created_at,status,priority,color,user_id";
const legacyPlannerTaskSelect =
  "id,title,description,department,scheduled_date,due_date,due_time,updated_at,created_at,status,priority,calendar_sync_enabled,calendar_sync_status,google_calendar_event_id,calendar_event_html_link,calendar_last_synced_at,calendar_sync_error,calendar_retry_count,assignee_id,completed_at,created_by";

async function authenticatedPlannerUser(request: Request): Promise<AuthenticatedPlannerUser> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new PlannerAuthError("Sign in required to save planner task", 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    throw new PlannerAuthError(error?.message || "Invalid planner session", 401);
  }

  return {
    id: data.user.id,
    canManageAllTasks: await userCanViewAllTasks(data.user.id),
  };
}

function plannerTaskPayload(body: PlannerTaskSaveRequest) {
  const title = body.title?.trim();
  if (!title) throw new PlannerAuthError("Event title required", 400);

  const scheduledDate = normalizeDateKey(body.scheduled_date) ?? normalizeDateKey(body.due_date);
  if (!scheduledDate) throw new PlannerAuthError("Planner event date required", 400);

  return {
    title,
    description: body.description?.trim() || null,
    location: extractDescriptionField(body.description, "Venue") ?? body.department?.trim() ?? null,
    date: scheduledDate,
    start_time: normalizeTime(body.due_time) || null,
    end_time: addMinutesToTime(
      normalizeTime(body.due_time),
      extractDurationMinutes(body.description) ?? 30,
    ),
    is_all_day: !normalizeTime(body.due_time),
    status: normalizePlannerEventStatus(body.status, body.description),
    priority: normalizeTaskPriority(body.priority),
  };
}

function taskPayload(body: TaskSaveRequest) {
  const title = body.title?.trim();
  if (!title) throw new PlannerAuthError("Task description required", 400);
  const status = normalizeTaskStatus(body.status);

  return {
    title,
    description: body.description?.trim() || null,
    department: body.department?.trim() || null,
    scheduled_date: normalizeDateKey(body.scheduled_date),
    due_date: normalizeDateKey(body.due_date),
    due_time: normalizeTime(body.due_time) || null,
    assignee_id: body.assignee_id || null,
    status,
    priority: normalizeTaskPriority(body.priority),
    completed_at: status === "done" ? body.completed_at || new Date().toISOString() : null,
    calendar_sync_enabled: body.calendar_sync_enabled === true,
  };
}

async function getPlannerTaskForUser(taskId: string, userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const canManageAllTasks = await userCanViewAllTasks(userId);
  let query = supabaseAdmin
    .from("planner_events")
    .select("id,user_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!canManageAllTasks) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getTaskForUser(taskId: string, userId: string, canManageAllTasks: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("tasks")
    .select("id,created_by,assignee_id")
    .eq("id", taskId)
    .maybeSingle();

  if (!canManageAllTasks) {
    query = query.or(`created_by.eq.${userId},assignee_id.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function normalizeTaskStatus(value: string | null | undefined) {
  if (["todo", "in_progress", "blocked", "done"].includes(value ?? "")) return value;
  return "in_progress";
}

function normalizePlannerEventStatus(
  value: string | null | undefined,
  description: string | null | undefined,
) {
  const plannerStatus = extractDescriptionField(description, "Status")?.toLowerCase();
  if (value === "blocked" || plannerStatus === "cancelled") return "cancelled";
  if (value === "done") return "completed";
  if (value === "todo" || plannerStatus === "tentative") return "tentative";
  return "confirmed";
}

function normalizeTaskPriority(value: string | null | undefined) {
  if (["low", "medium", "high", "urgent"].includes(value ?? "")) return value;
  return "medium";
}

async function fetchPlannerTasksForCalendar(userId: string): Promise<PlannerIcsTask[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const canViewAllPlannerTasks = await userCanViewAllTasks(userId);
  const rows = await fetchPlannerTaskRows(userId, canViewAllPlannerTasks);
  return rows.filter((task) => getPlannerTaskDate(task)).sort(comparePlannerTasks);
}

async function fetchPlannerTaskRows(
  userId: string,
  canViewAllPlannerTasks: boolean,
): Promise<PlannerIcsTask[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin
    .from("planner_events")
    .select(plannerTaskSelect)
    .order("date", { ascending: true, nullsFirst: false })
    .order("start_time", { ascending: true, nullsFirst: false });

  if (!canViewAllPlannerTasks) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(plannerEventRowToIcsTask);
}

function isPlannerSettingsTokenAliasUnavailable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return /ics_token/i.test(message) || /schema cache/i.test(message);
}

function plannerEventRowToIcsTask(row: Record<string, string | boolean | null>): PlannerIcsTask {
  const date = typeof row.date === "string" ? row.date : null;
  const startTime = typeof row.start_time === "string" ? row.start_time : null;
  const endTime = typeof row.end_time === "string" ? row.end_time : null;
  const status = typeof row.status === "string" ? row.status : null;

  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : null,
    description: typeof row.description === "string" ? row.description : null,
    location: typeof row.location === "string" ? row.location : null,
    department: typeof row.location === "string" ? row.location : null,
    scheduled_date: date,
    due_date: date,
    due_time: startTime,
    end_time: endTime,
    is_all_day: row.is_all_day === true,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    status,
  };
}

async function fetchImportedPlannerEvents(
  icsUrl: string | null | undefined,
): Promise<PlannerIcsTask[]> {
  const feedUrl = normalizeExternalIcsUrl(icsUrl);
  if (!feedUrl) return [];

  const response = await fetch(feedUrl, {
    headers: {
      accept: "text/calendar,text/plain,*/*",
      "user-agent": "District Governance Planner ICS Import",
    },
  });

  if (!response.ok) {
    throw new Error(`Imported ICS fetch failed: ${response.status} ${response.statusText}`);
  }

  const ics = await response.text();
  return parseImportedIcsEvents(ics)
    .map(importedIcsEventToPlannerTask)
    .filter((task) => getPlannerTaskDate(task));
}

function normalizeExternalIcsUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const urlText = trimmed.replace(/^webcal:/i, "https:");

  try {
    const url = new URL(urlText);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseImportedIcsEvents(ics: string): ImportedIcsEvent[] {
  const lines = unfoldIcsLines(ics);
  const events: ImportedIcsEvent[] = [];
  let current: ImportedIcsEvent | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {
        uid: null,
        summary: null,
        description: null,
        location: null,
        status: null,
        dtstart: null,
        dtend: null,
      };
      continue;
    }

    if (line === "END:VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }

    if (!current) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) continue;

    const name = line.slice(0, separatorIndex).split(";")[0].toUpperCase();
    const value = unescapeIcs(line.slice(separatorIndex + 1));

    if (name === "UID") current.uid = value;
    if (name === "SUMMARY") current.summary = value;
    if (name === "DESCRIPTION") current.description = value;
    if (name === "LOCATION") current.location = value;
    if (name === "STATUS") current.status = value;
    if (name === "DTSTART") current.dtstart = value;
    if (name === "DTEND") current.dtend = value;
  }

  return events;
}

function unfoldIcsLines(ics: string) {
  const rawLines = ics.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    if (/^[ \t]/.test(rawLine) && lines.length) {
      lines[lines.length - 1] += rawLine.slice(1);
    } else {
      lines.push(rawLine.trimEnd());
    }
  }

  return lines;
}

function importedIcsEventToPlannerTask(event: ImportedIcsEvent): PlannerIcsTask {
  const start = parseIcsStart(event.dtstart);
  const status = event.status?.toUpperCase() === "CANCELLED" ? "blocked" : "in_progress";

  return {
    id: `ics-${hashText(event.uid || `${event.summary ?? "event"}-${event.dtstart ?? ""}`)}`,
    title: event.summary || "Imported calendar event",
    description: event.description,
    location: event.location,
    department: event.location,
    scheduled_date: start?.date ?? null,
    due_date: start?.date ?? null,
    due_time: start?.time ?? null,
    updated_at: null,
    created_at: null,
    status,
  };
}

function parseIcsStart(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const dateOnly = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    return { date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`, time: null };
  }

  const dateTime = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!dateTime) return null;

  if (dateTime[7]) {
    const date = new Date(
      Date.UTC(
        Number(dateTime[1]),
        Number(dateTime[2]) - 1,
        Number(dateTime[3]),
        Number(dateTime[4]),
        Number(dateTime[5]),
        Number(dateTime[6] ?? "0"),
      ),
    );
    const kolkata = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(date)
      .reduce<Record<string, string>>((parts, part) => {
        if (part.type !== "literal") parts[part.type] = part.value;
        return parts;
      }, {});

    return {
      date: `${kolkata.year}-${kolkata.month}-${kolkata.day}`,
      time: `${kolkata.hour}:${kolkata.minute}`,
    };
  }

  return {
    date: `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`,
    time: `${dateTime[4]}:${dateTime[5]}`,
  };
}

function unescapeIcs(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index);
  }
  return Math.abs(hash).toString(36);
}

async function userCanViewAllTasks(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "manager"]);
  if (error) throw error;
  return (data ?? []).length > 0;
}

async function explainEmptyPlannerCalendar(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const canViewAllPlannerTasks = await userCanViewAllTasks(userId);
  const rows = await fetchPlannerTaskRows(userId, canViewAllPlannerTasks);
  const datedCount = rows.filter((task) => getPlannerTaskDate(task)).length;
  const undatedRows = rows.filter((task) => !getPlannerTaskDate(task));
  let allDatedQuery = supabaseAdmin
    .from("planner_events")
    .select("id", { count: "exact", head: true })
    .not("date", "is", null);

  if (!canViewAllPlannerTasks) {
    allDatedQuery = allDatedQuery.eq("user_id", userId);
  }

  const { count: coreDatedCount, error: datedError } = await allDatedQuery;
  if (datedError) throw datedError;

  return [
    "No planner calendar events were exported.",
    "Reason: the subscription token is valid, but no planner_events rows in this planner scope have a usable date.",
    "Planner table: public.planner_events. Token table: public.planner_settings.",
    `Calendar scope: ${canViewAllPlannerTasks ? "admin/manager, all planner events" : "planner events owned by the token owner"}.`,
    `Planner events in scope: ${rows.length}.`,
    `Planner events with date in scope: ${coreDatedCount ?? 0}.`,
    `Planner events with usable planner date (${plannerDateFields.join(", ")}): ${datedCount}.`,
    ...formatUndatedPlannerRows(undatedRows),
  ].join("\n");
}

function buildPlannerIcsContent(tasks: PlannerIcsTask[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Review Dashboard//Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:District Governance Planner",
    "X-WR-TIMEZONE:Asia/Kolkata",
    ...buildKolkataTimezone(),
    ...tasks.flatMap((task) => buildPlannerIcsEvent(task)),
    "END:VCALENDAR",
  ];
  return `${lines.flatMap(foldIcsLine).join("\r\n")}\r\n`;
}

function buildPlannerIcsEvent(task: PlannerIcsTask) {
  const date = getPlannerTaskDate(task) ?? toDateKey(new Date());
  const time = normalizeTime(task.due_time);
  const durationMinutes = extractDurationMinutes(task.description) ?? 30;
  const updated = task.updated_at || task.created_at || new Date().toISOString();
  const location =
    task.location ?? extractDescriptionField(task.description, "Venue") ?? task.department;
  const status = toIcsStatus(task.status, task.description);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(task.id)}@review-dashboard-planner`,
    `DTSTAMP:${toIcsDateTime(new Date(updated))}`,
    `LAST-MODIFIED:${toIcsDateTime(new Date(updated))}`,
    `SUMMARY:${escapeIcs(task.title || "Planner Meeting")}`,
    task.description ? `DESCRIPTION:${escapeIcs(task.description)}` : "",
    location ? `LOCATION:${escapeIcs(location)}` : "",
    `STATUS:${status}`,
    "END:VEVENT",
  ].filter(Boolean);

  lines.splice(5, 0, ...buildEventDateLines(date, time, durationMinutes, task.end_time));
  return lines;
}

function getPlannerTaskDate(task: PlannerIcsTask) {
  for (const field of plannerDateFields) {
    const fieldValue = task[field];
    const value = typeof fieldValue === "string" ? normalizeDateKey(fieldValue) : null;
    if (value) return value;
  }
  return null;
}

function normalizeDateKey(value: string | null | undefined) {
  if (!value) return null;
  const date = value.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

function comparePlannerTasks(a: PlannerIcsTask, b: PlannerIcsTask) {
  const dateCompare = String(getPlannerTaskDate(a)).localeCompare(String(getPlannerTaskDate(b)));
  if (dateCompare) return dateCompare;
  return String(normalizeTime(a.due_time) ?? "").localeCompare(
    String(normalizeTime(b.due_time) ?? ""),
  );
}

function formatUndatedPlannerRows(rows: PlannerIcsTask[]) {
  if (!rows.length) return ["No undated task records were found in scope."];
  const sample = rows.slice(0, 10).map((row) => `- ${row.id}: ${row.title || "Untitled task"}`);
  return [
    "Task records missing planner dates:",
    ...sample,
    rows.length > sample.length ? `- ...and ${rows.length - sample.length} more.` : "",
  ].filter(Boolean);
}

function buildEventDateLines(
  date: string,
  time: string | null,
  durationMinutes: number,
  explicitEndTime?: string | null,
) {
  if (!time) {
    return [
      `DTSTART;VALUE=DATE:${toIcsDate(date)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDaysToDateKey(date, 1))}`,
    ];
  }

  const startMinutes = minutesFromTime(time);
  const endTime = normalizeTime(explicitEndTime);
  const endMinutes = endTime ? minutesFromTime(endTime) : startMinutes + durationMinutes;
  console.info("[Planner Booking Debug] generated ICS dates", {
    selectedSlot: time,
    dtstart: toIcsLocalDateTime(date, startMinutes),
    dtend: toIcsLocalDateTime(date, endMinutes),
  });
  return [
    `DTSTART;TZID=Asia/Kolkata:${toIcsLocalDateTime(date, startMinutes)}`,
    `DTEND;TZID=Asia/Kolkata:${toIcsLocalDateTime(date, endMinutes)}`,
  ];
}

function buildKolkataTimezone() {
  return [
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "X-LIC-LOCATION:Asia/Kolkata",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "TZNAME:IST",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
}

function normalizeTime(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [, hourText, minuteText, period] = match;
  let hour = Number(hourText);
  if (period.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minuteText}`;
}

function addMinutesToTime(value: string | null, minutes: number) {
  if (!value) return null;
  const start = minutesFromTime(value);
  const end = start + minutes;
  return timeFromMinutes(end);
}

function timeFromMinutes(value: number) {
  const minuteOfDay = ((value % 1440) + 1440) % 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toIcsDate(date: string) {
  return date.replace(/-/g, "");
}

function toIcsDateTime(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function toIcsLocalDateTime(date: string, minutes: number) {
  const dayOffset = Math.floor(minutes / 1440);
  const minuteOfDay = ((minutes % 1440) + 1440) % 1440;
  const dateKey = dayOffset ? addDaysToDateKey(date, dayOffset) : date;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${toIcsDate(dateKey)}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

function addDaysToDateKey(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  return utcDate.toISOString().slice(0, 10);
}

function minutesFromTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function extractDurationMinutes(description: string | null | undefined) {
  const duration = extractDescriptionField(description, "Duration");
  if (!duration) return null;
  const match = duration.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return unit.startsWith("h") ? amount * 60 : amount;
}

function extractDescriptionField(description: string | null | undefined, field: string) {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = description?.match(new RegExp(`^${escapedField}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || null;
}

function toIcsStatus(status: string | null, description: string | null) {
  const plannerStatus = extractDescriptionField(description, "Status")?.toLowerCase();
  if (status === "blocked" || status === "cancelled" || plannerStatus === "cancelled")
    return "CANCELLED";
  if (status === "todo" || status === "tentative" || plannerStatus === "tentative")
    return "TENTATIVE";
  return "CONFIRMED";
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  const maxLength = 75;
  const chunks: string[] = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    chunks.push(remaining.slice(0, maxLength));
    remaining = ` ${remaining.slice(maxLength)}`;
  }
  chunks.push(remaining);
  return chunks;
}
