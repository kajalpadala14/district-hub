import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/hooks/useData";

const statusStyles: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-info/15 text-info border-info/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  done: "bg-success/15 text-success border-success/30",
};

const statusLabels: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary border-primary/20",
  high: "bg-warning/20 text-warning-foreground border-warning/40",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", statusStyles[status])}>
      {statusLabels[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", priorityStyles[priority])}>
      {priority}
    </Badge>
  );
}
