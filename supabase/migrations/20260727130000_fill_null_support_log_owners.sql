-- Attach old support-log rows that still have a null owner to their parent
-- task/planner record. This does not delete records or change business fields.

UPDATE public.task_audit_logs audit
SET owner_user_id = task.owner_user_id
FROM public.tasks task
WHERE audit.owner_user_id IS NULL
  AND audit.task_id = task.id
  AND task.owner_user_id IS NOT NULL;

UPDATE public.telegram_reminder_logs log
SET owner_user_id = planner.owner_user_id
FROM public.planner_events planner
WHERE log.owner_user_id IS NULL
  AND log.meeting_id = planner.id::text
  AND planner.owner_user_id IS NOT NULL;
