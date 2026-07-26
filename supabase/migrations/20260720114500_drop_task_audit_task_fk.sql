-- Audit logs should never block task actions. Keep task_id as optional context,
-- but allow logs to survive stale or deleted task references.

ALTER TABLE public.task_audit_logs
DROP CONSTRAINT IF EXISTS task_audit_logs_task_id_fkey;
