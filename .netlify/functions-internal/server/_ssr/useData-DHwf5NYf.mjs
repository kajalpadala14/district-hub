import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { r as cn } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useData-DHwf5NYf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
	variants: { variant: {
		default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
		secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
		destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
		outline: "text-foreground"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
function useTasks() {
	const [tasks, setTasks] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const load = (0, import_react.useCallback)(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setTasks([]);
				setLoading(false);
				return;
			}
			const { data, error: queryError } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
			if (queryError) throw queryError;
			setTasks(data ?? []);
		} catch (loadError) {
			const message = loadError instanceof Error ? loadError.message : "Failed to load tasks";
			console.error("[Tasks] Load failed", loadError);
			setError(message);
			setTasks([]);
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		load();
		const channel = supabase.channel("tasks-changes").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "tasks"
		}, () => {
			if (mounted) load();
		}).subscribe();
		return () => {
			mounted = false;
			supabase.removeChannel(channel);
		};
	}, [load]);
	return {
		tasks,
		loading,
		error,
		refresh: load
	};
}
function usePlannerEvents() {
	const [tasks, setTasks] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)(null);
	const load = (0, import_react.useCallback)(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setTasks([]);
				setLoading(false);
				return;
			}
			const { data, error: queryError } = await supabase.from("planner_events").select("*").order("date", { ascending: true }).order("start_time", {
				ascending: true,
				nullsFirst: false
			});
			if (queryError) throw queryError;
			const plannerEvents = data ?? [];
			console.info("[Planner Position Debug] planner_events response", plannerEvents.map((event) => ({
				id: event.id,
				title: event.title,
				start_time: event.start_time,
				end_time: event.end_time,
				date: event.date
			})));
			setTasks(plannerEvents.map((event) => plannerEventToTask(event)));
		} catch (loadError) {
			const message = loadError instanceof Error ? loadError.message : "Failed to load planner events";
			console.error("[Planner Events] Load failed", loadError);
			setError(message);
			setTasks([]);
		} finally {
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		load();
		const channel = supabase.channel("planner-events-changes").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "planner_events"
		}, () => {
			if (mounted) load();
		}).subscribe();
		return () => {
			mounted = false;
			supabase.removeChannel(channel);
		};
	}, [load]);
	return {
		tasks,
		loading,
		error,
		refresh: load
	};
}
function plannerEventToTask(event) {
	const status = event.status === "cancelled" ? "blocked" : event.status === "completed" ? "done" : event.status === "tentative" ? "todo" : "in_progress";
	const priority = [
		"low",
		"medium",
		"high",
		"urgent"
	].includes(event.priority) ? event.priority : "medium";
	const task = {
		id: event.id,
		title: event.title,
		description: event.description,
		department: event.location,
		scheduled_date: event.date,
		due_date: event.date,
		due_time: event.is_all_day ? null : event.start_time,
		status,
		priority,
		created_by: event.user_id,
		created_at: event.created_at,
		updated_at: event.updated_at,
		assignee_id: null,
		completed_at: event.status === "completed" ? event.updated_at : null,
		calendar_event_html_link: null,
		calendar_last_synced_at: null,
		calendar_retry_count: 0,
		calendar_sync_enabled: false,
		calendar_sync_error: null,
		calendar_sync_status: "not_synced",
		google_calendar_event_id: null
	};
	console.info("[Planner Position Debug] mapped planner event", {
		id: event.id,
		start_time: event.start_time,
		due_time: task.due_time
	});
	return task;
}
function useProfiles() {
	const [profiles, setProfiles] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const load = (0, import_react.useCallback)(async () => {
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setProfiles([]);
				setLoading(false);
				return;
			}
			const { data, error } = await supabase.from("profiles").select("*").order("full_name", { ascending: true });
			if (error) throw error;
			setProfiles(data ?? []);
			setLoading(false);
		} catch {
			setProfiles([]);
			setLoading(false);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		load();
		const channel = supabase.channel("profiles-changes").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "profiles"
		}, () => void load()).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [load]);
	return {
		profiles,
		loading,
		refresh: load
	};
}
function useDepartments(extraNames = []) {
	const [departments, setDepartments] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const channelNameRef = (0, import_react.useRef)(`departments-changes-${crypto.randomUUID()}`);
	const load = (0, import_react.useCallback)(async () => {
		const extras = extraNames.map((name) => name?.trim()).filter((name) => !!name).map((name) => ({
			id: `derived-department-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
			name,
			created_at: (/* @__PURE__ */ new Date(0)).toISOString(),
			updated_at: (/* @__PURE__ */ new Date(0)).toISOString()
		}));
		try {
			const { data: sessionData } = await supabase.auth.getSession();
			if (!sessionData.session) {
				setDepartments(mergeDepartments(extras));
				setLoading(false);
				return;
			}
			const { data, error } = await supabase.from("departments").select("*").order("name", { ascending: true });
			if (error) throw error;
			setDepartments(mergeDepartments([...data ?? [], ...extras]));
			setLoading(false);
		} catch {
			setDepartments(mergeDepartments(extras));
			setLoading(false);
		}
	}, [extraNames.join("|")]);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		const loadIfMounted = async () => {
			if (mounted) await load();
		};
		loadIfMounted();
		const channel = supabase.channel(channelNameRef.current).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "departments"
		}, () => void load()).subscribe();
		return () => {
			mounted = false;
			supabase.removeChannel(channel);
		};
	}, [load]);
	return {
		departments,
		loading,
		refresh: load
	};
}
function mergeDepartments(items) {
	const byName = /* @__PURE__ */ new Map();
	for (const department of items) {
		const clean = department.name.trim().replace(/\s+/g, " ");
		if (!clean) continue;
		byName.set(clean.toLowerCase(), {
			...department,
			name: clean
		});
	}
	return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}
function useUserRoles() {
	const [roles, setRoles] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		const load = async () => {
			const { data } = await supabase.from("user_roles").select("user_id, role");
			if (!mounted) return;
			setRoles(data ?? []);
		};
		load();
		const channel = supabase.channel("user-roles-changes").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "user_roles"
		}, () => void load()).subscribe();
		return () => {
			mounted = false;
			supabase.removeChannel(channel);
		};
	}, []);
	return roles;
}
//#endregion
export { useTasks as a, useProfiles as i, useDepartments as n, useUserRoles as o, usePlannerEvents as r, Badge as t };
