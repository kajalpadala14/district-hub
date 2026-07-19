import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  listLocalDepartments,
  listLocalProfiles,
  listLocalTasks,
  subscribeLocalDepartments,
  subscribeLocalProfiles,
  subscribeLocalTasks,
} from "@/lib/localTaskStore";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
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
        setTasks(listLocalTasks());
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("tasks")
        .select("*")
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

    const unsubscribeLocal = subscribeLocalTasks(() => {
      if (mounted) void load();
    });
    const channel = supabase
      .channel("tasks-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => {
          if (mounted) void load();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      unsubscribeLocal();
      supabase.removeChannel(channel);
    };
  }, []);

  return { tasks, loading, error, refresh: load };
}

export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const local = listLocalProfiles();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setProfiles(local);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      setProfiles(mergeProfiles(data ?? [], local));
      setLoading(false);
    } catch {
      setProfiles(listLocalProfiles());
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void load();

    const unsubscribeLocalProfiles = subscribeLocalProfiles(() => {
      if (mounted) void load();
    });
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
      unsubscribeLocalProfiles();
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
    const local = listLocalDepartments();
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
        setDepartments(mergeDepartments([...local, ...extras]));
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      setDepartments(mergeDepartments([...(data ?? []), ...local, ...extras]));
      setLoading(false);
    } catch {
      setDepartments(mergeDepartments([...local, ...extras]));
      setLoading(false);
    }
  }, [extraNames.join("|")]);

  useEffect(() => {
    let mounted = true;
    const loadIfMounted = async () => {
      if (mounted) await load();
    };
    void loadIfMounted();

    const unsubscribeLocalDepartments = subscribeLocalDepartments(() => {
      if (mounted) void load();
    });
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
      unsubscribeLocalDepartments();
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { departments, loading, refresh: load };
}

function mergeProfiles(remote: Profile[], local: Profile[]) {
  const byId = new Map<string, Profile>();
  for (const profile of [...local, ...remote]) byId.set(profile.id, profile);
  return Array.from(byId.values()).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
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
