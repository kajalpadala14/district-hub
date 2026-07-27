-- Backfill historical support rows that cannot be linked to a task/event.
-- Assigning them to the first admin keeps them out of normal tenant views.

UPDATE public.task_audit_logs log
SET owner_user_id = admin_user.user_id
FROM (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1
) admin_user
WHERE log.owner_user_id IS NULL;

UPDATE public.telegram_reminder_logs log
SET owner_user_id = admin_user.user_id
FROM (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1
) admin_user
WHERE log.owner_user_id IS NULL;
