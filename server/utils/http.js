export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function mapStatus(status) {
  const values = {
    pending: "todo",
    todo: "todo",
    in_progress: "in_progress",
    completed: "done",
    done: "done",
    overdue: "blocked",
    blocked: "blocked",
  };
  return values[status] ?? status;
}

export function mapPriority(priority) {
  const values = {
    low: "low",
    normal: "medium",
    medium: "medium",
    high: "high",
    important: "urgent",
    urgent: "urgent",
  };
  return values[priority] ?? priority;
}
