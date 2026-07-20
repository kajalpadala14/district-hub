import type { Task } from "@/hooks/useData";

export const PLANNER_MEETING_TYPE_LINE = "Type: Meeting";

export function isPlannerMeetingTask(task: Task) {
  return (
    task.description
      ?.split(/\r?\n/)
      .some((line) => line.trim().toLowerCase() === PLANNER_MEETING_TYPE_LINE.toLowerCase()) ??
    false
  );
}

export function isPlannerTask(task: Task) {
  return isPlannerMeetingTask(task);
}

export function isTaskItem(task: Task) {
  return !isPlannerMeetingTask(task);
}

export function dateKeyForTask(task: Task) {
  return task.scheduled_date ?? task.due_date;
}
