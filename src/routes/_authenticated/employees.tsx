import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments, useProfiles, useTasks, type Department, type Profile } from "@/hooks/useData";
import {
  createLocalDepartment,
  createLocalProfile,
  deleteLocalDepartment,
  deleteLocalProfile,
  listLocalProfiles,
  updateLocalDepartment,
  updateLocalProfile,
} from "@/lib/localTaskStore";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { profiles, refresh } = useProfiles();
  const { tasks } = useTasks();
  const { departments, refresh: refreshDepartments } = useDepartments();
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [departmentsOpen, setDepartmentsOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("manage") === "departments") setDepartmentsOpen(true);
  }, []);

  const departmentNames = useMemo(() => departments.map((department) => department.name), [departments]);
  const departmentUsage = useMemo(() => {
    const counts = new Map<string, DepartmentUsage>();
    const ensure = (name: string) => {
      const key = name.toLowerCase();
      const existing = counts.get(key);
      if (existing) return existing;
      const next = { employees: 0, tasks: 0, planner: 0 };
      counts.set(key, next);
      return next;
    };

    for (const profile of profiles) {
      if (profile.department) ensure(profile.department).employees += 1;
    }
    for (const task of tasks) {
      if (!task.department) continue;
      const usage = ensure(task.department);
      usage.tasks += 1;
      if (task.scheduled_date || task.due_date) usage.planner += 1;
    }
    return counts;
  }, [profiles, tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        if (departmentFilter !== "all" && profile.department !== departmentFilter) return false;
        if (!q) return true;
        return [
          profile.full_name ?? "",
          profile.email ?? "",
          profile.phone ?? "",
          profile.job_title ?? "",
          profile.department ?? "",
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  }, [profiles, query, departmentFilter]);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (profile: Profile) => {
    setEditing(profile);
    setDialogOpen(true);
  };

  const handleDelete = async (profile: Profile) => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || isLocalProfile(profile)) {
      if (!deleteLocalProfile(profile.id)) {
        toast.error("Default local user cannot be deleted");
        return;
      }
      await refresh();
      toast.success("Employee removed");
      return;
    }

    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      await refresh();
      toast.success("Employee removed");
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Employees</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage personnel for task assignment</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="w-fit" onClick={() => setDepartmentsOpen(true)}>
            Manage Departments
          </Button>
          <Button className="w-fit shadow-elevated" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </section>

      <Card className="rounded-xl shadow-elevated">
        <CardContent className="p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_36px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search employees"
                placeholder="Search by name, username, or mobile..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentNames.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Refresh employees"
              onClick={async () => {
                await refresh();
                toast.success("Employee list refreshed");
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-xl shadow-elevated">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-muted/35 hover:bg-muted/35">
                  <TableHead className="w-[28%]">Name</TableHead>
                  <TableHead>Display Username</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                      No employees found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((profile) => (
                  <TableRow key={profile.id} className="h-14">
                    <TableCell className="font-semibold">{profile.full_name || profile.email}</TableCell>
                    <TableCell className="text-sm">{profile.job_title || displayUsername(profile)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{profile.phone || "--"}</TableCell>
                    <TableCell>
                      {profile.department ? (
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/10">
                          {profile.department}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Edit employee" onClick={() => openEdit(profile)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete employee"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(profile)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={editing}
        departments={departmentNames}
        onSaved={refresh}
      />
      <DepartmentsDialog
        open={departmentsOpen}
        onOpenChange={setDepartmentsOpen}
        departments={departments}
        usage={departmentUsage}
        onViewEmployees={(department) => {
          setDepartmentFilter(department);
          setDepartmentsOpen(false);
        }}
        onSaved={async () => {
          await refreshDepartments();
          await refresh();
        }}
      />
    </div>
  );
}

function DepartmentsDialog({
  open,
  onOpenChange,
  departments,
  usage,
  onViewEmployees,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  usage: Map<string, DepartmentUsage>;
  onViewEmployees: (department: string) => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<Department | null>(null);
  const totalUsage = useMemo(
    () => departments.reduce((sum, department) => sum + totalDepartmentUsage(usageForDepartment(usage, department.name)), 0),
    [departments, usage],
  );

  useEffect(() => {
    setName(editing?.name ?? "");
  }, [editing]);

  const reset = () => {
    setName("");
    setEditing(null);
  };

  const saveDepartment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) {
      toast.error("Department name is required");
      return;
    }

    const duplicate = departments.some((department) => department.id !== editing?.id && department.name.toLowerCase() === clean.toLowerCase());
    if (duplicate) {
      toast.error("Department already exists");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      if (editing) updateLocalDepartment(editing.id, clean);
      else createLocalDepartment(clean);
      await onSaved();
      toast.success(editing ? "Department updated" : "Department added");
      reset();
      return;
    }

    const request = editing
      ? supabase.from("departments").update({ name: clean }).eq("id", editing.id)
      : supabase.from("departments").insert({ name: clean });
    const { error } = await request;
    if (error) {
      toast.error(error.message);
      return;
    }
    await onSaved();
    toast.success(editing ? "Department updated" : "Department added");
    reset();
  };

  const removeDepartment = async (department: Department) => {
    const currentUsage = usageForDepartment(usage, department.name);
    if (totalDepartmentUsage(currentUsage) > 0) {
      toast.error("This department is in use. Move employees/tasks first, then delete.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session || department.id.startsWith("local-department-")) {
      deleteLocalDepartment(department.id);
      await onSaved();
      toast.success("Department removed");
      return;
    }

    const { error } = await supabase.from("departments").delete().eq("id", department.id);
    if (error) toast.error(error.message);
    else {
      await onSaved();
      toast.success("Department removed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b bg-background px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>Manage Departments</DialogTitle>
              <DialogDescription>Add departments used by employees, tasks, and planner entries.</DialogDescription>
            </div>
            <div className="shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-right">
              <p className="text-xl font-semibold tabular-nums">{departments.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Departments</p>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-2 sm:grid-cols-4">
            <DepartmentStat label="Total" value={departments.length} />
            <DepartmentStat label="Employees" value={sumDepartmentUsage(usage, "employees")} />
            <DepartmentStat label="Tasks" value={sumDepartmentUsage(usage, "tasks")} />
            <DepartmentStat label="Planner" value={sumDepartmentUsage(usage, "planner")} />
          </div>

          <form onSubmit={saveDepartment} className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Department name"
              className="bg-background"
            />
            <Button type="submit">{editing ? "Save" : "Add"}</Button>
          </form>

          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {departments.map((department) => (
              <div key={department.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{department.name}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <UsageBadge label="Employees" value={usageForDepartment(usage, department.name).employees} />
                      <UsageBadge label="Tasks" value={usageForDepartment(usage, department.name).tasks} />
                      <UsageBadge label="Planner" value={usageForDepartment(usage, department.name).planner} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon" aria-label="Edit department" onClick={() => setEditing(department)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Delete department"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeDepartment(department)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => onViewEmployees(department.name)}>
                    Employees
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/tasks" search={{ department: department.name }}>
                      Tasks
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/planner">
                      Planner
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                No departments added yet.
              </div>
            )}
          </div>
          {totalUsage > 0 && (
            <p className="text-xs text-muted-foreground">
              Delete is blocked while a department is used by employees, tasks, or planner entries.
            </p>
          )}
        </div>
        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DepartmentUsage = {
  employees: number;
  tasks: number;
  planner: number;
};

function DepartmentStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function UsageBadge({ label, value }: { label: string; value: number }) {
  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted">
      {label}: {value}
    </Badge>
  );
}

function usageForDepartment(usage: Map<string, DepartmentUsage>, department: string) {
  return usage.get(department.toLowerCase()) ?? { employees: 0, tasks: 0, planner: 0 };
}

function totalDepartmentUsage(usage: DepartmentUsage) {
  return usage.employees + usage.tasks + usage.planner;
}

function sumDepartmentUsage(usage: Map<string, DepartmentUsage>, key: keyof DepartmentUsage) {
  return Array.from(usage.values()).reduce((sum, item) => sum + item[key], 0);
}

function EmployeeDialog({
  open,
  onOpenChange,
  employee,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Profile | null;
  departments: string[];
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    job_title: "",
    department: "",
  });

  useEffect(() => {
    setForm({
      full_name: employee?.full_name ?? "",
      email: employee?.email ?? "",
      phone: employee?.phone ?? "",
      job_title: employee?.job_title ?? "",
      department: employee?.department ?? "",
    });
  }, [employee, open]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.full_name.trim();
    const phone = form.phone.replace(/\D/g, "");
    const username = form.job_title.trim();

    if (!name) {
      toast.error("Employee name is required");
      return;
    }
    if (phone && phone.length !== 10) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    const payload = {
      id: employee?.id ?? crypto.randomUUID(),
      full_name: name,
      email: form.email || emailForEmployee(name, username),
      phone: phone || null,
      job_title: username || null,
      department: form.department || null,
    };

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      toast.error(sessionError.message);
      return;
    }
    const backendMode = !!sessionData.session;

    if (!employee) {
      if (backendMode) {
        const { error } = await supabase.from("profiles").insert(payload);
        if (error) {
          toast.error(error.message);
          return;
        }
      } else {
        createLocalProfile(payload);
      }
      await onSaved();
      toast.success("Employee added");
      onOpenChange(false);
      return;
    }

    if (!backendMode || isLocalProfile(employee)) {
      updateLocalProfile(employee.id, payload);
      await onSaved();
      toast.success("Employee updated");
      onOpenChange(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", employee.id);
    if (error) toast.error(error.message);
    else {
      await onSaved();
      toast.success("Employee updated");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="px-6 pt-6 text-xl">{employee ? "Edit Employee" : "New Employee"}</DialogTitle>
          <DialogDescription className="sr-only">
            {employee ? "Update personnel details for task assignment." : "Add employee details to the personnel register."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="employee-name">Name *</FieldLabel>
            <Input
              id="employee-name"
              value={form.full_name}
              onChange={(event) => setForm({ ...form, full_name: event.target.value })}
              placeholder="Employee Full Name"
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="employee-phone">Mobile Number *</FieldLabel>
            <Input
              id="employee-phone"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              placeholder="10-digit mobile number"
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel htmlFor="employee-username">Display Username *</FieldLabel>
            <Input
              id="employee-username"
              value={form.job_title}
              onChange={(event) => setForm({ ...form, job_title: event.target.value })}
              placeholder="Username"
              className="bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Department (Optional)</FieldLabel>
            <Select value={form.department || "none"} onValueChange={(value) => setForm({ ...form, department: value === "none" ? "" : value })}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-2 pt-2 sm:space-x-0">
            <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="h-11">{employee ? "Save Changes" : "Add Employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function displayUsername(profile: Profile) {
  return profile.email.split("@")[0] || "--";
}

function isLocalProfile(profile: Profile) {
  return listLocalProfiles().some((item) => item.id === profile.id);
}

function emailForEmployee(name: string, username: string) {
  const base = (username || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${base || crypto.randomUUID()}@local.employee`;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </Label>
  );
}
