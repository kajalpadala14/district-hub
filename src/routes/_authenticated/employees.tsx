import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, useUserRoles, useTasks } from "@/hooks/useData";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

const ROLE_OPTIONS = ["admin", "manager", "employee"] as const;

function EmployeesPage() {
  const { role: currentRole, user } = useAuth();
  const { profiles } = useProfiles();
  const roles = useUserRoles();
  const { tasks } = useTasks();

  const [query, setQuery] = useState("");

  const roleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      const rank = (v: string) => (v === "admin" ? 1 : v === "manager" ? 2 : 3);
      const current = map.get(r.user_id);
      if (!current || rank(r.role) < rank(current)) map.set(r.user_id, r.role);
    }
    return map;
  }, [roles]);

  const taskCount = useMemo(() => {
    const c = new Map<string, number>();
    for (const t of tasks) {
      if (!t.assignee_id) continue;
      c.set(t.assignee_id, (c.get(t.assignee_id) ?? 0) + 1);
    }
    return c;
  }, [tasks]);

  const filtered = profiles.filter((p) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (p.full_name ?? "").toLowerCase().includes(q) ||
      (p.email ?? "").toLowerCase().includes(q) ||
      (p.department ?? "").toLowerCase().includes(q)
    );
  });

  const canManageRoles = currentRole === "admin";

  const changeRole = async (uid: string, newRole: "admin" | "manager" | "employee") => {
    if (uid === user?.id) {
      toast.error("You can't change your own role.");
      return;
    }
    const { error: delErr } = await supabase.from("user_roles").delete().eq("user_id", uid);
    if (delErr) {
      toast.error(delErr.message);
      return;
    }
    const { error: insErr } = await supabase
      .from("user_roles")
      .insert({ user_id: uid, role: newRole });
    if (insErr) toast.error(insErr.message);
    else toast.success("Role updated");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Employees</h2>
          <p className="text-sm text-muted-foreground">
            District team members and their roles.
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Search employees"
            placeholder="Search by name, email, department…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((p) => {
                  const r = (roleMap.get(p.id) ?? "employee") as "admin" | "manager" | "employee";
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                              {(p.full_name || p.email || "?").slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {p.full_name || "—"}
                              {p.id === user?.id && (
                                <Badge variant="secondary" className="ml-2 h-5 text-[10px]">You</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.department || <span className="text-muted-foreground">—</span>}
                        {p.job_title && <div className="text-xs text-muted-foreground">{p.job_title}</div>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.phone || "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums">{taskCount.get(p.id) ?? 0}</TableCell>
                      <TableCell>
                        {canManageRoles && p.id !== user?.id ? (
                          <Select value={r} onValueChange={(v) => changeRole(p.id, v as typeof r)}>
                            <SelectTrigger className="w-[130px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt} value={opt} className="capitalize">
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="capitalize gap-1">
                            {r === "admin" && <ShieldCheck className="h-3 w-3" aria-hidden="true" />}
                            {r}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
