import { Router } from "express";
import { requireAuth, canManageTasks, canDeleteTasks } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../utils/http.js";
import {
  addAttachment,
  addComment,
  bulkEdit,
  createTask,
  deleteTask,
  getTaskOrThrow,
  listTasks,
  toCsv,
  updateTask,
  updateTaskStatus,
} from "../services/taskService.js";
import { audit } from "../services/auditService.js";
import {
  attachmentSchema,
  bulkEditSchema,
  commentSchema,
  taskCreateSchema,
  taskStatusSchema,
  taskUpdateSchema,
} from "../validators/taskSchemas.js";

export const taskRouter = Router();

taskRouter.use(requireAuth);

taskRouter.post(
  "/",
  canManageTasks,
  asyncHandler(async (req, res) => {
    const parsed = taskCreateSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid task payload", parsed.error.flatten());
    const task = await createTask(req.user, parsed.data);
    await audit(req, "task_created", task.id, { task_number: task.task_number });
    res.status(201).json({ task });
  }),
);

taskRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const tasks = await listTasks(req.user, req.query);
    await audit(req, "tasks_viewed", null, { filters: req.query });
    res.json({ tasks });
  }),
);

taskRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const tasks = await listTasks(req.user, req.query);
    await audit(req, "tasks_exported", null, { filters: req.query, count: tasks.length });
    res.header("Content-Type", "text/csv");
    res.attachment("tasks.csv");
    res.send(toCsv(tasks));
  }),
);

taskRouter.patch(
  "/bulk",
  canManageTasks,
  asyncHandler(async (req, res) => {
    const parsed = bulkEditSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid bulk edit payload", parsed.error.flatten());
    const tasks = await bulkEdit(req.user, parsed.data.task_ids, parsed.data.updates);
    await audit(req, "tasks_bulk_updated", null, { task_ids: parsed.data.task_ids, updates: parsed.data.updates });
    res.json({ tasks });
  }),
);

taskRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const task = await getTaskOrThrow(req.user, req.params.id);
    await audit(req, "task_viewed", task.id);
    res.json({ task });
  }),
);

taskRouter.put(
  "/:id",
  canManageTasks,
  asyncHandler(async (req, res) => {
    const parsed = taskUpdateSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid task update payload", parsed.error.flatten());
    const task = await updateTask(req.user, req.params.id, parsed.data);
    await audit(req, "task_updated", task.id, parsed.data);
    res.json({ task });
  }),
);

taskRouter.delete(
  "/:id",
  canDeleteTasks,
  asyncHandler(async (req, res) => {
    await deleteTask(req.user, req.params.id);
    await audit(req, "task_deleted", req.params.id);
    res.status(204).send();
  }),
);

taskRouter.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const parsed = taskStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid status payload", parsed.error.flatten());
    const task = await updateTaskStatus(req.user, req.params.id, parsed.data.status);
    await audit(req, "task_status_updated", task.id, { status: parsed.data.status });
    res.json({ task });
  }),
);

taskRouter.post(
  "/:id/comments",
  asyncHandler(async (req, res) => {
    const parsed = commentSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid comment payload", parsed.error.flatten());
    const comment = await addComment(req.user, req.params.id, parsed.data.comment);
    await audit(req, "task_comment_added", req.params.id);
    res.status(201).json({ comment });
  }),
);

taskRouter.post(
  "/:id/attachments",
  asyncHandler(async (req, res) => {
    const parsed = attachmentSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, "Invalid attachment payload", parsed.error.flatten());
    const attachment = await addAttachment(req.user, req.params.id, parsed.data);
    await audit(req, "task_attachment_added", req.params.id, { file_name: attachment.file_name });
    res.status(201).json({ attachment });
  }),
);
