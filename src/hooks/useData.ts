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

      const userId = sessionData.session.user.id;
      const { data, error: queryError } = await (supabase as any)
        .from("tasks")
        .select("*")
        .or(`created_by.eq.${userId},assignee_id.eq.${userId},created_by.is.null`)
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

      const userId = sessionData.session.user.id;
      const { data, error: queryError } = await (supabase as any)
        .from("planner_events")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false });

      if (queryError) throw queryError;
      const plannerEvents = data ?? [];

      console.info(
        "[Planner Position Debug] planner_events response",
        plannerEvents.map((event: PlannerEvent) => ({
          id: event.id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          date: event.date,
        })),
      );
      setTasks(plannerEvents.map((event: PlannerEvent) => plannerEventToTask(event)));
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

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase.from("profiles").select("*");
      if (queryError) throw queryError;
      setProfiles(data ?? []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load profiles";
      console.error("[Profiles] Load failed", loadError);
      setError(message);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void load();

    const channel = supabase
      .channel("profiles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        if (mounted) void load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { profiles, loading, error, refresh: load };
}

export function useDepartments(additionalDepartments: Array<string | null | undefined> = []) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const additionalKey = useMemo(() => {
    return Array.from(
      new Set(
        additionalDepartments
          .map((dept) => dept?.trim())
          .filter((dept): dept is string => Boolean(dept)),
      ),
    )
      .sort()
      .join("|");
  }, [additionalDepartments]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });
      if (queryError) throw queryError;
      const dbDepartments = data ?? [];

      const existingNames = new Set(dbDepartments.map((d) => d.name.toLowerCase()));

      const synthDepts: Department[] = additionalKey
        ? additionalKey
            .split("|")
            .filter((name) => Boolean(name) && !existingNames.has(name.toLowerCase()))
            .map((name, idx) => ({
              id: `synth-${idx}-${name}`,
              name,
              code: name.slice(0, 4).toUpperCase(),
              created_at: new Date().toISOString(),
            }))
        : [];

      setDepartments([...dbDepartments, ...synthDepts]);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load departments";
      console.error("[Departments] Load failed", loadError);
      setError(message);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [additionalKey]);

  useEffect(() => {
    let mounted = true;
    void load();

    const channel = supabase
      .channel("departments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "departments" }, () => {
        if (mounted) void load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { departments, loading, error, refresh: load };
}

export function useUserRoles() {
  const [roles, setRoles] = useState<Array<{ user_id: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any).from("user_roles").select("user_id, role");
      setRoles(data ?? []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { roles, loading, refresh: load };
}

function plannerEventToTask(event: PlannerEvent): Task {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    status: event.status === "completed" ? "done" : "in_progress",
    priority: event.priority ?? "medium",
    department: event.department,
    scheduled_date: event.date,
    due_date: event.date,
    due_time: event.start_time,
    assignee_id: event.user_id,
    created_by: event.user_id,
    created_at: event.created_at,
    updated_at: event.updated_at,
    calendar_sync_enabled: false,
  };
}
