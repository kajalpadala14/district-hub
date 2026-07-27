-- Final ownership fallback for orphan support logs whose parent task/planner
-- row is no longer available. Only null owner metadata is filled.

WITH fallback_owner AS (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.task_audit_logs audit
SET owner_user_id = fallback_owner.user_id
FROM fallback_owner
WHERE audit.owner_user_id IS NULL;

WITH fallback_owner AS (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE public.telegram_reminder_logs log
SET owner_user_id = fallback_owner.user_id
FROM fallback_owner
WHERE log.owner_user_id IS NULL;
