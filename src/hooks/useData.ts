import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type PlannerEvent = Database["public"]["Tables"]["planner_events"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await (supabase as any)
        .from("tasks")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("created_at", { ascending: false });
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

  useEffect(() => {
    let mounted = true;
    void load();

    const channel = supabase
      .channel("tasks-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        if (mounted) void load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { tasks, loading, error, refresh: load };
}

export function usePlannerEvents() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setTasks([]);
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await (supabase as any)
        .from("planner_events")
        .select("*")
        .eq("user_id", sessionData.session.user.id)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });
      if (queryError) throw queryError;
      const plannerEvents = data ?? [];

      console.info(
        "[Planner Position Debug] planner_events response",
        plannerEvents.map((event) => ({
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          date: event.date,
        })),
      );
      setTasks(plannerEvents.map((event) => plannerEventToTask(event)));
    } catch (loadError) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load planner events";
      console.error("[Planner Events] Load failed", loadError);
      setError(message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void load();

    const channel = supabase
      .channel("planner-events-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "planner_events" }, () => {
        if (mounted) void load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { tasks, loading, error, refresh: load };
}

function plannerEventToTask(event: PlannerEvent): Task {
  const status: TaskStatus =
    event.status === "cancelled"
      ? "blocked"
      : event.status === "completed"
        ? "done"
        : event.status === "tentative"
          ? "todo"
          : "in_progress";
  const priority = ["low", "medium", "high", "urgent"].includes(event.priority)
    ? (event.priority as TaskPriority)
    : "medium";

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
    google_calendar_event_id: null,
  };
  console.info("[Planner Position Debug] mapped planner event", {
    id: event.id,
    start_time: event.start_time,
    due_time: task.due_time,
  });
  return task;
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      setProfiles(data ?? []);
      setLoading(false);
    } catch {
      setProfiles([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void load();

    const channel = supabase
      .channel("profiles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => void load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { profiles, loading, refresh: load };
}

export function useDepartments(extraNames: Array<string | null | undefined> = []) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const channelNameRef = useRef(`departments-changes-${crypto.randomUUID()}`);

  const load = useCallback(async () => {
    const extras = extraNames
      .map((name) => name?.trim())
      .filter((name): name is string => !!name)
      .map((name) => ({
        id: `derived-department-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setDepartments(mergeDepartments(extras));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setDepartments(mergeDepartments([...(data ?? []), ...extras]));
      setLoading(false);
    } catch {
      setDepartments(mergeDepartments(extras));
      setLoading(false);
    }
  }, [extraNames.join("|")]);

  useEffect(() => {
    let mounted = true;
    const loadIfMounted = async () => {
      if (mounted) await load();
    };
    void loadIfMounted();

    const channel = supabase
      .channel(channelNameRef.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "departments" },
        () => void load(),
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { departments, loading, refresh: load };
}

function mergeDepartments(items: Department[]) {
  const byName = new Map<string, Department>();
  for (const department of items) {
    const clean = department.name.trim().replace(/\s+/g, " ");
    if (!clean) continue;
    byName.set(clean.toLowerCase(), { ...department, name: clean });
  }
  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export type UserRoleRow = { user_id: string; role: "admin" | "manager" | "employee" };

export function useUserRoles() {
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from("user_roles").select("user_id, role");
      if (!mounted) return;
      setRoles((data ?? []) as UserRoleRow[]);
    };
    void load();
    const channel = supabase
      .channel("user-roles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles" },
        () => void load(),
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);
  return roles;
}
