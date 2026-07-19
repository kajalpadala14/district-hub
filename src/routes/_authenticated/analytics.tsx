import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { differenceInCalendarDays, format, isPast, isToday, parseISO } from "date-fns";
import { CheckCircle2, Clock3, Download, RefreshCw, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProfiles, useTasks, type Task } from "@/hooks/useData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: CommandCenterPage,
});

type AgencyRow = {
  agency: string;
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  avgSpeed: string;
};

const healthColors = {
  completed: "oklch(0.62 0.14 155)",
  overdue: "oklch(0.58 0.22 25)",
  pending: "oklch(0.75 0.15 70)",
  inProgress: "oklch(0.48 0.22 290)",
};

function CommandCenterPage() {
  const { tasks } = useTasks();
  const { profiles } = useProfiles();

  const nowLabel = format(new Date(), "dd/MM/yyyy, HH:mm:ss");

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "done").length;
    const inProgress = tasks.filter((task) => task.status === "in_progress").length;
    const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
    const pending = tasks.filter((task) => task.status !== "done" && !isTaskOverdue(task)).length;
    return { completed, inProgress, overdue, pending };
  }, [tasks]);

  const healthData = [
    { name: "Completed", value: stats.completed, color: healthColors.completed },
    { name: "Overdue", value: stats.overdue, color: healthColors.overdue },
    { name: "Pending", value: stats.pending, color: healthColors.pending },
    { name: "In Progress", value: stats.inProgress, color: healthColors.inProgress },
  ];

  const agencyRows = useMemo(() => buildAgencyRows(tasks), [tasks]);
  const bottlenecks = agencyRows
    .filter((row) => row.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue)
    .slice(0, 8);
  const workload = agencyRows
    .filter((row) => row.pending + row.inProgress + row.overdue > 0)
    .sort((a, b) => b.pending + b.inProgress + b.overdue - (a.pending + a.inProgress + a.overdue))
    .slice(0, 10)
    .map((row) => ({ agency: row.agency, active: row.pending + row.inProgress + row.overdue }));
  const oldestPending = tasks
    .filter((task) => task.status !== "done")
    .sort((a, b) => ageInDays(b) - ageInDays(a))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Command Center</h2>
          <p className="mt-1 text-sm text-muted-foreground">Task analytics and bottleneck detection</p>
        </div>
        <Button className="w-fit shadow-elevated">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl shadow-elevated">
          <CardHeader>
            <CardTitle>Project Health</CardTitle>
            <CardDescription>Click slices to open filtered task list</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="white"
                    strokeWidth={3}
                  >
                    {healthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <LegendPill color="bg-success" label="Completed" value={stats.completed} />
              <LegendPill color="bg-destructive" label="Overdue" value={stats.overdue} />
              <LegendPill color="bg-warning" label="Pending" value={stats.pending} />
              <LegendPill color="bg-primary" label="In Progress" value={stats.inProgress} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-elevated">
          <CardHeader>
            <CardTitle>Critical Bottlenecks</CardTitle>
            <CardDescription>Click bars to open agency tasks</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bottlenecks.length ? bottlenecks : [{ agency: "No overdue", overdue: 0 }]} layout="vertical" margin={{ left: 24, right: 24 }}>
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine />
                <YAxis type="category" dataKey="agency" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="overdue" fill="oklch(0.62 0.22 25)" radius={[0, 6, 6, 0]} barSize={86} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="rounded-2xl shadow-elevated">
          <CardHeader>
            <CardTitle>Highest Workload</CardTitle>
            <CardDescription>Click bars to open active tasks</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={workload} layout="vertical" margin={{ left: 20, right: 24 }}>
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine />
                <YAxis type="category" dataKey="agency" width={145} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="active" fill="oklch(0.78 0.16 75)" radius={[0, 8, 8, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-elevated">
          <CardHeader>
            <CardTitle>Top 10 Oldest Pending Tasks</CardTitle>
            <CardDescription>Click item to open in Tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-2">
              {oldestPending.length === 0 && (
                <p className="rounded-lg border p-4 text-sm text-muted-foreground">No pending tasks.</p>
              )}
              {oldestPending.map((task, index) => (
                <div key={task.id} className="rounded-lg border bg-background p-3 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-semibold">
                        #{task.id.slice(0, 3).toUpperCase()}-{String(index + 1).padStart(3, "0")} · {task.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{agencyFor(task)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-destructive">{ageInDays(task)} days</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl shadow-elevated">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Detailed Agency Performance</CardTitle>
            <CardDescription>Click rows to open agency task list</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Download className="h-3.5 w-3.5" />
            Updated {nowLabel}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Agency</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center text-success">Completed</TableHead>
                  <TableHead className="text-center text-warning-foreground">Pending</TableHead>
                  <TableHead className="text-center text-primary">In Progress</TableHead>
                  <TableHead className="text-center text-destructive">Overdue</TableHead>
                  <TableHead className="text-center">Avg Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agencyRows.map((row, index) => (
                  <TableRow key={row.agency} className={cn(index % 7 === 6 && "bg-primary/5")}>
                    <TableCell className="font-semibold">{row.agency}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.total}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-success">{row.completed}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-warning-foreground">{row.pending}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-primary">{row.inProgress}</TableCell>
                    <TableCell className="text-center font-semibold tabular-nums text-destructive">{row.overdue}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">{row.avgSpeed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={CheckCircle2} label="Completed" value={stats.completed} tone="text-success" bg="bg-success/10" />
        <SummaryCard icon={TimerReset} label="Overdue" value={stats.overdue} tone="text-destructive" bg="bg-destructive/10" />
        <SummaryCard icon={Clock3} label="Open Workload" value={stats.pending + stats.inProgress} tone="text-warning-foreground" bg="bg-warning/20" />
      </section>
    </div>
  );
}

function LegendPill({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs">
      <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  bg,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  tone: string;
  bg: string;
}) {
  return (
    <Card className="rounded-xl shadow-elevated">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bg, tone)}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function buildAgencyRows(tasks: Task[]): AgencyRow[] {
  const rows = new Map<string, Task[]>();
  for (const task of tasks) {
    const agency = agencyFor(task);
    rows.set(agency, [...(rows.get(agency) ?? []), task]);
  }

  return Array.from(rows.entries())
    .map(([agency, items]) => {
      const completedTasks = items.filter((task) => task.status === "done");
      const completedSpeeds = completedTasks
        .filter((task) => task.completed_at)
        .map((task) => Math.max(0, differenceInCalendarDays(parseISO(task.completed_at!), parseISO(task.created_at))));
      const avgSpeed =
        completedSpeeds.length > 0
          ? `${round1(completedSpeeds.reduce((sum, item) => sum + item, 0) / completedSpeeds.length)} days`
          : "-";
      return {
        agency,
        total: items.length,
        completed: completedTasks.length,
        pending: items.filter((task) => task.status === "todo" && !isTaskOverdue(task)).length,
        inProgress: items.filter((task) => task.status === "in_progress").length,
        overdue: items.filter(isTaskOverdue).length,
        avgSpeed,
      };
    })
    .sort((a, b) => b.total - a.total || a.agency.localeCompare(b.agency));
}

function agencyFor(task: Task) {
  return task.department || "District Administration";
}

function isTaskOverdue(task: Task) {
  if (task.status === "done") return false;
  if (task.status === "blocked") return true;
  return !!task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
}

function ageInDays(task: Task) {
  return Math.max(0, differenceInCalendarDays(new Date(), parseISO(task.created_at)));
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}
