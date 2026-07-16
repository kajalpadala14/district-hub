import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "employee";

export interface AuthState {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadRole = async (uid: string) => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (!mounted) return;
      const roles = (data ?? []).map((r) => r.role as AppRole);
      const highest: AppRole | null = roles.includes("admin")
        ? "admin"
        : roles.includes("manager")
          ? "manager"
          : roles.includes("employee")
            ? "employee"
            : null;
      setRole(highest);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadRole(session.user.id);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      if (data.session?.user) void loadRole(data.session.user.id);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, role, loading };
}

export function canManageTasks(role: AppRole | null) {
  return role === "admin" || role === "manager";
}
