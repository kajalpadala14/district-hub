import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowDownUp,
  BadgeCheck,
  CalendarDays,
  CalendarClock,
  Check,
  Clock3,
  Download,
  FileImage,
  Flag,
  ListChecks,
  MapPin,
  Pencil,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { differenceInCalendarDays, format, isPast, isToday, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TaskDialog } from "@/components/task-dialog";
import { WhatsAppActionButton } from "@/components/whatsapp-action-button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments, useProfiles, useTasks, type Task, type TaskPriority, type TaskStatus } from "@/hooks/useData";
import {
  deleteTaskCalendarEvent,
  syncTaskCalendar,
} from "@/lib/googleCalendar";
import { isTaskItem, PLANNER_MEETING_TYPE_LINE } from "@/lib/taskClassification";
import { cn } from "@/lib/utils";
import { buildTaskWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksManagementPage,
});

type QuickFilter = "all" | "today" | "important";
type CommentsFilter = "all" | "with-comments" | "without-comments";
type SortMode = "latest" | "deadline" | "priority";
type BulkSelectValue = "keep" | "none" | string;

const statusLabels: Record<TaskStatus, string> = {
  todo: "Pending",
  in_progress: "In Progress",
  blocked: "Overdue",
  done: "Completed",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Normal",
  high: "High",
  urgent: "Important",
};

