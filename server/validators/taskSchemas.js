import { z } from "zod";

const uuid = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const taskCreateSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  priority: z.enum(["low", "normal", "medium", "high", "important", "urgent"]).default("medium"),
  status: z.enum(["pending", "todo", "in_progress", "completed", "done", "overdue", "blocked"]).default("pending"),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  assigned_to: uuid.optional().nullable(),
  department: z.string().trim().max(150).optional().nullable(),
  agency: z.string().trim().max(150).optional().nullable(),
  attachment_url: z.string().url().optional().nullable(),
  calendar_sync_enabled: z.boolean().optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskStatusSchema = z.object({
  status: z.enum(["pending", "todo", "in_progress", "completed", "done", "overdue", "blocked"]),
});

export const commentSchema = z.object({
  comment: z.string().trim().min(1).max(2000),
});

export const attachmentSchema = z.object({
  file_name: z.string().trim().min(1).max(255),
  file_url: z.string().url(),
  file_type: z.string().trim().max(120).optional().nullable(),
  file_size: z.number().int().nonnegative().optional().nullable(),
});

export const bulkEditSchema = z.object({
  task_ids: z.array(uuid).min(1),
  updates: taskUpdateSchema,
});
