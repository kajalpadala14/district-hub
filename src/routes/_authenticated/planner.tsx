import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { addDays, format, startOfWeek, parseISO, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth, canManageTasks } from "@/hooks/useAuth";
import { useTasks, useProfiles, type Task } from "@/hooks/useData";
import { TaskDialog } from "@/components/task-dialog";
import { StatusBadge, PriorityBadge } from "@/components/task-badges";

export const Route = createFileRoute("/_authenticated/planner")({
  component: PlannerPage,
});

function PlannerPage() {
  const { user, role } = useAuth();
  const { tasks } = useTasks();
  const { profiles } = useProfiles();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | null>(null);

  const canManage = canManageTasks(role);

  const days = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const d of days) map.set(format(d, "yyyy-MM-dd"), []);
    for (const t of tasks) {
      const anchor = t.scheduled_date ?? t.due_date;
      if (!anchor) continue;
      const key = anchor;
      if (map.has(key)) map.get(key)!.push(t);
    }
    return map;
  }, [tasks, days]);

  const openNew = (dateKey: string) => {
    if (!canManage) return;
    setEditing(null);
    setDefaultDate(dateKey);
    setDialogOpen(true);
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Weekly Planner</h2>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            Today
          </Button>
          <Button variant="outline" size="icon" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          const today = isSameDay(day, new Date());
          return (
            <Card key={key} className={today ? "ring-2 ring-primary/40" : ""}>
              <CardContent className="p-3 min-h-[220px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {format(day, "EEE")}
                    </div>
                    <div className="text-lg font-semibold">{format(day, "d")}</div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label={`Add task on ${format(day, "PPP")}`}
                      onClick={() => openNew(key)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  {dayTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground">No tasks scheduled.</p>
                  )}
                  {dayTasks.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setEditing(t); setDialogOpen(true); }}
                      className="w-full text-left rounded-md border bg-card p-2 hover:border-primary/40 transition"
                    >
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUserId={user.id}
        employees={profiles}
        task={editing}
        defaultDate={defaultDate}
      />
    </div>
  );
}
