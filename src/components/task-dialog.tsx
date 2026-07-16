import { useState, useEffect } from "react";
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
import type { Profile, Task, TaskPriority, TaskStatus } from "@/hooks/useData";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  employees: Profile[];
  task?: Task | null;
  defaultDate?: string | null;
}

const schema = z.object({
  title: z.string().trim().min(2, "Title required").max(200),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "blocked", "done"]),
  assignee_id: z.string().uuid().nullable(),
  due_date: z.string().nullable(),
  scheduled_date: z.string().nullable(),
  department: z.string().trim().max(100).nullable(),
});

export function TaskDialog({
  open,
  onOpenChange,
  currentUserId,
  employees,
  task,
  defaultDate,
}: TaskDialogProps) {
  const isEdit = !!task;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "medium" as TaskPriority,
    status: "todo" as TaskStatus,
    assignee_id: null as string | null,
    due_date: null as string | null,
    scheduled_date: null as string | null,
    department: null as string | null,
  });

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        status: task.status,
        assignee_id: task.assignee_id,
        due_date: task.due_date,
        scheduled_date: task.scheduled_date,
        department: task.department,
      });
    } else {
      setForm({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        assignee_id: null,
        due_date: null,
        scheduled_date: defaultDate ?? null,
        department: null,
      });
    }
  }, [task, defaultDate, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    if (isEdit && task) {
      const { error } = await supabase
        .from("tasks")
        .update({
          ...parsed.data,
          description: parsed.data.description || null,
          completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
        })
        .eq("id", task.id);
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Task updated");
    } else {
      const { error } = await supabase.from("tasks").insert({
        ...parsed.data,
        description: parsed.data.description || null,
        created_by: currentUserId,
      });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Task created");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update task details and assignment." : "Assign a governance task to a team member."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To do</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={form.assignee_id ?? "none"}
              onValueChange={(v) => setForm({ ...form, assignee_id: v === "none" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name || e.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="scheduled">Scheduled</Label>
              <Input
                id="scheduled"
                type="date"
                value={form.scheduled_date ?? ""}
                onChange={(e) => setForm({ ...form, scheduled_date: e.target.value || null })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="due">Due</Label>
              <Input
                id="due"
                type="date"
                value={form.due_date ?? ""}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dept">Department</Label>
            <Input
              id="dept"
              value={form.department ?? ""}
              onChange={(e) => setForm({ ...form, department: e.target.value || null })}
              maxLength={100}
              placeholder="e.g. Public Works"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
