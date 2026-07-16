import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { format, subDays, parseISO, startOfDay } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTasks, useProfiles } from "@/hooks/useData";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

const COLORS = [
  "oklch(0.48 0.22 290)",
  "oklch(0.62 0.16 260)",
  "oklch(0.72 0.12 320)",
  "oklch(0.62 0.14 155)",
  "oklch(0.75 0.15 70)",
];

function AnalyticsPage() {
  const { tasks } = useTasks();
  const { profiles } = useProfiles();

  const byStatus = useMemo(() => {
    const buckets: Record<string, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
    for (const t of tasks) buckets[t.status]++;
    return [
      { name: "To do", value: buckets.todo },
      { name: "In progress", value: buckets.in_progress },
      { name: "Blocked", value: buckets.blocked },
      { name: "Done", value: buckets.done },
    ];
  }, [tasks]);

  const byPriority = useMemo(() => {
    const buckets: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of tasks) buckets[t.priority]++;
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const byAssignee = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) {
      const key = t.assignee_id ?? "unassigned";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const rows: { name: string; total: number }[] = [];
    counts.forEach((total, uid) => {
      if (uid === "unassigned") rows.push({ name: "Unassigned", total });
      else {
        const p = profiles.find((x) => x.id === uid);
        rows.push({ name: p?.full_name || p?.email || "Unknown", total });
      }
    });
    return rows.sort((a, b) => b.total - a.total).slice(0, 8);
  }, [tasks, profiles]);

  const completionTrend = useMemo(() => {
    const days = 14;
    const start = startOfDay(subDays(new Date(), days - 1));
    const rows = Array.from({ length: days }).map((_, i) => {
      const d = subDays(new Date(), days - 1 - i);
      return {
        date: format(d, "MMM d"),
        Completed: 0,
        Created: 0,
      };
    });
    for (const t of tasks) {
      const created = parseISO(t.created_at);
      if (created >= start) {
        const idx = Math.floor((startOfDay(created).getTime() - start.getTime()) / (24 * 3600 * 1000));
        if (rows[idx]) rows[idx].Created++;
      }
      if (t.completed_at) {
        const done = parseISO(t.completed_at);
        if (done >= start) {
          const idx = Math.floor((startOfDay(done).getTime() - start.getTime()) / (24 * 3600 * 1000));
          if (rows[idx]) rows[idx].Completed++;
        }
      }
    }
    return rows;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">Governance performance and workload distribution.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks by priority</CardTitle>
            <CardDescription>Where attention is needed</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byPriority}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 290)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.48 0.22 290)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activity (last 14 days)</CardTitle>
            <CardDescription>Tasks created vs. completed</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 290)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Created" stroke="oklch(0.62 0.16 260)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Completed" stroke="oklch(0.62 0.14 155)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Workload by employee</CardTitle>
            <CardDescription>Top 8 by task count</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byAssignee} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.01 290)" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="total" fill="oklch(0.48 0.22 290)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
