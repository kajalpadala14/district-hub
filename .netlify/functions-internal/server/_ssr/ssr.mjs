//#region node_modules/.nitro/vite/services/ssr/index.js
var lastCapturedError;
var TTL_MS = 5e3;
function record(error) {
	lastCapturedError = {
		error,
		at: Date.now()
	};
}
if (typeof globalThis.addEventListener === "function") {
	globalThis.addEventListener("error", (event) => record(event.error ?? event));
	globalThis.addEventListener("unhandledrejection", (event) => record(event.reason));
}
function consumeLastCapturedError() {
	if (!lastCapturedError) return void 0;
	if (Date.now() - lastCapturedError.at > TTL_MS) {
		lastCapturedError = void 0;
		return;
	}
	const { error } = lastCapturedError;
	lastCapturedError = void 0;
	return error;
}
function renderErrorPage() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
var serverEntryPromise;
async function getServerEntry() {
	if (!serverEntryPromise) serverEntryPromise = import("./server-B1pDf0qO.mjs").then((m) => m.default ?? m);
	return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response) {
	if (response.status < 500) return response;
	if (!(response.headers.get("content-type") ?? "").includes("application/json")) return response;
	const body = await response.clone().text();
	if (!isH3SwallowedErrorBody(body)) return response;
	console.error(consumeLastCapturedError() ?? /* @__PURE__ */ new Error(`h3 swallowed SSR error: ${body}`));
	return new Response(renderErrorPage(), {
		status: 500,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
function isH3SwallowedErrorBody(body) {
	try {
		const payload = JSON.parse(body);
		return payload.unhandled === true && payload.message === "HTTPError";
	} catch {
		return false;
	}
}
var server_default = { async fetch(request, env, ctx) {
	try {
		const url = new URL(request.url);
		if (url.pathname === "/api/planner/export.ics") return await handlePlannerIcsExport(request, url);
		if (url.pathname === "/api/planner/imported-events") return await handlePlannerImportedEvents(url);
		if (url.pathname === "/api/planner/tasks") return await handlePlannerTaskSave(request);
		if (url.pathname === "/api/tasks") return await handleTaskSave(request);
		return await normalizeCatastrophicSsrResponse(await (await getServerEntry()).fetch(request, env, ctx));
	} catch (error) {
		console.error(error);
		return new Response(renderErrorPage(), {
			status: 500,
			headers: { "content-type": "text/html; charset=utf-8" }
		});
	}
} };
async function handleTaskSave(request) {
	if (![
		"POST",
		"PUT",
		"DELETE"
	].includes(request.method)) return new Response("Method not allowed", {
		status: 405,
		headers: { "content-type": "text/plain; charset=utf-8" }
	});
	try {
		const user = await authenticatedPlannerUser(request);
		const body = await request.json();
		const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
		if (request.method === "DELETE") {
			if (!body.id) return new Response("Task id required", {
				status: 400,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			if (!await getTaskForUser(body.id, user.id, user.canManageAllTasks)) return new Response("Task not found", {
				status: 404,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			const { error } = await supabaseAdmin.from("tasks").delete().eq("id", body.id);
			if (error) throw error;
			return Response.json({ ok: true }, { status: 200 });
		}
		const payload = taskPayload(body);
		if (request.method === "PUT") {
			if (!body.id) return new Response("Task id required", {
				status: 400,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			if (!await getTaskForUser(body.id, user.id, user.canManageAllTasks)) return new Response("Task not found", {
				status: 404,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			const { data, error } = await supabaseAdmin.from("tasks").update(payload).eq("id", body.id).select(legacyPlannerTaskSelect).single();
			if (error) throw error;
			return Response.json({ task: data }, { status: 200 });
		}
		const { data, error } = await supabaseAdmin.from("tasks").insert({
			...payload,
			created_by: user.id
		}).select(legacyPlannerTaskSelect).single();
		if (error) throw error;
		return Response.json({ task: data }, { status: 201 });
	} catch (error) {
		console.error("[Task Save] failed", error);
		return new Response(error instanceof Error ? error.message : "Task save failed", {
			status: error instanceof PlannerAuthError ? error.status : 500,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
	}
}
async function handlePlannerIcsExport(request, url) {
	try {
		const token = url.searchParams.get("token")?.trim();
		if (!token) return new Response("Planner subscription token is required", {
			status: 400,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
		const settings = await resolvePlannerSettingsByToken(token, "user_id");
		if (!settings) return new Response("Planner subscription token not found", {
			status: 401,
			headers: plannerNoCacheHeaders({ "content-type": "text/plain; charset=utf-8" })
		});
		const plannerTasks = await fetchPlannerTasksForCalendar(settings.user_id);
		const feedMeta = plannerIcsFeedMeta(plannerTasks);
		const ics = buildPlannerIcsContent(plannerTasks);
		return new Response(ics, {
			status: 200,
			headers: plannerIcsHeaders(feedMeta)
		});
	} catch (error) {
		console.error("[Planner ICS Export] failed", error);
		return new Response("Planner calendar export failed", {
			status: 500,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
	}
}
async function handlePlannerTaskSave(request) {
	if (![
		"POST",
		"PUT",
		"DELETE"
	].includes(request.method)) return new Response("Method not allowed", {
		status: 405,
		headers: { "content-type": "text/plain; charset=utf-8" }
	});
	try {
		const user = await authenticatedPlannerUser(request);
		const body = await request.json();
		const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
		console.info("[Planner Booking Debug] API received", {
			method: request.method,
			id: body.id ?? null,
			selectedSlot: body.due_time ?? null,
			scheduledDate: body.scheduled_date ?? body.due_date ?? null
		});
		if (request.method === "DELETE") {
			if (!body.id || body.id.startsWith("ics-")) return new Response("Planner event id required", {
				status: 400,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			if (!await getPlannerTaskForUser(body.id, user.id)) return new Response("Planner task not found", {
				status: 404,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			const { error } = await supabaseAdmin.from("planner_events").delete().eq("id", body.id);
			if (error) throw error;
			return Response.json({ ok: true }, { status: 200 });
		}
		const payload = plannerTaskPayload(body);
		console.info("[Planner Booking Debug] normalized database payload", {
			selectedSlot: body.due_time ?? null,
			databaseValue: payload.start_time,
			databaseEndValue: payload.end_time,
			date: payload.date
		});
		if (request.method === "PUT" && body.id && !body.id.startsWith("ics-")) {
			if (!await getPlannerTaskForUser(body.id, user.id)) return new Response("Planner task not found", {
				status: 404,
				headers: { "content-type": "text/plain; charset=utf-8" }
			});
			const { data, error } = await supabaseAdmin.from("planner_events").update(payload).eq("id", body.id).select(plannerTaskSelectWithoutSequence).single();
			if (error) throw error;
			console.info("[Planner Booking Debug] database saved", {
				id: data.id,
				databaseValue: data.start_time,
				databaseEndValue: data.end_time
			});
			return Response.json({ task: data }, { status: 200 });
		}
		const { data, error } = await supabaseAdmin.from("planner_events").insert({
			...payload,
			user_id: user.id
		}).select(plannerTaskSelectWithoutSequence).single();
		if (error) throw error;
		console.info("[Planner Booking Debug] database saved", {
			id: data.id,
			databaseValue: data.start_time,
			databaseEndValue: data.end_time
		});
		return Response.json({ task: data }, { status: 201 });
	} catch (error) {
		console.error("[Planner Task Save] failed", error);
		return new Response(error instanceof Error ? error.message : "Planner task save failed", {
			status: error instanceof PlannerAuthError ? error.status : 500,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
	}
}
async function handlePlannerImportedEvents(url) {
	try {
		const token = url.searchParams.get("token")?.trim();
		if (!token) return new Response("Planner subscription token is required", {
			status: 400,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
		const settings = await resolvePlannerSettingsByToken(token, "apple_ics_url,apple_calendar_url");
		if (!settings) return new Response("Planner subscription token not found", {
			status: 404,
			headers: plannerNoCacheHeaders({ "content-type": "text/plain; charset=utf-8" })
		});
		const requestedIcsUrl = url.searchParams.get("icsUrl")?.trim();
		const events = await fetchImportedPlannerEvents(requestedIcsUrl || settings.apple_calendar_url || settings.apple_ics_url);
		return Response.json({ events }, { headers: plannerNoCacheHeaders() });
	} catch (error) {
		console.error("[Planner Imported Events] failed", error);
		return new Response("Planner imported events fetch failed", {
			status: 500,
			headers: { "content-type": "text/plain; charset=utf-8" }
		});
	}
}
var PlannerAuthError = class extends Error {
	status;
	constructor(message, status) {
		super(message);
		this.status = status;
	}
};
var plannerDateFields = [
	"scheduled_date",
	"due_date",
	"date",
	"meeting_date",
	"start_date",
	"event_date"
];
var plannerTaskSelect = "id,title,description,location,date,start_time,end_time,is_all_day,updated_at,created_at,status,priority,color,user_id,sequence";
var plannerTaskSelectWithoutSequence = "id,title,description,location,date,start_time,end_time,is_all_day,updated_at,created_at,status,priority,color,user_id";
var legacyPlannerTaskSelect = "id,title,description,department,scheduled_date,due_date,due_time,updated_at,created_at,status,priority,calendar_sync_enabled,calendar_sync_status,google_calendar_event_id,calendar_event_html_link,calendar_last_synced_at,calendar_sync_error,calendar_retry_count,assignee_id,completed_at,created_by";
async function authenticatedPlannerUser(request) {
	const token = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
	if (!token) throw new PlannerAuthError("Sign in required to save planner task", 401);
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	const { data, error } = await supabaseAdmin.auth.getUser(token);
	if (error || !data.user) throw new PlannerAuthError(error?.message || "Invalid planner session", 401);
	return {
		id: data.user.id,
		canManageAllTasks: await userCanViewAllTasks(data.user.id)
	};
}
async function resolvePlannerSettingsByToken(token, selectColumns) {
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	const selectedColumns = selectColumns.includes("user_id") ? selectColumns : `user_id,${selectColumns}`;
	let { data, error } = await supabaseAdmin.from("planner_settings").select(selectedColumns).eq("subscription_token", token).maybeSingle();
	if (!data && !error) {
		const fallback = await supabaseAdmin.from("planner_settings").select(selectedColumns).eq("ics_token", token).maybeSingle();
		data = fallback.data;
		error = isPlannerSettingsTokenAliasUnavailable(fallback.error) ? null : fallback.error;
	}
	if (error) throw error;
	return data;
}
function plannerIcsFeedMeta(tasks) {
	const newestUpdatedAt = tasks.reduce((newest, task) => {
		const value = task.updated_at || task.created_at;
		if (!value) return newest;
		return !newest || Date.parse(value) > Date.parse(newest) ? value : newest;
	}, null);
	const updatedSignature = tasks.map((task) => `${task.id}:${task.updated_at || task.created_at || "none"}:${Math.max(0, Number(task.sequence) || 0)}`).join("|");
	return {
		etag: `"planner-events-${tasks.length}-${hashText(updatedSignature)}"`,
		lastModified: newestUpdatedAt ? new Date(newestUpdatedAt).toUTCString() : null
	};
}
function plannerIcsHeaders(meta) {
	return plannerNoCacheHeaders({
		"content-type": "text/calendar; charset=utf-8",
		"content-disposition": "attachment; filename=\"planner.ics\"",
		etag: meta.etag,
		...meta.lastModified ? { "last-modified": meta.lastModified } : {}
	});
}
function plannerNoCacheHeaders(headers = {}) {
	return {
		...headers,
		"cache-control": "no-store, no-cache, max-age=0, must-revalidate"
	};
}
function plannerTaskPayload(body) {
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
		end_time: addMinutesToTime(normalizeTime(body.due_time), extractDurationMinutes(body.description) ?? 30),
		is_all_day: !normalizeTime(body.due_time),
		status: normalizePlannerEventStatus(body.status, body.description),
		priority: normalizeTaskPriority(body.priority)
	};
}
function taskPayload(body) {
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
		completed_at: status === "done" ? body.completed_at || (/* @__PURE__ */ new Date()).toISOString() : null,
		calendar_sync_enabled: body.calendar_sync_enabled === true
	};
}
async function getPlannerTaskForUser(taskId, userId) {
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	const canManageAllTasks = await userCanViewAllTasks(userId);
	let query = supabaseAdmin.from("planner_events").select("id,user_id").eq("id", taskId).maybeSingle();
	if (!canManageAllTasks) query = query.eq("user_id", userId);
	const { data, error } = await query;
	if (error) throw error;
	return data;
}
async function getTaskForUser(taskId, userId, canManageAllTasks) {
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	let query = supabaseAdmin.from("tasks").select("id,created_by,assignee_id").eq("id", taskId).maybeSingle();
	if (!canManageAllTasks) query = query.or(`created_by.eq.${userId},assignee_id.eq.${userId}`);
	const { data, error } = await query;
	if (error) throw error;
	return data;
}
function normalizeTaskStatus(value) {
	if ([
		"todo",
		"in_progress",
		"blocked",
		"done"
	].includes(value ?? "")) return value;
	return "in_progress";
}
function normalizePlannerEventStatus(value, description) {
	const plannerStatus = extractDescriptionField(description, "Status")?.toLowerCase();
	if (value === "blocked" || plannerStatus === "cancelled") return "cancelled";
	if (value === "done") return "completed";
	if (value === "todo" || plannerStatus === "tentative") return "tentative";
	return "confirmed";
}
function normalizeTaskPriority(value) {
	if ([
		"low",
		"medium",
		"high",
		"urgent"
	].includes(value ?? "")) return value;
	return "medium";
}
async function fetchPlannerTasksForCalendar(userId) {
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	return (await fetchPlannerTaskRows(userId, await userCanViewAllTasks(userId))).filter((task) => getPlannerTaskDate(task)).sort(comparePlannerTasks);
}
async function fetchPlannerTaskRows(userId, canViewAllPlannerTasks) {
	try {
		return await fetchPlannerTaskRowsWithSelect(userId, canViewAllPlannerTasks, plannerTaskSelect);
	} catch (error) {
		if (!isPlannerEventsSequenceUnavailable(error)) throw error;
		return await fetchPlannerTaskRowsWithSelect(userId, canViewAllPlannerTasks, plannerTaskSelectWithoutSequence);
	}
}
async function fetchPlannerTaskRowsWithSelect(userId, canViewAllPlannerTasks, selectColumns) {
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	let query = supabaseAdmin.from("planner_events").select(selectColumns).order("date", {
		ascending: true,
		nullsFirst: false
	}).order("start_time", {
		ascending: true,
		nullsFirst: false
	});
	if (!canViewAllPlannerTasks) query = query.eq("user_id", userId);
	const { data, error } = await query;
	if (error) throw error;
	return (data ?? []).map(plannerEventRowToIcsTask);
}
function isPlannerSettingsTokenAliasUnavailable(error) {
	if (!error) return false;
	const message = error.message ?? "";
	return /ics_token/i.test(message) || /schema cache/i.test(message);
}
function isPlannerEventsSequenceUnavailable(error) {
	const message = error instanceof Error ? error.message : String(error?.message ?? "");
	return /sequence/i.test(message) && /planner_events|schema cache|column/i.test(message);
}
function plannerEventRowToIcsTask(row) {
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
		sequence: typeof row.sequence === "number" ? row.sequence : null
	};
}
async function fetchImportedPlannerEvents(icsUrl) {
	const feedUrl = normalizeExternalIcsUrl(icsUrl);
	if (!feedUrl) return [];
	const response = await fetch(feedUrl, { headers: {
		accept: "text/calendar,text/plain,*/*",
		"user-agent": "District Governance Planner ICS Import"
	} });
	if (!response.ok) throw new Error(`Imported ICS fetch failed: ${response.status} ${response.statusText}`);
	return parseImportedIcsEvents(await response.text()).map(importedIcsEventToPlannerTask).filter((task) => getPlannerTaskDate(task));
}
function normalizeExternalIcsUrl(value) {
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
function parseImportedIcsEvents(ics) {
	const lines = unfoldIcsLines(ics);
	const events = [];
	let current = null;
	for (const line of lines) {
		if (line === "BEGIN:VEVENT") {
			current = {
				uid: null,
				summary: null,
				description: null,
				location: null,
				status: null,
				dtstart: null,
				dtend: null
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
function unfoldIcsLines(ics) {
	const rawLines = ics.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
	const lines = [];
	for (const rawLine of rawLines) if (/^[ \t]/.test(rawLine) && lines.length) lines[lines.length - 1] += rawLine.slice(1);
	else lines.push(rawLine.trimEnd());
	return lines;
}
function importedIcsEventToPlannerTask(event) {
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
		status
	};
}
function parseIcsStart(value) {
	if (!value) return null;
	const trimmed = value.trim();
	const dateOnly = trimmed.match(/^(\d{4})(\d{2})(\d{2})$/);
	if (dateOnly) return {
		date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
		time: null
	};
	const dateTime = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
	if (!dateTime) return null;
	if (dateTime[7]) {
		const date = new Date(Date.UTC(Number(dateTime[1]), Number(dateTime[2]) - 1, Number(dateTime[3]), Number(dateTime[4]), Number(dateTime[5]), Number(dateTime[6] ?? "0")));
		const kolkata = new Intl.DateTimeFormat("en-CA", {
			timeZone: "Asia/Kolkata",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			hour12: false
		}).formatToParts(date).reduce((parts, part) => {
			if (part.type !== "literal") parts[part.type] = part.value;
			return parts;
		}, {});
		return {
			date: `${kolkata.year}-${kolkata.month}-${kolkata.day}`,
			time: `${kolkata.hour}:${kolkata.minute}`
		};
	}
	return {
		date: `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`,
		time: `${dateTime[4]}:${dateTime[5]}`
	};
}
function unescapeIcs(value) {
	return value.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}
function hashText(value) {
	let hash = 0;
	for (let index = 0; index < value.length; index += 1) hash = Math.imul(31, hash) + value.charCodeAt(index);
	return Math.abs(hash).toString(36);
}
async function userCanViewAllTasks(userId) {
	const { supabaseAdmin } = await import("./client.server-BPQmgJNv.mjs");
	const { data, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "manager"]);
	if (error) throw error;
	return (data ?? []).length > 0;
}
function buildPlannerIcsContent(tasks) {
	return `${[
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Review Dashboard//Planner//EN",
		"CALSCALE:GREGORIAN",
		"METHOD:PUBLISH",
		"X-WR-CALNAME:District Governance Planner",
		"X-WR-TIMEZONE:Asia/Kolkata",
		...buildKolkataTimezone(),
		...tasks.flatMap((task) => buildPlannerIcsEvent(task)),
		"END:VCALENDAR"
	].flatMap(foldIcsLine).join("\r\n")}\r\n`;
}
function buildPlannerIcsEvent(task) {
	const date = getPlannerTaskDate(task) ?? toDateKey(/* @__PURE__ */ new Date());
	const time = normalizeTime(task.due_time);
	const durationMinutes = extractDurationMinutes(task.description) ?? 30;
	const updated = task.updated_at || task.created_at || (/* @__PURE__ */ new Date()).toISOString();
	const location = task.location ?? extractDescriptionField(task.description, "Venue") ?? task.department;
	const status = toIcsStatus(task.status, task.description);
	const lines = [
		"BEGIN:VEVENT",
		`UID:${escapeIcs(task.id)}@review-dashboard-planner`,
		`SEQUENCE:${Math.max(0, Number(task.sequence) || 0)}`,
		`DTSTAMP:${toIcsDateTime(new Date(updated))}`,
		`LAST-MODIFIED:${toIcsDateTime(new Date(updated))}`,
		`SUMMARY:${escapeIcs(task.title || "Planner Meeting")}`,
		task.description ? `DESCRIPTION:${escapeIcs(task.description)}` : "",
		location ? `LOCATION:${escapeIcs(location)}` : "",
		`STATUS:${status}`,
		"END:VEVENT"
	].filter(Boolean);
	lines.splice(5, 0, ...buildEventDateLines(date, time, durationMinutes, task.end_time));
	return lines;
}
function getPlannerTaskDate(task) {
	for (const field of plannerDateFields) {
		const fieldValue = task[field];
		const value = typeof fieldValue === "string" ? normalizeDateKey(fieldValue) : null;
		if (value) return value;
	}
	return null;
}
function normalizeDateKey(value) {
	if (!value) return null;
	const date = value.trim().slice(0, 10);
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
	return date;
}
function comparePlannerTasks(a, b) {
	const dateCompare = String(getPlannerTaskDate(a)).localeCompare(String(getPlannerTaskDate(b)));
	if (dateCompare) return dateCompare;
	return String(normalizeTime(a.due_time) ?? "").localeCompare(String(normalizeTime(b.due_time) ?? ""));
}
function buildEventDateLines(date, time, durationMinutes, explicitEndTime) {
	if (!time) return [`DTSTART;VALUE=DATE:${toIcsDate(date)}`, `DTEND;VALUE=DATE:${toIcsDate(addDaysToDateKey(date, 1))}`];
	const startMinutes = minutesFromTime(time);
	const endTime = normalizeTime(explicitEndTime);
	const endMinutes = endTime ? minutesFromTime(endTime) : startMinutes + durationMinutes;
	console.info("[Planner Booking Debug] generated ICS dates", {
		selectedSlot: time,
		dtstart: toIcsLocalDateTime(date, startMinutes),
		dtend: toIcsLocalDateTime(date, endMinutes)
	});
	return [`DTSTART;TZID=Asia/Kolkata:${toIcsLocalDateTime(date, startMinutes)}`, `DTEND;TZID=Asia/Kolkata:${toIcsLocalDateTime(date, endMinutes)}`];
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
		"END:VTIMEZONE"
	];
}
function normalizeTime(value) {
	if (!value) return null;
	const trimmed = value.trim();
	const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
	if (timeMatch) {
		const hour = Number(timeMatch[1]);
		const minute = Number(timeMatch[2]);
		if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
	}
	const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
	if (!match) return null;
	const [, hourText, minuteText, period] = match;
	let hour = Number(hourText);
	if (period.toUpperCase() === "PM" && hour < 12) hour += 12;
	if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
	return `${String(hour).padStart(2, "0")}:${minuteText}`;
}
function addMinutesToTime(value, minutes) {
	if (!value) return null;
	return timeFromMinutes(minutesFromTime(value) + minutes);
}
function timeFromMinutes(value) {
	const minuteOfDay = (value % 1440 + 1440) % 1440;
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function toDateKey(date) {
	return date.toISOString().slice(0, 10);
}
function toIcsDate(date) {
	return date.replace(/-/g, "");
}
function toIcsDateTime(date) {
	return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
function toIcsLocalDateTime(date, minutes) {
	const dayOffset = Math.floor(minutes / 1440);
	const minuteOfDay = (minutes % 1440 + 1440) % 1440;
	const dateKey = dayOffset ? addDaysToDateKey(date, dayOffset) : date;
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	return `${toIcsDate(dateKey)}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}
function addDaysToDateKey(date, days) {
	const [year, month, day] = date.split("-").map(Number);
	return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
function minutesFromTime(value) {
	const [hour = "0", minute = "0"] = value.split(":");
	return Number(hour) * 60 + Number(minute);
}
function extractDurationMinutes(description) {
	const duration = extractDescriptionField(description, "Duration");
	if (!duration) return null;
	const match = duration.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i);
	if (!match) return null;
	const amount = Number(match[1]);
	const unit = match[2].toLowerCase();
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return unit.startsWith("h") ? amount * 60 : amount;
}
function extractDescriptionField(description, field) {
	const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return (description?.match(new RegExp(`^${escapedField}:\\s*(.+)$`, "im")))?.[1]?.trim() || null;
}
function toIcsStatus(status, description) {
	const plannerStatus = extractDescriptionField(description, "Status")?.toLowerCase();
	if (status === "blocked" || status === "cancelled" || plannerStatus === "cancelled") return "CANCELLED";
	if (status === "todo" || status === "tentative" || plannerStatus === "tentative") return "TENTATIVE";
	return "CONFIRMED";
}
function escapeIcs(value) {
	return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function foldIcsLine(line) {
	const maxLength = 75;
	const chunks = [];
	let remaining = line;
	while (remaining.length > maxLength) {
		chunks.push(remaining.slice(0, maxLength));
		remaining = ` ${remaining.slice(maxLength)}`;
	}
	chunks.push(remaining);
	return chunks;
}
//#endregion
export { server_default as default, renderErrorPage as t };
