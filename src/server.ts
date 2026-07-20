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
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("planner_settings")
      .select("user_id")
      .eq("subscription_token", token)
      .maybeSingle();

    if (settingsError) throw settingsError;
    if (!settings) {
      return new Response("Planner subscription token not found", {
        status: 404,
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

type PlannerIcsTask = {
  id: string;
  title: string | null;
  description: string | null;
  department: string | null;
  scheduled_date: string | null;
  due_date: string | null;
  due_time: string | null;
  updated_at: string | null;
  created_at: string | null;
  status: string | null;
};

async function fetchPlannerTasksForCalendar(userId: string): Promise<PlannerIcsTask[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const canViewAllPlannerTasks = await userCanViewAllTasks(userId);
  let query = supabaseAdmin
    .from("tasks")
    .select(
      "id,title,description,department,scheduled_date,due_date,due_time,updated_at,created_at,status",
    )
    .or("scheduled_date.not.is.null,due_date.not.is.null")
    .ilike("description", "%type: meeting%")
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("due_time", { ascending: true, nullsFirst: false });

  if (!canViewAllPlannerTasks) {
    query = query.or(
      `created_by.eq.${userId},assigned_to.eq.${userId},assignee_id.eq.${userId},backend_assigned_to.eq.${userId}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
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
  let datedQuery = supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .or("scheduled_date.not.is.null,due_date.not.is.null");

  if (!canViewAllPlannerTasks) {
    datedQuery = datedQuery.or(
      `created_by.eq.${userId},assigned_to.eq.${userId},assignee_id.eq.${userId},backend_assigned_to.eq.${userId}`,
    );
  }

  const { count: datedCount, error: datedError } = await datedQuery;
  if (datedError) throw datedError;

  return [
    "No planner calendar events were exported.",
    `Reason: the subscription token is valid, but the database query found no dated tasks marked as planner meetings for this user's calendar scope.`,
    `Calendar scope: ${canViewAllPlannerTasks ? "admin/manager, all planner tasks" : "tasks created by or assigned to the token owner"}.`,
    `Dated tasks in scope before the planner-meeting filter: ${datedCount ?? 0}.`,
    `Planner filter: tasks.description must contain "Type: Meeting" and scheduled_date or due_date must be set.`,
  ].join("\n");
}

function buildPlannerIcsContent(tasks: PlannerIcsTask[]) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//District Governance Portal//Planner//EN",
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
  const date = task.scheduled_date ?? task.due_date ?? toDateKey(new Date());
  const time = normalizeTime(task.due_time);
  const durationMinutes = extractDurationMinutes(task.description) ?? 30;
  const updated = task.updated_at || task.created_at || new Date().toISOString();
  const location = extractDescriptionField(task.description, "Venue") ?? task.department;
  const status = toIcsStatus(task.status, task.description);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${escapeIcs(task.id)}@district-governance-portal`,
    `DTSTAMP:${toIcsDateTime(new Date(updated))}`,
    `SUMMARY:${escapeIcs(task.title || "Planner Meeting")}`,
    task.description ? `DESCRIPTION:${escapeIcs(task.description)}` : "",
    location ? `LOCATION:${escapeIcs(location)}` : "",
    `STATUS:${status}`,
    "END:VEVENT",
  ].filter(Boolean);

  lines.splice(4, 0, ...buildEventDateLines(date, time, durationMinutes));
  return lines;
}

function buildEventDateLines(date: string, time: string | null, durationMinutes: number) {
  if (!time) {
    return [
      `DTSTART;VALUE=DATE:${toIcsDate(date)}`,
      `DTEND;VALUE=DATE:${toIcsDate(addDaysToDateKey(date, 1))}`,
    ];
  }

  const startMinutes = minutesFromTime(time);
  const endMinutes = startMinutes + durationMinutes;
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
  if (status === "blocked" || plannerStatus === "cancelled") return "CANCELLED";
  if (plannerStatus === "tentative") return "TENTATIVE";
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
