import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth, canManageTasks } from "@/hooks/useAuth";
import { useTasks, useProfiles, type Task } from "@/hooks/useData";
import { TaskDialog } from "@/components/task-dialog";
import { StatusBadge, PriorityBadge } from "@/components/task-badges";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

function TasksPage() {
  const { user, role } = useAuth();
  const { tasks } = useTasks();
  const { profiles } = useProfiles();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const canManage = canManageTasks(role);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q))) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, statusFilter, query]);

  const nameFor = (uid: string | null) => {
    if (!uid) return "Unassigned";
    const p = profiles.find((x) => x.id === uid);
    return p?.full_name || p?.email || "Unknown";
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Task deleted");
  };

  if (!user) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">
            All governance tasks. {canManage ? "You can create and assign." : "You can update your own tasks."}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> New task
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="todo">To do</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                      No tasks found.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((t) => {
                  const canEdit = canManage || t.assignee_id === user.id;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-xs">
                        <div className="font-medium truncate">{t.title}</div>
                        {t.department && (
                          <div className="text-xs text-muted-foreground truncate">{t.department}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{nameFor(t.assignee_id)}</TableCell>
                      <TableCell><StatusBadge status={t.status} /></TableCell>
                      <TableCell><PriorityBadge priority={t.priority} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.due_date ? format(parseISO(t.due_date), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Edit task"
                              onClick={() => { setEditing(t); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {role === "admin" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="Delete task"
                              onClick={() => handleDelete(t.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentUserId={user.id}
        employees={profiles}
        task={editing}
      />
    </div>
  );
}
