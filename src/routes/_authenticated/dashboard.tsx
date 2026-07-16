import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks, Clock, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useTasks, useProfiles } from "@/hooks/useData";
import { StatusBadge, PriorityBadge } from "@/components/task-badges";
import { format, isToday, isPast, parseISO } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: OverviewPage,
});

function OverviewPage() {
  const { user, role } = useAuth();
  const { tasks } = useTasks();
  const { profiles } = useProfiles();

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== "done" && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)),
  ).length;

  const completion = total ? Math.round((done / total) * 100) : 0;

  const myTasks = tasks.filter((t) => t.assignee_id === user?.id && t.status !== "done").slice(0, 5);
  const recent = tasks.slice(0, 5);

  const stats = [
    { label: "Active tasks", value: total - done, icon: ListChecks, tone: "text-primary" },
    { label: "In progress", value: inProgress, icon: Clock, tone: "text-info" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, tone: "text-destructive" },
    { label: "Completed", value: done, icon: CheckCircle2, tone: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Welcome{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            Here's how district operations are progressing today.
          </p>
        </div>
        <Button asChild>
          <Link to="/tasks">
            Open tasks
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {s.label}
                </span>
                <s.icon className={`h-4 w-4 ${s.tone}`} aria-hidden="true" />
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Completion rate</CardTitle>
            <CardDescription>{done} of {total} tasks completed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completion} className="h-3" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <Stat label="To do" value={tasks.filter((t) => t.status === "todo").length} />
              <Stat label="In progress" value={inProgress} />
              <Stat label="Blocked" value={blocked} />
              <Stat label="Done" value={done} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
            <CardDescription>{profiles.length} members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profiles.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {(p.full_name || p.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name || p.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.job_title || p.department || "—"}</p>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && (
                <p className="text-sm text-muted-foreground">No team members yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My open tasks</CardTitle>
            <CardDescription>Assigned to you and not yet done</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList tasks={myTasks} emptyLabel="You're all caught up." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest task updates</CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList tasks={recent} emptyLabel="No tasks yet." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function TaskList({ tasks, emptyLabel }: { tasks: ReturnType<typeof useTasks>["tasks"]; emptyLabel: string }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {tasks.map((t) => (
        <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{t.title}</p>
            <div className="mt-1 flex flex-wrap gap-1.5 items-center">
              <StatusBadge status={t.status} />
              <PriorityBadge priority={t.priority} />
              {t.due_date && (
                <span className="text-xs text-muted-foreground">
                  Due {format(parseISO(t.due_date), "MMM d")}
                </span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
