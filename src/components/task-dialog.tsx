import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarDays, ChevronDown, ChevronRight, ClipboardList, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useDepartments, type Profile, type Task, type TaskPriority, type TaskStatus } from "@/hooks/useData";
import { deleteTaskCalendarEvent, syncTaskCalendar } from "@/lib/googleCalendar";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  employees: Profile[];
  task?: Task | null;
  defaultDate?: string | null;
  onSaved?: () => void | Promise<void>;
}

const schema = z.object({
  title: z.string().trim().min(2, "Task description required").max(200),
  description: z.string().trim().min(2, "Task description required").max(2000),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "blocked", "done"]),
  assignee_id: z.string().uuid().nullable(),
  due_date: z.string().nullable(),
  due_time: z.string().nullable(),
  scheduled_date: z.string().nullable(),
  department: z.string().trim().max(100).nullable(),
  calendar_sync_enabled: z.boolean(),
});

export function TaskDialog({
  open,
  onOpenChange,
  currentUserId,
  employees,
  task,
  defaultDate,
  onSaved,
}: TaskDialogProps) {
  const isEdit = !!task;
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    agency: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    assignee_id: null as string | null,
    second_assignee: "",
    time_given_days: "",
    due_date: null as string | null,
    scheduled_date: null as string | null,
    department: null as string | null,
    steno_note: "",
    remarks: "",
    mark_today: false,
    calendar_sync_enabled: false,
  });

  const employeeOptions = useMemo(() => mergeEmployees(employees), [employees, open]);
  const { departments } = useDepartments(employeeOptions.map((employee) => employee.department));

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description || task.title,
        agency: "",
        priority: task.priority,
        status: task.status,
        assignee_id: task.assignee_id,
        second_assignee: "",
        time_given_days: "",
        due_date: task.due_date,
        scheduled_date: task.scheduled_date,
        department: task.department,
        steno_note: "",
        remarks: "",
        mark_today: false,
        calendar_sync_enabled: task.calendar_sync_enabled,
      });
      setShowAdvanced(true);
    } else {
      setForm({
        title: "",
        description: "",
        agency: "",
        priority: "medium",
        status: "todo",
        assignee_id: null,
        second_assignee: "",
        time_given_days: "",
        due_date: null,
        scheduled_date: defaultDate ?? null,
        department: null,
        steno_note: "",
        remarks: "",
        mark_today: false,
        calendar_sync_enabled: false,
      });
      setShowAdvanced(false);
    }
  }, [task, defaultDate, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title || titleFromDescription(form.description);
    const scheduledDate = form.mark_today ? format(new Date(), "yyyy-MM-dd") : form.scheduled_date;
    const dueDate = form.due_date || dueDateFromDays(form.time_given_days);
    const description = composeDescription(form.description, form.steno_note, form.remarks, form.agency, form.second_assignee);

    const parsed = schema.safeParse({
      title,
      description,
      priority: form.priority,
      status: form.status,
      assignee_id: form.assignee_id,
      due_date: dueDate,
      due_time: null,
      scheduled_date: scheduledDate,
      department: form.department === "None (General)" ? null : form.department,
      calendar_sync_enabled: form.calendar_sync_enabled,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Please sign in before saving tasks.");

      const payload = {
        ...parsed.data,
        created_by: userId,
      };

      if (isEdit && task) {
        const updatePayload = {
          ...parsed.data,
          completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
        };

        const { data, error } = await supabase
          .from("tasks")
          .update(updatePayload)
          .eq("id", task.id)
          .select("id,title,created_at,updated_at")
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error("Task update did not return a task id.");

        await logTaskAudit(data.id, userId, "task_updated", { calendar_sync_enabled: parsed.data.calendar_sync_enabled });
        await syncCalendarAfterSave(data.id, parsed.data.calendar_sync_enabled, task.calendar_sync_enabled);
        await onSaved?.();
        toast.success("Task updated");
      } else {
        const { data, error } = await supabase
          .from("tasks")
          .insert(payload)
          .select("id,title,created_at,updated_at")
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error("Task insert did not return a task id.");

        await logTaskAudit(data.id, userId, "task_created", { calendar_sync_enabled: parsed.data.calendar_sync_enabled });
        await syncCalendarAfterSave(data.id, parsed.data.calendar_sync_enabled, false);
        await onSaved?.();
        toast.success("Task created");
      }
      onOpenChange(false);
    } catch (error) {
      console.error("[Task Save] failed", error);
      toast.error(error instanceof Error ? error.message : "Task save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95dvh] w-[calc(100vw-1rem)] overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>{isEdit ? "Edit Task" : "New Task"}</DialogTitle>
              <DialogDescription>{isEdit ? "Update task details." : "Add a new task to track."}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="max-h-[78vh] overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="task-description">Task Description</FieldLabel>
              <Textarea
                id="task-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value, title: titleFromDescription(e.target.value) })}
                rows={4}
                maxLength={2000}
                placeholder="Describe the objective or task in detail..."
                className="resize-none bg-background focus-visible:ring-primary"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="agency">Other Agency</FieldLabel>
                <Input
                  id="agency"
                  value={form.agency}
                  onChange={(e) => setForm({ ...form, agency: e.target.value })}
                  placeholder="e.g. PWD, ZP, NIC"
                  className="bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Department</FieldLabel>
                <Select value={form.department ?? "None (General)"} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map((department) => (
                      <SelectItem key={department.id} value={department.name}>
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <FieldLabel>Assigned Employee</FieldLabel>
                <Select value={form.assignee_id ?? "none"} onValueChange={(v) => setForm({ ...form, assignee_id: v === "none" ? null : v })}>
                  <SelectTrigger className="bg-background">
                    <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Search by name or designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employeeOptions.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name || employee.job_title || employee.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <FieldLabel htmlFor="second-assignee">Second Assignee</FieldLabel>
                <Input
                  id="second-assignee"
                  value={form.second_assignee}
                  onChange={(e) => setForm({ ...form, second_assignee: e.target.value })}
                  placeholder="Optional"
                  className="bg-background"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <FieldLabel htmlFor="due-date">Due Date</FieldLabel>
              <Input
                id="due-date"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
                className="bg-background"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-3 text-sm font-medium shadow-sm">
              <Checkbox
                checked={form.calendar_sync_enabled}
                onCheckedChange={(checked) => setForm({ ...form, calendar_sync_enabled: checked === true })}
              />
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Sync with Google Calendar
              </span>
            </label>

            <button
              type="button"
              className="flex items-center gap-2 text-sm font-semibold text-primary"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Status</FieldLabel>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="done">Completed</SelectItem>
                        <SelectItem value="blocked">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel>Priority</FieldLabel>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Important</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="steno-note">Steno / Follow-up Note</FieldLabel>
                  <Textarea
                    id="steno-note"
                    value={form.steno_note}
                    onChange={(e) => setForm({ ...form, steno_note: e.target.value })}
                    placeholder="Notes for secretary/steno..."
                    rows={3}
                    className="resize-none bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel htmlFor="remarks">Remarks</FieldLabel>
                  <Input
                    id="remarks"
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                    placeholder="Any additional remarks..."
                    className="bg-background"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-background px-3 py-3 text-sm font-medium">
                  <Checkbox
                    checked={form.mark_today}
                    onCheckedChange={(checked) => setForm({ ...form, mark_today: checked === true })}
                  />
                  Mark as Today
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2 sm:justify-between">
            <Button type="button" variant="secondary" className="h-11 w-full rounded-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="h-11 w-full rounded-full shadow-elevated">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function mergeEmployees(primary: Profile[]) {
  const byId = new Map<string, Profile>();
  for (const employee of primary) byId.set(employee.id, employee);
  return Array.from(byId.values()).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label htmlFor={htmlFor} className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </Label>
  );
}

function titleFromDescription(description: string) {
  const clean = description.trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}

function dueDateFromDays(days: string) {
  const value = Number(days);
  if (!Number.isFinite(value) || value < 0) return null;
  return format(addDays(new Date(), value), "yyyy-MM-dd");
}

function composeDescription(description: string, note: string, remarks: string, agency: string, secondAssignee: string) {
  const extra = [
    agency ? `Other Agency: ${agency}` : "",
    secondAssignee ? `Second Assignee: ${secondAssignee}` : "",
    note ? `Steno / Follow-up Note: ${note}` : "",
    remarks ? `Remarks: ${remarks}` : "",
  ].filter(Boolean);
  return extra.length ? `${description.trim()}\n\n${extra.join("\n")}` : description.trim();
}

async function syncCalendarAfterSave(taskId: string, syncEnabled: boolean, wasSynced: boolean) {
  try {
    if (syncEnabled) {
      await syncTaskCalendar(taskId);
      toast.success("Google Calendar synced");
    } else if (wasSynced) {
      await deleteTaskCalendarEvent(taskId);
      toast.success("Google Calendar event removed");
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Google Calendar sync failed");
  }
}

async function logTaskAudit(
  taskId: string,
  actorId: string,
  action: "task_created" | "task_updated",
  metadata: Record<string, unknown>,
) {
  const modernPayload = {
    task_id: taskId,
    action_type: action,
    old_value: null,
    new_value: metadata,
    performed_by: actorId,
  };
  const modern = await supabase.from("task_audit_logs").insert(modernPayload);
  if (!modern.error) return;

  console.warn("[Task Audit] modern audit insert failed, trying legacy shape", modern.error);
  const legacy = await supabase.from("task_audit_logs").insert({
    task_id: taskId,
    actor_id: actorId,
    action,
    metadata,
  });
  if (legacy.error) {
    console.warn("[Task Audit] legacy audit insert failed", legacy.error);
  }
}
