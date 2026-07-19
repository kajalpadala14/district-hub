import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ClipboardList,
  Clock3,
  RefreshCw,
} from "lucide-react";
import { addDays, endOfWeek, format, isPast, isToday, isWithinInterval, parseISO, startOfWeek } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDepartments, useProfiles, useTasks, type Task } from "@/hooks/useData";
import { dateKeyForTask, isPlannerMeetingTask, isTaskItem } from "@/lib/taskClassification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: GovernanceOverviewPage,
});

function GovernanceOverviewPage() {
  const { tasks, refresh: refreshTasks } = useTasks();
  const { profiles, refresh: refreshProfiles } = useProfiles();
  const { departments, refresh: refreshDepartments } = useDepartments([
    ...tasks.map((task) => task.department),
    ...profiles.map((profile) => profile.department),
  ]);
  const [meetingSort, setMeetingSort] = useState<MeetingSortMode>("next");
  const [meetingsCollapsed, setMeetingsCollapsed] = useState(true);

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const tomorrowKey = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  const taskItems = tasks.filter(isTaskItem);
  const totalTasks = taskItems.length;
  const completedTasks = taskItems.filter((task) => task.status === "done").length;
  const overdueTasks = taskItems.filter(overdueTask).length;
  const pendingTasks = taskItems.filter((task) => task.status !== "done" && !overdueTask(task)).length;

  const scheduledTasks = taskItems.filter((task) => task.scheduled_date || task.due_date);
  const plannerMeetingTasks = tasks.filter(isPlannerMeetingTask);
  const scheduledToday = scheduledTasks.filter((task) => dateKeyForTask(task) === todayKey);
  const scheduledTomorrow = scheduledTasks.filter((task) => dateKeyForTask(task) === tomorrowKey);
  const reviewTasks = scheduledTasks.filter((task) => taskMatchesText(task, "review"));
  const fieldVisitTasks = scheduledTasks.filter((task) => taskMatchesText(task, "field visit", "visit"));
  const weekTimeline = scheduledTasks
    .filter((task) => {
      const dateKey = dateKeyForTask(task);
      if (!dateKey) return false;
      return isWithinInterval(parseISO(dateKey), { start: weekStart, end: weekEnd });
    })
    .sort((a, b) => Date.parse(dateKeyForTask(a) ?? "") - Date.parse(dateKeyForTask(b) ?? ""))
    .slice(0, 8);

  const departmentSummaries = sortDepartmentSummaries(buildDepartmentSummaries(plannerMeetingTasks), meetingSort);

  const kpis = [
    { label: "Total Tasks", value: totalTasks, icon: ClipboardList, tone: "text-primary", bar: "bg-primary/20" },
    { label: "Completed", value: completedTasks, icon: CheckCircle2, tone: "text-success", bar: "bg-success/20" },
    { label: "Pending", value: pendingTasks, icon: Clock3, tone: "text-warning-foreground", bar: "bg-warning/20" },
    { label: "Overdue", value: overdueTasks, icon: AlertTriangle, tone: "text-destructive", bar: "bg-destructive/15" },
  ];

  const refreshOverview = async () => {
    await Promise.all([refreshTasks(), refreshProfiles(), refreshDepartments()]);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, d MMMM yyyy")} - live task and department summary
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Refresh overview" onClick={() => void refreshOverview()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <Card key={item.label} className="overflow-hidden rounded-2xl shadow-elevated">
            <CardContent className="relative p-5">
              <div className={cn("absolute inset-x-0 bottom-0 h-1.5", item.bar)} />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold tabular-nums">{item.value}</p>
                </div>
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-background shadow-card", item.tone)}>
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-2xl font-extrabold tracking-tight">Department Meetings</h3>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={meetingSort} onValueChange={(value) => setMeetingSort(value as MeetingSortMode)}>
                <SelectTrigger className="h-9 w-[196px] rounded-full border-border/80 bg-background px-5 text-sm font-bold text-slate-600 shadow-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="next">Next Upcoming</SelectItem>
                  <SelectItem value="latest">Latest Added</SelectItem>
                  <SelectItem value="department">Department A-Z</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-full px-4 text-sm font-bold text-slate-600 shadow-sm"
                onClick={() => setMeetingsCollapsed((value) => !value)}
              >
                {meetingsCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {meetingsCollapsed ? "Expand" : "Collapse"}
              </Button>
              <Button asChild variant="link" className="h-9 px-1 text-base font-bold text-primary">
                <Link to="/employees" search={{ manage: "departments" }}>
                  All Departments
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {meetingsCollapsed ? (
            <Card className="rounded-2xl border-0 bg-card shadow-elevated">
              <CardContent className="px-6 py-7 text-base text-slate-600">
                Department section collapsed. Expand to view all departments with recent meetings.
              </CardContent>
            </Card>
          ) : departmentSummaries.length === 0 ? (
            <Card className="rounded-2xl border-0 bg-card shadow-elevated">
              <CardContent className="px-6 py-10 text-center text-sm text-muted-foreground">
                No planner meetings yet. Add a Meeting event in Planner to populate this overview.
              </CardContent>
            </Card>
          ) : (
            departmentSummaries.map((department) => (
              <DepartmentMeetingCard key={department.name} department={department} />
            ))
          )}
        </section>

        <aside className="space-y-6">
          <Card className="rounded-xl shadow-elevated">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold">Quick Stats</h3>
              <div className="mt-4 space-y-4">
                <QuickStat label="Departments" value={departments.length} />
                <QuickStat label="Employees" value={profiles.length} />
                <QuickStat label="Scheduled Items" value={scheduledTasks.length} tone="text-primary" />
                <QuickStat label="Scheduled Today" value={scheduledToday.length} tone="text-primary" />
                <QuickStat label="Completed" value={completedTasks} tone="text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-elevated">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="text-lg font-bold tracking-tight">This Week Timeline</h3>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM")}
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <TimelineChip label={`Tasks (${scheduledToday.length ? "Today" : "This Week"})`} count={weekTimeline.length} tone="primary" />
                <TimelineChip label="Reviews" count={reviewTasks.length} tone="violet" />
                <TimelineChip label="Field Visits" count={fieldVisitTasks.length} tone="success" />
              </div>
              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {weekTimeline.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                    No scheduled tasks this week.
                  </p>
                ) : (
                  weekTimeline.map((task) => (
                    <TimelineItem key={task.id} task={task} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-elevated">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-2">
              <ScheduleColumn title="Scheduled Today" items={scheduledToday} />
              <ScheduleColumn title="Scheduled Tomorrow" items={scheduledTomorrow} emptyLabel="Nothing scheduled tomorrow" muted />
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-elevated">
            <CardContent className="p-0">
              <h3 className="px-4 pt-4 text-sm font-semibold">Quick Actions</h3>
              <div className="mt-3 divide-y">
                <QuickAction to="/employees" label="Manage Departments" highlighted />
                <QuickAction to="/tasks" label="View All Tasks" />
                <QuickAction to="/planner" label="Open Planner" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type DepartmentSummary = {
  name: string;
  total: number;
  completed: number;
  pending: number;
  recentTasks: Task[];
};

type MeetingSortMode = "next" | "latest" | "department";

function buildDepartmentSummaries(tasks: Task[]): DepartmentSummary[] {
  const names = new Set<string>();
  for (const task of tasks) {
    names.add(departmentNameForPlannerTask(task));
  }

  return Array.from(names)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const departmentTasks = tasks
        .filter((task) => departmentNameForPlannerTask(task) === name)
        .sort((a, b) => {
          const aDate = Date.parse(dateKeyForTask(a) ?? a.updated_at);
          const bDate = Date.parse(dateKeyForTask(b) ?? b.updated_at);
          return bDate - aDate;
        });
      return {
        name,
        total: departmentTasks.length,
        completed: departmentTasks.filter((task) => task.status === "done").length,
        pending: departmentTasks.filter((task) => task.status !== "done").length,
        recentTasks: departmentTasks.slice(0, 3),
      };
    })
    .filter((department) => department.total > 0);
}

function sortDepartmentSummaries(items: DepartmentSummary[], mode: MeetingSortMode) {
  const sorted = [...items];
  if (mode === "department") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
  if (mode === "latest") {
    return sorted.sort((a, b) => latestMeetingTime(b) - latestMeetingTime(a));
  }
  return sorted.sort((a, b) => nextMeetingTime(a) - nextMeetingTime(b));
}

function nextMeetingTime(department: DepartmentSummary) {
  const today = Date.parse(format(new Date(), "yyyy-MM-dd"));
  const upcoming = department.recentTasks
    .map((task) => Date.parse(dateKeyForTask(task) ?? ""))
    .filter((time) => Number.isFinite(time) && time >= today);
  if (upcoming.length > 0) return Math.min(...upcoming);
  return latestMeetingTime(department);
}

function latestMeetingTime(department: DepartmentSummary) {
  const times = department.recentTasks
    .map((task) => Date.parse(dateKeyForTask(task) ?? task.updated_at))
    .filter(Number.isFinite);
  return times.length > 0 ? Math.max(...times) : 0;
}

function DepartmentMeetingCard({ department }: { department: DepartmentSummary }) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border/80 bg-card shadow-elevated">
      <CardContent className="p-0">
        <div className="flex items-center gap-4 px-5 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-card">
            {initialsForDepartment(department.name)}
          </div>
          <p className="min-w-0 truncate text-xl font-extrabold text-foreground">{department.name}</p>
        </div>
        <div className="grid min-h-24 border-t sm:grid-cols-[155px_repeat(3,minmax(0,1fr))]">
          <div className="flex items-center border-b px-5 py-4 sm:border-b-0 sm:border-r">
            <span className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Meetings</span>
          </div>
          {department.recentTasks.length === 0 ? (
            <div className="flex items-center px-5 py-5 text-sm text-muted-foreground sm:col-span-3">
              No scheduled meetings.
            </div>
          ) : (
            department.recentTasks.map((task) => (
              <MeetingCell key={task.id} task={task} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingCell({ task }: { task: Task }) {
  return (
    <Link
      to="/planner"
      className="flex min-h-24 flex-col items-center justify-center gap-2 border-b px-4 py-4 text-center transition-colors hover:bg-primary/5 sm:border-b-0 sm:border-r last:border-r-0"
    >
      <span className="text-sm font-extrabold tabular-nums text-slate-700">{meetingDateLabel(task)}</span>
      <span className={cn("text-[11px] font-extrabold uppercase tracking-wide", meetingStatusTone(task))}>
        {meetingStatusLabel(task)}
      </span>
      <span className="text-xs font-bold text-slate-400">{meetingTimeLabel(task)}</span>
    </Link>
  );
}

function TimelineItem({ task }: { task: Task }) {
  const dateKey = dateKeyForTask(task);
  return (
    <div className="grid grid-cols-[minmax(104px,134px)_minmax(0,1fr)] gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-card max-[420px]:grid-cols-1">
      <div className="rounded-lg border border-primary/10 bg-background/80 p-3 text-xs">
        <p className="font-bold uppercase text-primary">{dateKey ? format(parseISO(dateKey), "EEE, d MMM") : "No date"}</p>
        <p className="mt-2 font-semibold text-primary/90">{task.due_time ? task.due_time.slice(0, 5) : "All day"}</p>
      </div>
      <div className="min-w-0 py-0.5">
        <Badge variant="outline" className={cn("h-6 rounded-full px-3 text-[11px] font-bold uppercase", statusTone(task))}>
          {statusLabel(task)}
        </Badge>
        <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{task.title}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{task.department || "Task follow-up"}</p>
      </div>
    </div>
  );
}

function TimelineChip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "primary" | "violet" | "success";
}) {
  const chipTone = {
    primary: "border-primary/20 bg-primary/12 text-primary",
    violet: "border-purple-200 bg-purple-100 text-purple-700",
    success: "border-success/25 bg-success/15 text-emerald-700",
  }[tone];

  return (
    <span className={cn("inline-flex h-9 items-center rounded-full border px-4 text-sm font-bold", chipTone)}>
      {label}
      {label.includes("(") ? null : <span className="ml-1.5 text-xs opacity-70">{count}</span>}
    </span>
  );
}

function QuickStat({ label, value, tone = "text-foreground" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{value}</span>
    </div>
  );
}

function overdueTask(task: { status: string; due_date: string | null }) {
  return (
    task.status !== "done" &&
    (task.status === "blocked" ||
      (!!task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date))))
  );
}

function ScheduleColumn({
  title,
  items,
  emptyLabel,
  muted,
}: {
  title: string;
  items: Task[];
  emptyLabel?: string;
  muted?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-3", muted ? "bg-muted/25" : "bg-primary/5")}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-primary">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-xs italic text-muted-foreground">{emptyLabel ?? "Nothing scheduled"}</p>
      ) : (
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {items.map((task) => (
            <div key={task.id} className="rounded-md border bg-background px-3 py-2 shadow-card">
              <p className="line-clamp-2 text-xs font-semibold">{task.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{task.department || "No department"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickAction({ to, label, highlighted }: { to: "/employees" | "/tasks" | "/planner"; label: string; highlighted?: boolean }) {
  return (
    <Button asChild variant="ghost" className={cn("h-12 w-full justify-between rounded-none px-4", highlighted && "bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary")}>
      <Link to={to}>
        <span>{label}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </Button>
  );
}

function meetingDateLabel(task: Task) {
  const dateKey = dateKeyForTask(task);
  return dateKey ? format(parseISO(dateKey), "dd/MM/yy") : "No date";
}

function meetingTimeLabel(task: Task) {
  return task.due_time ? formatTimeLabel(task.due_time) : "All day";
}

function meetingStatusLabel(task: Task) {
  if (task.status === "done" || task.status === "in_progress") return "Confirmed";
  if (task.status === "blocked") return "Cancelled";
  return "Pending";
}

function meetingStatusTone(task: Task) {
  if (task.status === "done" || task.status === "in_progress") return "text-emerald-600";
  if (task.status === "blocked") return "text-slate-400";
  return "text-primary";
}

function formatTimeLabel(value: string) {
  const [hourValue, minuteValue = "00"] = value.split(":");
  const hour = Number(hourValue);
  if (Number.isNaN(hour)) return value.slice(0, 5);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteValue.padStart(2, "0").slice(0, 2)} ${period}`;
}

function taskMatchesText(task: Task, ...terms: string[]) {
  const haystack = `${task.title} ${task.description ?? ""} ${task.department ?? ""}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function departmentNameForPlannerTask(task: Task) {
  return task.department?.trim() || "Governance Department";
}

function statusLabel(task: Task) {
  if (task.status === "done") return "Completed";
  if (overdueTask(task)) return "Overdue";
  if (task.status === "in_progress") return "In Progress";
  return "Pending";
}

function statusTone(task: Task) {
  if (task.status === "done") return "bg-success/10 text-success border-success/30";
  if (overdueTask(task)) return "bg-destructive/15 text-destructive border-destructive/30";
  if (task.status === "in_progress") return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-muted-foreground/20";
}

function initialsForDepartment(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
