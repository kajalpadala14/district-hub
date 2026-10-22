import { useEffect, useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { CalendarDays, Check, ChevronDown, ChevronRight, ClipboardList, Plus, Search, X } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import {
  useDepartments,
  type Profile,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/hooks/useData";
import { deleteTaskCalendarEvent, syncTaskCalendar } from "@/lib/googleCalendar";
import { cn } from "@/lib/utils";

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
  assignee_id: z.string({ invalid_type_error: "Primary Owner required" }).uuid("Primary Owner required"),
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
    additional_assignee_ids: [] as string[],
    time_given_days: "",
    due_date: null as string | null,
    scheduled_date: null as string | null,
    department: null as string | null,
    steno_note: "",
    remarks: "",
    mark_today: false,
    calendar_sync_enabled: false,
  });

  const employeeOptions = useMemo(() => mergeEmployees(employees), [employees]);
  const { departments } = useDepartments(employeeOptions.map((employee) => employee.department));

  const activeDepartment =
    form.department && form.department !== "None (General)" ? form.department : null;

  const { departmentEmployees, otherEmployees } = useMemo(() => {
    if (!activeDepartment) {
      return { departmentEmployees: employeeOptions, otherEmployees: [] };
    }
    const matching: Profile[] = [];
    const others: Profile[] = [];
    for (const emp of employeeOptions) {
      if (isEmployeeMatchingDepartment(emp, activeDepartment)) {
        matching.push(emp);
      } else {
        others.push(emp);
      }
    }
    return { departmentEmployees: matching, otherEmployees: others };
  }, [employeeOptions, activeDepartment]);

  const handleDepartmentChange = (newDept: string | null) => {
    const selectedDept = newDept === "None (General)" ? null : newDept;
    const matching = selectedDept
      ? employeeOptions.filter((emp) => isEmployeeMatchingDepartment(emp, selectedDept))
      : [];

    setForm((prev) => {
      let nextAssigneeId = prev.assignee_id;
      const currentAssigneeMatches = prev.assignee_id
        ? matching.some((emp) => emp.id === prev.assignee_id)
        : false;

      // When a department is selected and current assignee does not match it:
      // Auto-suggest the first matching employee if available
      if (selectedDept && matching.length > 0 && !currentAssigneeMatches) {
        nextAssigneeId = matching[0].id;
      }

      return {
        ...prev,
        department: selectedDept,
        assignee_id: nextAssigneeId,
        additional_assignee_ids: prev.additional_assignee_ids.filter((id) => id !== nextAssigneeId),
      };
    });
  };

  const handleAssigneeChange = (assigneeId: string) => {
    const selectedEmp = employeeOptions.find((emp) => emp.id === assigneeId);
    setForm((prev) => {
      let nextDepartment = prev.department;
      // If department is not selected or General, auto-set to employee's department
      if ((!prev.department || prev.department === "None (General)") && selectedEmp?.department) {
        nextDepartment = selectedEmp.department;
      }
      return {
        ...prev,
        assignee_id: assigneeId,
        department: nextDepartment,
        additional_assignee_ids: prev.additional_assignee_ids.filter((id) => id !== assigneeId),
      };
    });
  };

  useEffect(() => {
    if (task) {
      const parsedDescription = parseDescriptionMetadata(task.description || task.title, employeeOptions);
      setForm({
        title: task.title,
        description: parsedDescription.description,
        agency: task.agency || parsedDescription.agency || "",
        priority: task.priority,
        status: task.status,
        assignee_id: task.assignee_id,
        additional_assignee_ids: parsedDescription.additionalAssigneeIds.filter((id) => id !== task.assignee_id),
        time_given_days: "",
        due_date: task.due_date,
        scheduled_date: task.scheduled_date,
        department: task.department,
        steno_note: parsedDescription.stenoNote || "",
        remarks: parsedDescription.remarks || "",
        mark_today: false,
        calendar_sync_enabled: task.calendar_sync_enabled,
      });

      if (!parsedDescription.stenoNote && task.id) {
        supabase
          .from("task_comments")
          .select("comment")
          .eq("task_id", task.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .then(({ data }) => {
            if (data && data.length > 0 && data[0].comment) {
              setForm((prev) => ({
                ...prev,
                steno_note: prev.steno_note || data[0].comment,
              }));
            }
          });
      }

      setShowAdvanced(true);
    } else {
      setForm({
        title: "",
        description: "",
        agency: "",
        priority: "medium",
        status: "todo",
        assignee_id: null,
        additional_assignee_ids: [],
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
  }, [task, defaultDate, open, employeeOptions]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = form.title || titleFromDescription(form.description);
    const scheduledDate = form.mark_today ? format(new Date(), "yyyy-MM-dd") : form.scheduled_date;
    const dueDate = form.due_date || dueDateFromDays(form.time_given_days);
    const description = composeDescription(
      form.description,
      form.steno_note,
      form.remarks,
      form.agency,
      assigneeNamesFor(form.additional_assignee_ids, employeeOptions),
    );

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
      const session = sessionData.session;
      const userId = session?.user.id;
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

        const data = await saveTaskViaApi(
          session.access_token,
          { ...updatePayload, id: task.id },
          "PUT",
        );
        if (!data?.id) throw new Error("Task update did not return a task id.");

        await logTaskAudit(data.id, userId, "task_updated", {
          calendar_sync_enabled: parsed.data.calendar_sync_enabled,
        });
        await syncCalendarAfterSave(
          data.id,
          parsed.data.calendar_sync_enabled,
          task.calendar_sync_enabled,
        );

        const note = form.steno_note.trim();
        if (note) {
          const { data: existingComments } = await supabase
            .from("task_comments")
            .select("id")
            .eq("task_id", data.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (existingComments && existingComments.length > 0) {
            await supabase
              .from("task_comments")
              .update({ comment: note })
              .eq("id", existingComments[0].id);
          } else {
            await supabase.from("task_comments").insert({
              task_id: data.id,
              comment: note,
              commented_by: userId,
            });
          }
        } else {
          // Follow-up note was cleared/deleted
          await supabase.from("task_comments").delete().eq("task_id", data.id);
        }

        await onSaved?.();
        toast.success("Task updated");
      } else {
        const data = await saveTaskViaApi(session.access_token, payload, "POST");
        if (!data?.id) throw new Error("Task insert did not return a task id.");

        await logTaskAudit(data.id, userId, "task_created", {
          calendar_sync_enabled: parsed.data.calendar_sync_enabled,
        });
        await syncCalendarAfterSave(data.id, parsed.data.calendar_sync_enabled, false);

        const note = form.steno_note.trim();
        if (note) {
          await supabase.from("task_comments").insert({
            task_id: data.id,
            comment: note,
            commented_by: userId,
          });
        }

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
              <DialogDescription>
                {isEdit ? "Update task details." : "Add a new task to track."}
              </DialogDescription>
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    description: e.target.value,
                    title: titleFromDescription(e.target.value),
                  })
                }
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
                <Select
                  value={form.department ?? "None (General)"}
                  onValueChange={handleDepartmentChange}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None (General)">None (General)</SelectItem>
                    {departments
                      .filter((d) => d.name && d.name !== "None (General)")
                      .map((department) => (
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
                <div className="flex items-center justify-between">
                  <FieldLabel>Assigned Employee</FieldLabel>
                  {activeDepartment && (
                    <span className="text-[10px] font-semibold text-primary">
                      {departmentEmployees.length > 0
                        ? `${departmentEmployees.length} in ${activeDepartment}`
                        : `No staff in ${activeDepartment}`}
                    </span>
                  )}
                </div>
                <Select
                  value={form.assignee_id ?? undefined}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="bg-background">
                    <Search className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue placeholder="Select Assigned Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDepartment && departmentEmployees.length > 0 ? (
                      <>
                        <SelectGroup>
                          <SelectLabel className="text-xs font-semibold text-primary">
                            ✨ Suggested for {activeDepartment} ({departmentEmployees.length})
                          </SelectLabel>
                          {departmentEmployees.map((employee) => (
                            <SelectItem
                              key={employee.id}
                              value={employee.id}
                              textValue={employeeLabel(employee)}
                            >
                              <div className="flex flex-col py-0.5">
                                <span className="font-medium">{employeeLabel(employee)}</span>
                                {(employee.job_title || employee.department) && (
                                  <span className="text-xs text-muted-foreground font-normal">
                                    {[employee.job_title, employee.department].filter(Boolean).join(" • ")}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {otherEmployees.length > 0 && (
                          <>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel className="text-xs font-medium text-muted-foreground">
                                Other Employees ({otherEmployees.length})
                              </SelectLabel>
                              {otherEmployees.map((employee) => (
                                <SelectItem
                                  key={employee.id}
                                  value={employee.id}
                                  textValue={employeeLabel(employee)}
                                >
                                  <div className="flex flex-col py-0.5">
                                    <span>{employeeLabel(employee)}</span>
                                    {(employee.job_title || employee.department) && (
                                      <span className="text-xs text-muted-foreground font-normal">
                                        {[employee.job_title, employee.department].filter(Boolean).join(" • ")}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </>
                        )}
                      </>
                    ) : (
                      <SelectGroup>
                        {employeeOptions.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.id}
                            textValue={employeeLabel(employee)}
                          >
                            <div className="flex flex-col py-0.5">
                              <span className="font-medium">{employeeLabel(employee)}</span>
                              {(employee.job_title || employee.department) && (
                                <span className="text-xs text-muted-foreground font-normal">
                                  {[employee.job_title, employee.department].filter(Boolean).join(" • ")}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>

                {activeDepartment && departmentEmployees.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      Suggested:
                    </span>
                    {departmentEmployees.slice(0, 4).map((emp) => {
                      const isSelected = form.assignee_id === emp.id;
                      return (
                        <Badge
                          key={emp.id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer text-xs transition-colors hover:bg-primary/20",
                            isSelected && "bg-primary text-primary-foreground hover:bg-primary",
                          )}
                          onClick={() => handleAssigneeChange(emp.id)}
                        >
                          {employeeLabel(emp)}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Additional Assignees</FieldLabel>
                <AdditionalAssigneesSelect
                  employees={employeeOptions}
                  selectedIds={form.additional_assignee_ids}
                  primaryOwnerId={form.assignee_id}
                  department={form.department}
                  onChange={(additional_assignee_ids) => setForm({ ...form, additional_assignee_ids })}
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
                onCheckedChange={(checked) =>
                  setForm({ ...form, calendar_sync_enabled: checked === true })
                }
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
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
            </button>

            {showAdvanced && (
              <div className="space-y-4 border-t pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel>Status</FieldLabel>
                    <Select
                      value={form.status}
                      onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
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
                    <Select
                      value={form.priority}
                      onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
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
                    onCheckedChange={(checked) =>
                      setForm({ ...form, mark_today: checked === true })
                    }
                  />
                  Mark as Today
                </label>
              </div>
            )}
          </div>

          <DialogFooter className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2 sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 w-full rounded-full shadow-elevated"
            >
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
  return Array.from(byId.values()).sort((a, b) =>
    (a.full_name || a.email).localeCompare(b.full_name || b.email),
  );
}

function AdditionalAssigneesSelect({
  employees,
  selectedIds,
  primaryOwnerId,
  department,
  onChange,
}: {
  employees: Profile[];
  selectedIds: string[];
  primaryOwnerId: string | null;
  department?: string | null;
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedEmployees = employees.filter((employee) => selectedIds.includes(employee.id));
  const availableEmployees = employees.filter((employee) => employee.id !== primaryOwnerId);
  const activeDepartment = department && department !== "None (General)" ? department : null;

  const { suggestedEmployees, otherEmployees } = useMemo(() => {
    if (!activeDepartment) {
      return { suggestedEmployees: [], otherEmployees: availableEmployees };
    }
    const suggested: Profile[] = [];
    const others: Profile[] = [];
    for (const emp of availableEmployees) {
      if (isEmployeeMatchingDepartment(emp, activeDepartment)) {
        suggested.push(emp);
      } else {
        others.push(emp);
      }
    }
    return { suggestedEmployees: suggested, otherEmployees: others };
  }, [availableEmployees, activeDepartment]);

  const toggleEmployee = (employeeId: string) => {
    onChange(
      selectedIds.includes(employeeId)
        ? selectedIds.filter((id) => id !== employeeId)
        : [...selectedIds, employeeId],
    );
  };

  const removeEmployee = (employeeId: string) => {
    onChange(selectedIds.filter((id) => id !== employeeId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          tabIndex={0}
          className="flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {selectedEmployees.length === 0 ? (
            <span className="text-muted-foreground">+ Add Employee</span>
          ) : (
            selectedEmployees.map((employee) => (
              <Badge key={employee.id} variant="secondary" className="gap-1 rounded-md px-2 py-1">
                <span className="max-w-32 truncate">{employeeLabel(employee)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${employeeLabel(employee)}`}
                  className="rounded-sm text-muted-foreground hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeEmployee(employee.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList>
            <CommandEmpty>No employees found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="+ Add Employee"
                onSelect={() => toast("Add employees from the Employees page.")}
              >
                <Plus className="h-4 w-4 text-primary" />
                + Add Employee
              </CommandItem>
            </CommandGroup>
            {suggestedEmployees.length > 0 && (
              <CommandGroup heading={`Suggested for ${activeDepartment} (${suggestedEmployees.length})`}>
                {suggestedEmployees.map((employee) => {
                  const selected = selectedIds.includes(employee.id);
                  return (
                    <CommandItem
                      key={employee.id}
                      value={`${employeeLabel(employee)} ${employee.job_title ?? ""} ${employee.department ?? ""} ${employee.email ?? ""}`}
                      onSelect={() => toggleEmployee(employee.id)}
                    >
                      <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      <div className="flex flex-col truncate">
                        <span className="truncate">{employeeLabel(employee)}</span>
                        {(employee.job_title || employee.department) && (
                          <span className="text-[11px] text-muted-foreground">
                            {[employee.job_title, employee.department].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            <CommandGroup heading={suggestedEmployees.length > 0 ? `Other Employees (${otherEmployees.length})` : "Employees"}>
              {otherEmployees.map((employee) => {
                const selected = selectedIds.includes(employee.id);
                return (
                  <CommandItem
                    key={employee.id}
                    value={`${employeeLabel(employee)} ${employee.job_title ?? ""} ${employee.department ?? ""} ${employee.email ?? ""}`}
                    onSelect={() => toggleEmployee(employee.id)}
                  >
                    <Check className={cn("h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                    <div className="flex flex-col truncate">
                      <span className="truncate">{employeeLabel(employee)}</span>
                      {(employee.job_title || employee.department) && (
                        <span className="text-[11px] text-muted-foreground">
                          {[employee.job_title, employee.department].filter(Boolean).join(" • ")}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function isEmployeeMatchingDepartment(
  employee: Profile,
  deptName: string | null | undefined,
): boolean {
  if (!deptName || deptName === "None (General)" || deptName === "all") return true;
  const targetDept = deptName.trim().toLowerCase();
  if (!targetDept) return true;

  const empDept = (employee.department ?? "").trim().toLowerCase();
  if (empDept) {
    if (empDept === targetDept || empDept.includes(targetDept) || targetDept.includes(empDept)) {
      return true;
    }
  }

  const jobTitle = (employee.job_title ?? "").trim().toLowerCase();
  if (jobTitle && (jobTitle === targetDept || jobTitle.includes(targetDept))) {
    return true;
  }

  return false;
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
    >
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

function composeDescription(
  description: string,
  note: string,
  remarks: string,
  agency: string,
  additionalAssignees: string[],
) {
  const extra = [
    agency ? `Other Agency: ${agency}` : "",
    additionalAssignees.length ? `Additional Assignees: ${additionalAssignees.join(", ")}` : "",
    note ? `Steno / Follow-up Note: ${note}` : "",
    remarks ? `Remarks: ${remarks}` : "",
  ].filter(Boolean);
  return extra.length ? `${description.trim()}\n\n${extra.join("\n")}` : description.trim();
}

function employeeLabel(employee: Profile) {
  return employee.full_name || employee.job_title || employee.email || "Unnamed employee";
}

function assigneeNamesFor(ids: string[], employees: Profile[]) {
  return ids
    .map((id) => employees.find((employee) => employee.id === id))
    .filter((employee): employee is Profile => Boolean(employee))
    .map(employeeLabel);
}

function parseDescriptionMetadata(description: string, employees: Profile[]) {
  const employeeByName = new Map(
    employees.map((employee) => [employeeLabel(employee).trim().toLowerCase(), employee.id]),
  );
  const additionalAssigneeIds: string[] = [];
  let agency = "";
  let stenoNote = "";
  let remarks = "";

  const lines = description.split("\n").filter((line) => {
    const trimmed = line.trim();
    const assigneeMatch = trimmed.match(/^(Additional Assignees|Second Assignee):\s*(.+)$/i);
    if (assigneeMatch) {
      const names = assigneeMatch[2].split(",").map((name) => name.trim()).filter(Boolean);
      const ids = names.map((name) => employeeByName.get(name.toLowerCase()));
      if (ids.some((id) => !id)) return true;
      additionalAssigneeIds.push(...(ids as string[]));
      return false;
    }
    const noteMatch = trimmed.match(/^(?:Steno\s*\/\s*Follow-up Note|Follow-up Note|Steno Note|Follow-up):\s*(.+)$/i);
    if (noteMatch) {
      stenoNote = noteMatch[1].trim();
      return false;
    }
    const remarksMatch = trimmed.match(/^Remarks:\s*(.+)$/i);
    if (remarksMatch) {
      remarks = remarksMatch[1].trim();
      return false;
    }
    const agencyMatch = trimmed.match(/^(?:Other Agency|Agency):\s*(.+)$/i);
    if (agencyMatch) {
      agency = agencyMatch[1].trim();
      return false;
    }
    return true;
  });

  return {
    description: lines.join("\n").trim(),
    additionalAssigneeIds,
    stenoNote,
    remarks,
    agency,
  };
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

async function saveTaskViaApi(
  accessToken: string,
  payload: Record<string, unknown>,
  method: "POST" | "PUT",
) {
  const response = await fetch("/api/tasks", {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Task save failed");
  }

  const data = (await response.json()) as { task?: { id?: string } };
  return data.task;
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
