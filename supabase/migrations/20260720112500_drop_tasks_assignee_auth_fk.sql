-- Task assignees point at employee profiles, not necessarily auth.users.
-- Keep created_by tied to auth.users, but allow assignee_id to reference
-- employee registry rows that do not have login accounts.

ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