function TasksManagementPage() {
  const { user } = useAuth();
  const { tasks, error: tasksError, refresh: refreshTasks } = useTasks();
  const { profiles } = useProfiles();
  const { departments: departmentOptions } = useDepartments([
    ...tasks.map((task) => task.department),
    ...profiles.map((profile) => profile.department),
  ]);

  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agencyFilter, setAgencyFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [commentsFilter, setCommentsFilter] = useState<CommentsFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [meetingTask, setMeetingTask] = useState<Task | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<"keep" | TaskStatus>("keep");
  const [bulkPriority, setBulkPriority] = useState<"keep" | TaskPriority>("keep");
  const [bulkDepartment, setBulkDepartment] = useState<BulkSelectValue>("keep");
  const [bulkAssignee, setBulkAssignee] = useState<BulkSelectValue>("keep");
  const [bulkDueDate, setBulkDueDate] = useState("");
  const [bulkScheduledDate, setBulkScheduledDate] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  useEffect(() => {
    const department = new URLSearchParams(window.location.search).get("department");
    if (department) setDepartmentFilter(department);
  }, []);

  const taskItems = useMemo(() => tasks.filter(isTaskItem), [tasks]);
  const departments = useMemo(
    () => Array.from(new Set(taskItems.map((task) => task.department).filter(Boolean) as string[])).sort(),
    [taskItems],
  );
  const agencies = useMemo(
    () => Array.from(new Set(taskItems.map((task) => agencyFor(task)).filter(Boolean))).sort(),
    [taskItems],
  );

  const nameFor = (uid: string | null) => {
    if (!uid) return "Unassigned";
    const profile = profiles.find((item) => item.id === uid);
    return profile?.full_name || profile?.email || "Unknown";
  };

  const profileFor = (uid: string | null) => {
    if (!uid) return null;
    return profiles.find((item) => item.id === uid) ?? null;
  };

  const decoratedTasks = useMemo(() => {
    return taskItems.map((task) => ({
      task,
      agency: agencyFor(task),
      assignee: nameFor(task.assignee_id),
      assigneeProfile: profileFor(task.assignee_id),
      assignedBy: nameFor(task.created_by),
      displayStatus: displayStatusFor(task),
      comments: commentsFor(task),
    }));
  }, [taskItems, profiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return decoratedTasks
      .filter(({ task, agency, assignee, comments, displayStatus }) => {
        if (quickFilter === "today" && !isDateToday(task.due_date)) return false;
        if (quickFilter === "important" && task.priority !== "urgent") return false;
        if (statusFilter !== "all" && displayStatus !== statusFilter) return false;
        if (agencyFilter !== "all" && agency !== agencyFilter) return false;
        if (departmentFilter !== "all" && task.department !== departmentFilter) return false;
        if (commentsFilter === "with-comments" && comments === "No comments") return false;
        if (commentsFilter === "without-comments" && comments !== "No comments") return false;
        if (!q) return true;
        return [
          String(task.id ?? "").slice(0, 8),
          task.title ?? "",
          task.description ?? "",
          agency,
          task.department ?? "",
          assignee,
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => sortTasks(a.task, b.task, sortMode));
  }, [decoratedTasks, query, quickFilter, statusFilter, agencyFilter, departmentFilter, commentsFilter, sortMode]);

  useEffect(() => {
    setSelectedIds((ids) => ids.filter((id) => filtered.some((item) => item.task.id === id)));
  }, [filtered]);

  const completed = taskItems.filter((task) => task.status === "done").length;
  const overdue = taskItems.filter((task) => displayStatusFor(task) === "overdue").length;
  const pending = taskItems.filter((task) => task.status !== "done").length;
  const important = taskItems.filter((task) => task.priority === "urgent").length;

  const kpis = [
    { label: "Total Tasks", value: taskItems.length, icon: ListChecks, tone: "text-primary", bg: "bg-primary/10" },
    { label: "Completed", value: completed, icon: BadgeCheck, tone: "text-success", bg: "bg-success/10" },
    { label: "Pending", value: pending, icon: Clock3, tone: "text-info", bg: "bg-info/10" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, tone: "text-destructive", bg: "bg-destructive/10" },
    { label: "Important Tasks", value: important, icon: Star, tone: "text-warning-foreground", bg: "bg-warning/25" },
  ];

  const currentUserId = user?.id ?? "";
  const selectedTasks = useMemo(
    () => filtered.map((item) => item.task).filter((task) => selectedIds.includes(task.id)),
    [filtered, selectedIds],
  );
  const visibleIds = useMemo(() => filtered.map((item) => item.task.id), [filtered]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const toggleBulkMode = () => {
    setBulkMode((value) => {
      if (value) setSelectedIds([]);
      return !value;
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedIds((ids) => (ids.includes(taskId) ? ids.filter((id) => id !== taskId) : [...ids, taskId]));
  };

  const toggleAllVisible = () => {
    setSelectedIds((ids) => {
      if (allVisibleSelected) return ids.filter((id) => !visibleIds.includes(id));
      return Array.from(new Set([...ids, ...visibleIds]));
    });
  };

  const resetBulkFields = () => {
    setBulkStatus("keep");
    setBulkPriority("keep");
    setBulkDepartment("keep");
    setBulkAssignee("keep");
    setBulkDueDate("");
    setBulkScheduledDate("");
  };

  const applyBulkEdit = async () => {
    if (selectedTasks.length === 0) {
      toast.error("Select tasks first");
      return;
    }

    const updates: Partial<Pick<Task, "status" | "priority" | "department" | "assignee_id" | "due_date" | "scheduled_date" | "completed_at">> = {};
    if (bulkStatus !== "keep") {
      updates.status = bulkStatus;
      updates.completed_at = bulkStatus === "done" ? new Date().toISOString() : null;
    }
    if (bulkPriority !== "keep") updates.priority = bulkPriority;
    if (bulkDepartment !== "keep") updates.department = bulkDepartment === "none" ? null : bulkDepartment;
    if (bulkAssignee !== "keep") updates.assignee_id = bulkAssignee === "none" ? null : bulkAssignee;
    if (bulkDueDate) updates.due_date = bulkDueDate;
    if (bulkScheduledDate) updates.scheduled_date = bulkScheduledDate;

    if (Object.keys(updates).length === 0) {
      toast.error("Choose at least one field to update");
      return;
    }

    setBulkSaving(true);
    try {
      if (!currentUserId) throw new Error("Please sign in before updating tasks.");
      const { error } = await supabase.from("tasks").update(updates).in("id", selectedIds);
      if (error) throw error;
      await Promise.all(selectedTasks.map((task) => logTaskAudit(task.id, currentUserId, "task_updated", { bulk: true, updates })));
      await refreshTasks();

      toast.success(`${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} updated`);
      resetBulkFields();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  };

  const deleteSelectedTasks = async () => {
    if (selectedTasks.length === 0) return;
    setBulkSaving(true);
    try {
      if (!currentUserId) throw new Error("Please sign in before deleting tasks.");
      for (const task of selectedTasks) {
        if (task.google_calendar_event_id) {
          await deleteTaskCalendarEvent(task.id).catch((error) => {
            console.warn("[Bulk Delete] calendar delete failed", error);
          });
        }
      }
      await Promise.all(selectedTasks.map((task) => logTaskAudit(task.id, currentUserId, "task_deleted", { bulk: true, title: task.title })));
      const { error } = await supabase.from("tasks").delete().in("id", selectedIds);
      if (error) throw error;
      await refreshTasks();

      toast.success(`${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} deleted`);
      setSelectedIds([]);
      setBulkDeleteOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bulk delete failed");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleComplete = async (task: Task) => {
    if (!currentUserId) {
      toast.error("Please sign in before updating tasks.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logTaskAudit(task.id, currentUserId, "task_updated", { status: "done" });
    if (task.calendar_sync_enabled) await syncTaskSafely(task.id);
    toast.success("Task marked complete");
  };

  const handleDelete = async (task: Task) => {
    if (!currentUserId) {
      toast.error("Please sign in before deleting tasks.");
      return;
    }

    await logTaskAudit(task.id, currentUserId, "task_deleted", { title: task.title });
    if (task.google_calendar_event_id) {
      try {
        await deleteTaskCalendarEvent(task.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not remove Google Calendar event");
        return;
      }
    }
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) toast.error(error.message);
    else toast.success("Task deleted");
  };

  const handleExtendDeadline = async (task: Task, dueDate: string) => {
    if (!dueDate) {
      toast.error("Please select a deadline date");
      return;
    }

    if (!currentUserId) {
      toast.error("Please sign in before updating tasks.");
      return;
    }

    const { error } = await supabase.from("tasks").update({ due_date: dueDate }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logTaskAudit(task.id, currentUserId, "task_updated", { due_date: dueDate });
    if (task.calendar_sync_enabled) await syncTaskSafely(task.id);
    await refreshTasks();
    toast.success("Deadline updated");
  };

  const handleMarkImportant = async (task: Task) => {
    if (!currentUserId) {
      toast.error("Please sign in before updating tasks.");
      return;
    }

    const { error } = await supabase.from("tasks").update({ priority: "urgent" }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logTaskAudit(task.id, currentUserId, "task_updated", { priority: "urgent" });
    await refreshTasks();
    toast.success("Task marked important");
  };

  const handleFieldVisitNotepad = async (task: Task) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const note = [
      "Type: Field Visit",
      `Field Visit Notepad: ${task.department || "District field visit"}`,
      `Added On: ${format(new Date(), "MMM d, yyyy")}`,
    ].join("\n");
    const description = task.description?.includes("Field Visit Notepad")
      ? task.description
      : [task.description || task.title, note].filter(Boolean).join("\n\n");

    if (!currentUserId) {
      toast.error("Please sign in before updating tasks.");
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        description,
        scheduled_date: today,
        status: task.status === "done" ? task.status : "in_progress",
      })
      .eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logTaskAudit(task.id, currentUserId, "task_updated", { type: "field_visit_notepad", scheduled_date: today });
    await refreshTasks();
    toast.success("Added to Field Visit Notepad");
  };

  const handlePinTask = () => {
    toast.success("Task pinned for follow-up");
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("No tasks to export");
      return;
    }
    const rows = filtered.map(({ task, agency, assignee, assignedBy, comments, displayStatus }, index) => ({
      sno: index + 1,
      task_number: task.task_number ?? task.id.slice(0, 8),
      title: task.title,
      description: task.description ?? "",
      agency,
      department: task.department ?? "",
      assignee,
      assigned_by: assignedBy,
      allocated_date: formatDate(task.created_at),
      due_date: formatDate(task.due_date),
      scheduled_date: formatDate(task.scheduled_date),
      status: statusLabelForDisplay(displayStatus),
      priority: priorityLabels[task.priority],
      comments,
    }));
    downloadExcelWorkbook(rows, `tasks-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.xls`);
    toast.success(`${rows.length} task${rows.length === 1 ? "" : "s"} exported`);
  };

  const handleScheduleMeeting = (task: Task) => {
    setMeetingTask(task);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] min-w-0 space-y-5">
      <section className="flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage and track all assigned tasks</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button variant="outline" onClick={handleExport} className="justify-center">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant={bulkMode ? "default" : "outline"} onClick={toggleBulkMode} className="justify-center">
            <UsersRound className="h-4 w-4" />
            {bulkMode ? "Done Bulk" : "Bulk Edit"}
          </Button>
          <Button className="col-span-2 justify-center sm:col-span-1" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            New Task
          </Button>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        {kpis.map((item) => (
          <KpiCard key={item.label} {...item} />
        ))}
      </section>

      <Card className="min-w-0 shadow-card">
        <CardContent className="min-w-0 space-y-4 p-4">
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <QuickFilterButton active={quickFilter === "all"} onClick={() => setQuickFilter("all")}>
              All Tasks
            </QuickFilterButton>
            <QuickFilterButton active={quickFilter === "today"} onClick={() => setQuickFilter("today")}>
              Today
            </QuickFilterButton>
            <QuickFilterButton active={quickFilter === "important"} onClick={() => setQuickFilter("important")}>
              Important
            </QuickFilterButton>
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(240px,1.25fr)_repeat(5,minmax(130px,1fr))]">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search tasks"
                placeholder="Search tasks by number, agency, department or assignee"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <FilterSelect value={statusFilter} onValueChange={setStatusFilter} placeholder="Status filter">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </FilterSelect>
            <FilterSelect value={agencyFilter} onValueChange={setAgencyFilter} placeholder="Agency filter">
              <SelectItem value="all">All Agencies</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency} value={agency}>{agency}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={departmentFilter} onValueChange={setDepartmentFilter} placeholder="Department filter">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>{department}</SelectItem>
              ))}
            </FilterSelect>
            <FilterSelect value={commentsFilter} onValueChange={(value) => setCommentsFilter(value as CommentsFilter)} placeholder="Comments filter">
              <SelectItem value="all">All Comments</SelectItem>
              <SelectItem value="with-comments">With Comments</SelectItem>
              <SelectItem value="without-comments">Without Comments</SelectItem>
            </FilterSelect>
            <FilterSelect value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)} placeholder="Sort by Latest">
              <SelectItem value="latest">Sort by Latest</SelectItem>
              <SelectItem value="deadline">Deadline First</SelectItem>
              <SelectItem value="priority">Priority First</SelectItem>
            </FilterSelect>
          </div>
        </CardContent>
      </Card>

      {bulkMode && (
        <Card className="min-w-0 border-primary/25 shadow-card">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Bulk Edit</h3>
                <p className="text-xs text-muted-foreground">{selectedTasks.length} selected from current task register</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={toggleAllVisible}>
                  {allVisibleSelected ? "Clear Visible" : "Select Visible"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIds([])} disabled={selectedTasks.length === 0}>
                  Clear
                </Button>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <FilterSelect value={bulkStatus} onValueChange={(value) => setBulkStatus(value as "keep" | TaskStatus)} placeholder="Status">
                <SelectItem value="keep">Keep Status</SelectItem>
                <SelectItem value="todo">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Completed</SelectItem>
                <SelectItem value="blocked">Overdue</SelectItem>
              </FilterSelect>
              <FilterSelect value={bulkPriority} onValueChange={(value) => setBulkPriority(value as "keep" | TaskPriority)} placeholder="Priority">
                <SelectItem value="keep">Keep Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Important</SelectItem>
              </FilterSelect>
              <FilterSelect value={bulkDepartment} onValueChange={setBulkDepartment} placeholder="Department">
                <SelectItem value="keep">Keep Department</SelectItem>
                <SelectItem value="none">None</SelectItem>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.id} value={department.name}>{department.name}</SelectItem>
                ))}
              </FilterSelect>
              <FilterSelect value={bulkAssignee} onValueChange={setBulkAssignee} placeholder="Assignee">
                <SelectItem value="keep">Keep Assignee</SelectItem>
                <SelectItem value="none">Unassigned</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>{profile.full_name || profile.job_title || profile.email}</SelectItem>
                ))}
              </FilterSelect>
              <Input type="date" aria-label="Bulk due date" value={bulkDueDate} onChange={(event) => setBulkDueDate(event.target.value)} />
              <Input type="date" aria-label="Bulk scheduled date" value={bulkScheduledDate} onChange={(event) => setBulkScheduledDate(event.target.value)} />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetBulkFields} disabled={bulkSaving}>
                Reset Fields
              </Button>
              <Button type="button" onClick={applyBulkEdit} disabled={bulkSaving || selectedTasks.length === 0}>
                {bulkSaving ? "Saving..." : "Apply Changes"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-destructive/30 text-destructive hover:text-destructive"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkSaving || selectedTasks.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="min-w-0 overflow-hidden shadow-card">
        <CardContent className="p-0">
          <div className="border-b bg-primary-muted/40 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Task Register</h3>
                <p className="text-xs text-muted-foreground">{filtered.length} records shown</p>
                {tasksError && (
                  <p className="mt-1 text-xs font-medium text-destructive">{tasksError}</p>
                )}
              </div>
              <Badge variant="secondary" className="gap-1.5">
                <ArrowDownUp className="h-3.5 w-3.5" />
                {sortMode === "latest" ? "Latest first" : sortMode === "deadline" ? "Deadline first" : "Priority first"}
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 p-3 md:grid-cols-2 2xl:hidden">
            {filtered.length === 0 && (
              <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground md:col-span-2">
                No tasks found for the selected filters.
              </div>
            )}
            {filtered.map((item, index) => (
              <TaskMobileCard
                key={item.task.id}
                index={index}
                item={item}
                bulkMode={bulkMode}
                selected={selectedIds.includes(item.task.id)}
                onToggleSelected={toggleTaskSelection}
                onEdit={(task) => { setEditing(task); setDialogOpen(true); }}
                onScheduleMeeting={handleScheduleMeeting}
                onExtendDeadline={handleExtendDeadline}
                onFieldVisit={handleFieldVisitNotepad}
                onComplete={handleComplete}
                onMarkImportant={handleMarkImportant}
                onPin={handlePinTask}
                onDelete={handleDelete}
              />
            ))}
          </div>

          <div className="hidden max-w-full overflow-x-auto 2xl:block">
            <Table className="min-w-[1320px]">
              <TableHeader className="bg-muted/45">
                <TableRow>
                  {bulkMode && (
                    <TableHead className="w-12">
                      <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAllVisible} aria-label="Select all visible tasks" />
                    </TableHead>
                  )}
                  <TableHead className="w-12">S.No</TableHead>
                  <TableHead className="w-48">Task</TableHead>
                  <TableHead className="w-24">Due In</TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead className="w-64">Task Description</TableHead>
                  <TableHead className="w-36">Comments</TableHead>
                  <TableHead className="w-36">Assigned To</TableHead>
                  <TableHead className="w-36">Allocated Date</TableHead>
                  <TableHead className="w-28">Deadline</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-64 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={bulkMode ? 12 : 11} className="py-12 text-center text-sm text-muted-foreground">
                      No tasks found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map(({ task, assignee, assigneeProfile, assignedBy, agency, comments, displayStatus }, index) => (
                  <TableRow key={task.id} className="bg-card/70">
                    {bulkMode && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                          aria-label={`Select task ${index + 1}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium tabular-nums">{index + 1}</TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{task.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <PriorityBadge priority={task.priority} />
                          <Badge variant="outline" className="bg-primary/5 text-primary">{agency}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DueBadge task={task} />
                    </TableCell>
                    <TableCell>
                      <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
                        <FileImage className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {task.description || "No description added for this task."}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{comments}</span>
                    </TableCell>
                    <TableCell className="text-sm">{assignee}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(task.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(task.due_date)}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={displayStatus} />
                    </TableCell>
                    <TableCell>
                      <TaskActions
                        task={task}
                        assignee={assignee}
                        assigneeProfile={assigneeProfile}
                        assignedBy={assignedBy}
                        onEdit={(task) => { setEditing(task); setDialogOpen(true); }}
                        onScheduleMeeting={handleScheduleMeeting}
                        onExtendDeadline={handleExtendDeadline}
                        onFieldVisit={handleFieldVisitNotepad}
                        onComplete={handleComplete}
                        onMarkImportant={handleMarkImportant}
                        onPin={handlePinTask}
                        onDelete={handleDelete}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUserId={currentUserId}
        employees={profiles}
        task={editing}
        onSaved={refreshTasks}
      />
      <ScheduleMeetingSheet
        task={meetingTask}
        assignee={meetingTask ? nameFor(meetingTask.assignee_id) : ""}
        assigneeProfile={meetingTask ? profileFor(meetingTask.assignee_id) : null}
        department={meetingTask?.department ?? "None (General)"}
        departmentOptions={departmentOptions.map((department) => department.name)}
        currentUserId={currentUserId}
        open={!!meetingTask}
        onOpenChange={(open) => {
          if (!open) setMeetingTask(null);
        }}
        onSaved={refreshTasks}
      />
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected tasks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedTasks.length} selected task{selectedTasks.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkSaving}
              onClick={(event) => {
                event.preventDefault();
                void deleteSelectedTasks();
              }}
            >
              {bulkSaving ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  bg,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: string;
  bg: string;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold leading-none tabular-nums">{value}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", bg, tone)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickFilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      className={cn("w-full justify-center px-2 text-xs sm:w-auto sm:px-3 sm:text-sm", !active && "bg-card")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function FilterSelect({
  value,
  onValueChange,
  placeholder,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="min-w-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

function StatusPill({ status }: { status: "pending" | "in_progress" | "completed" | "overdue" }) {
  const styles = {
    pending: "bg-muted text-muted-foreground border-muted-foreground/20",
    in_progress: "bg-info/15 text-info border-info/30",
    completed: "bg-success/15 text-success border-success/30",
    overdue: "bg-destructive/15 text-destructive border-destructive/30",
  };
  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    overdue: "Overdue",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[status])}>
      {labels[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const styles: Record<TaskPriority, string> = {
    low: "bg-muted text-muted-foreground border-muted-foreground/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    high: "bg-warning/20 text-warning-foreground border-warning/40",
    urgent: "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[priority])}>
      {priorityLabels[priority]}
    </Badge>
  );
}

function DueBadge({ task }: { task: Task }) {
  const dueDate = safeParseDate(task.due_date);
  if (!dueDate) {
    return <span className="text-sm text-muted-foreground">No deadline</span>;
  }
  const days = differenceInCalendarDays(dueDate, new Date());
  if (task.status === "done") return <Badge variant="outline" className="bg-success/10 text-success">Completed</Badge>;
  if (days < 0) return <Badge variant="outline" className="bg-destructive/15 text-destructive">{Math.abs(days)}d overdue</Badge>;
  if (days === 0) return <Badge variant="outline" className="bg-warning/25 text-warning-foreground">Today</Badge>;
  return <Badge variant="outline" className="bg-primary/10 text-primary">{days}d left</Badge>;
}

type TaskListItem = {
  task: Task;
  agency: string;
  assignee: string;
  assigneeProfile: { phone?: string | null; department?: string | null } | null;
  assignedBy: string;
  displayStatus: "pending" | "in_progress" | "completed" | "overdue";
  comments: string;
};

type TaskActionHandlers = {
  onEdit: (task: Task) => void;
  onScheduleMeeting: (task: Task) => void;
  onExtendDeadline: (task: Task, dueDate: string) => void | Promise<void>;
  onFieldVisit: (task: Task) => void | Promise<void>;
  onComplete: (task: Task) => void | Promise<void>;
  onMarkImportant: (task: Task) => void | Promise<void>;
  onPin: () => void;
  onDelete: (task: Task) => void | Promise<void>;
};

function TaskMobileCard({
  index,
  item,
  bulkMode = false,
  selected = false,
  onToggleSelected,
  onEdit,
  onScheduleMeeting,
  onExtendDeadline,
  onFieldVisit,
  onComplete,
  onMarkImportant,
  onPin,
  onDelete,
}: {
  index: number;
  item: TaskListItem;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelected?: (taskId: string) => void;
} & TaskActionHandlers) {
  const { task, agency, assignee, assigneeProfile, assignedBy, comments, displayStatus } = item;
  return (
    <article className={cn("min-w-0 rounded-md border bg-card p-4 shadow-sm", selected && "border-primary/60 ring-2 ring-primary/15")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {bulkMode && (
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelected?.(task.id)}
                aria-label={`Select task ${index + 1}`}
              />
            )}
            <span className="rounded bg-muted px-2 py-1 text-xs font-semibold tabular-nums text-muted-foreground">
              #{index + 1}
            </span>
            <StatusPill status={displayStatus} />
          </div>
          <h4 className="mt-3 break-words text-base font-semibold leading-snug">{task.title}</h4>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground">
          <FileImage className="h-4 w-4" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <PriorityBadge priority={task.priority} />
        <Badge variant="outline" className="max-w-full bg-primary/5 text-primary">
          <span className="truncate">{agency}</span>
        </Badge>
        <DueBadge task={task} />
      </div>

      <p className="mt-3 line-clamp-3 break-words text-sm text-muted-foreground">
        {task.description || "No description added for this task."}
      </p>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <TaskMeta label="Assigned To" value={assignee} />
        <TaskMeta label="Allocated" value={formatDate(task.created_at)} />
        <TaskMeta label="Deadline" value={formatDate(task.due_date)} />
        <TaskMeta label="Comments" value={comments} />
      </div>

      <TaskActions
        task={task}
        assignee={assignee}
        assigneeProfile={assigneeProfile}
        assignedBy={assignedBy}
        onEdit={onEdit}
        onScheduleMeeting={onScheduleMeeting}
        onExtendDeadline={onExtendDeadline}
        onFieldVisit={onFieldVisit}
        onComplete={onComplete}
        onMarkImportant={onMarkImportant}
        onPin={onPin}
        onDelete={onDelete}
        className="mt-4 justify-start rounded-md bg-muted/25 p-1"
      />
    </article>
  );
}

function TaskMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-medium">{value}</p>
    </div>
  );
}

function TaskActions({
  task,
  assignee,
  assigneeProfile,
  assignedBy,
  onEdit,
  onScheduleMeeting,
  onExtendDeadline,
  onFieldVisit,
  onComplete,
  onMarkImportant,
  onPin,
  onDelete,
  className,
}: {
  task: Task;
  assignee: string;
  assigneeProfile: { phone?: string | null } | null;
  assignedBy: string;
  className?: string;
} & TaskActionHandlers) {
  return (
    <div className={cn("flex flex-wrap justify-end gap-1", className)}>
      <WhatsAppActionButton
        className="h-9 w-9 sm:h-8 sm:w-8"
        phone={assigneeProfile?.phone}
        message={buildTaskWhatsAppMessage({
          officerName: assignee,
          taskTitle: task.title,
          taskDescription: task.description || "No description added.",
          dueDate: formatDate(task.due_date),
          priority: priorityLabels[task.priority],
          status: statusLabels[task.status],
          assignedBy,
        })}
      />
      <IconAction label="Edit" icon={Pencil} onClick={() => onEdit(task)} />
      <IconAction label="Schedule Task Meeting" icon={CalendarDays} onClick={() => onScheduleMeeting(task)} />
      <DeadlineAction task={task} onSave={(dueDate) => onExtendDeadline(task, dueDate)} />
      <IconAction label="Add to Field Visit Notepad" icon={MapPin} onClick={() => onFieldVisit(task)} />
      <IconAction label="Complete" icon={Check} onClick={() => onComplete(task)} />
      <IconAction label="Mark Important" icon={Flag} onClick={() => onMarkImportant(task)} />
      <IconAction label="Pin Task" icon={Pin} onClick={onPin} />
      <IconAction label="Delete" icon={Trash2} destructive onClick={() => onDelete(task)} />
    </div>
  );
}

function IconAction({
  label,
  icon: Icon,
  destructive,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn("h-9 w-9 sm:h-8 sm:w-8", destructive && "text-destructive hover:text-destructive")}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function DeadlineAction({ task, onSave }: { task: Task; onSave: (dueDate: string) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(task.due_date ?? "");
  const [saving, setSaving] = useState(false);

  const saveDeadline = async () => {
    setSaving(true);
    try {
      await onSave(date);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Extend Deadline"
          title="Extend Deadline"
          className="h-9 w-9 text-muted-foreground hover:text-primary sm:h-8 sm:w-8"
        >
          <CalendarClock className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-72 rounded-2xl p-5 shadow-2xl">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Extend Deadline</p>
          </div>
          <Input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-12 rounded-xl text-base"
          />
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="h-11 rounded-xl shadow-elevated" disabled={saving} onClick={saveDeadline}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
      {children}
    </label>
  );
}

function ScheduleMeetingSheet({
  task,
  assignee,
  assigneeProfile,
  department,
  departmentOptions,
  currentUserId,
  open,
  onOpenChange,
  onSaved,
}: {
  task: Task | null;
  assignee: string;
  assigneeProfile: { phone?: string | null; department?: string | null } | null;
  department: string;
  departmentOptions: string[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void | Promise<void>;
}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState({
    title: "",
    date: today,
    time: "10:00",
    duration: "30m",
    department: "None (General)",
    venue: "",
    meetingWith: "",
    message: "",
  });

  useEffect(() => {
    if (!task) return;
    const taskDate = task.due_date ?? today;
    const meetingWith = assignee === "Unassigned" ? "" : assignee;
    const message = `Meeting to be scheduled with ${meetingWith || "assigned officer"} on ${formatDate(taskDate, "d MMMM yyyy")} at 10:00 AM on task "${task.title}"`;
    setForm({
      title: task.title,
      date: taskDate,
      time: "10:00",
      duration: "30m",
      department: department || assigneeProfile?.department || "None (General)",
      venue: "",
      meetingWith,
      message,
    });
  }, [task, assignee, assigneeProfile, department]);

  const handleSave = async () => {
    if (!task) return;
    const cleanDepartment = form.department === "None (General)" ? null : form.department;
    const description = [
      PLANNER_MEETING_TYPE_LINE,
      task.description ? `Task: ${task.description}` : `Task: ${task.title}`,
      form.duration ? `Duration: ${form.duration}` : "",
      form.venue ? `Venue: ${form.venue}` : "",
      form.meetingWith ? `Meeting With: ${form.meetingWith}` : "",
      form.message ? `Message: ${form.message}` : "",
      `Source Task ID: ${task.id}`,
    ].filter(Boolean).join("\n");
    const payload = {
      title: form.title.trim() || task.title,
      description,
      scheduled_date: form.date,
      due_date: form.date,
      due_time: form.time || null,
      department: cleanDepartment,
      assignee_id: task.assignee_id,
      status: "in_progress" as const,
      priority: "medium" as const,
      calendar_sync_enabled: false,
    };

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const createdBy = sessionData.session?.user.id ?? currentUserId;
      if (!createdBy) throw new Error("Please sign in before saving planner meetings.");
      const { error } = await supabase.from("tasks").insert({ ...payload, created_by: createdBy });
      if (error) throw error;
      await onSaved();
      toast.success("Department meeting added to planner");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Meeting save failed");
    }
  };

  const handleWhatsApp = () => {
    if (!assigneeProfile?.phone) {
      toast.error("Assigned officer does not have a valid WhatsApp mobile number.");
      return;
    }
    const url = buildWhatsAppUrl(assigneeProfile.phone, form.message);
    if (!url) {
      toast.error("Assigned officer does not have a valid WhatsApp mobile number.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-dvh w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b bg-primary-muted/40 px-4 py-5 sm:px-6">
          <SheetTitle>Schedule Task Meeting</SheetTitle>
          <SheetDescription>Create a planner slot from this row</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div className="space-y-1.5">
            <FieldLabel>Title</FieldLabel>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Date</FieldLabel>
              <Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Time</FieldLabel>
              <Input type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <FieldLabel>Duration</FieldLabel>
              <Select value={form.duration} onValueChange={(value) => setForm({ ...form, duration: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="30m">30m</SelectItem>
                  <SelectItem value="45m">45m</SelectItem>
                  <SelectItem value="60m">60m</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Department</FieldLabel>
              <Select value={form.department} onValueChange={(value) => setForm({ ...form, department: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["None (General)", ...departmentOptions, department]
                    .filter(Boolean)
                    .filter((value, index, list) => list.indexOf(value) === index)
                    .map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Venue</FieldLabel>
            <Input value={form.venue} onChange={(event) => setForm({ ...form, venue: event.target.value })} placeholder="Meeting room / location" />
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Meeting With</FieldLabel>
            <Input value={form.meetingWith} onChange={(event) => setForm({ ...form, meetingWith: event.target.value })} placeholder="Officer name" />
            {assigneeProfile?.phone && <p className="text-xs text-muted-foreground">Recipient mobile: {assigneeProfile.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Message Draft</FieldLabel>
            <Textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} rows={5} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" className="h-11" onClick={handleWhatsApp}>
              Send WhatsApp
            </Button>
            <Button type="button" className="h-11 shadow-elevated" onClick={handleSave}>
              Schedule Meeting
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function agencyFor(task: Task) {
  return task.department ? `${task.department} Agency` : "District Administration";
}

function formatDate(value: string | null | undefined, pattern = "MMM d, yyyy") {
  const date = safeParseDate(value);
  if (!date) return "Not set";
  return format(date, pattern);
}

function statusLabelForDisplay(status: "pending" | "in_progress" | "completed" | "overdue") {
  const labels = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    overdue: "Overdue",
  };
  return labels[status];
}

function downloadExcelWorkbook(rows: Array<Record<string, string | number>>, fileName: string) {
  const headers = [
    ["sno", "S.No"],
    ["task_number", "Task No"],
    ["title", "Task"],
    ["description", "Description"],
    ["agency", "Agency"],
    ["department", "Department"],
    ["assignee", "Assigned To"],
    ["assigned_by", "Assigned By"],
    ["allocated_date", "Allocated Date"],
    ["due_date", "Deadline"],
    ["scheduled_date", "Scheduled Date"],
    ["status", "Status"],
    ["priority", "Priority"],
    ["comments", "Comments"],
  ] as const;
  const headerHtml = headers.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("");
  const bodyHtml = rows
    .map((row) => `<tr>${headers.map(([key]) => `<td>${escapeHtml(row[key] ?? "")}</td>`).join("")}</tr>`)
    .join("");
  const workbook = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #4f2fd6; color: #ffffff; font-weight: 700; }
    th, td { border: 1px solid #d9dce7; padding: 6px 8px; vertical-align: top; }
    td { mso-number-format: "\\@"; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeParseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = parseISO(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isDateToday(value: string | null | undefined) {
  const date = safeParseDate(value);
  return date ? isToday(date) : false;
}

function isDatePast(value: string | null | undefined) {
  const date = safeParseDate(value);
  return date ? isPast(date) && !isToday(date) : false;
}

function timeForSort(value: string | null | undefined, fallback: number) {
  const date = safeParseDate(value);
  return date ? date.getTime() : fallback;
}

function commentsFor(task: Task) {
  if (task.status === "blocked") return "Needs review";
  if (task.priority === "urgent") return "Marked important";
  if (task.completed_at) return "Completion updated";
  return "No comments";
}

function displayStatusFor(task: Task): "pending" | "in_progress" | "completed" | "overdue" {
  if (task.status === "done") return "completed";
  if (task.status === "in_progress") return "in_progress";
  if (task.status === "blocked") return "overdue";
  if (isDatePast(task.due_date)) return "overdue";
  return "pending";
}

function sortTasks(a: Task, b: Task, sortMode: SortMode) {
  if (sortMode === "deadline") {
    const aTime = timeForSort(a.due_date, Number.MAX_SAFE_INTEGER);
    const bTime = timeForSort(b.due_date, Number.MAX_SAFE_INTEGER);
    return aTime - bTime;
  }
  if (sortMode === "priority") {
    const weights: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return (weights[a.priority] ?? 99) - (weights[b.priority] ?? 99);
  }
  return timeForSort(b.created_at, 0) - timeForSort(a.created_at, 0);
}

async function syncTaskSafely(taskId: string, retry = false) {
  try {
    await syncTaskCalendar(taskId, retry);
    toast.success("Google Calendar synced");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Google Calendar sync failed");
  }
}

async function logTaskAudit(
  taskId: string,
  actorId: string,
  action: "task_updated" | "task_deleted",
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

  const withoutTask = await supabase.from("task_audit_logs").insert({ ...modernPayload, task_id: null });
  if (!withoutTask.error) return;

  console.warn("[Task Audit] modern audit insert failed, trying legacy shape", modern.error, withoutTask.error);
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
