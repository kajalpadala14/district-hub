-- Complete Governance Review Dashboard Tasks Module schema.
-- This migration is idempotent and upgrades the existing dashboard schema.

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee', 'user');
  END IF;
END $$;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'done');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_sync_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.calendar_sync_status AS ENUM ('not_synced', 'pending', 'synced', 'failed');
  END IF;
END $$;

-- Helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = ANY(_roles)
  );
$$;

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Authenticated can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin']));

-- Task number sequence
CREATE SEQUENCE IF NOT EXISTS public.task_number_seq START 1;

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number text UNIQUE DEFAULT ('TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0')),
  title text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  status public.task_status NOT NULL DEFAULT 'todo',
  due_date date,
  due_time time,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  allocated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  department text,
  agency text,
  attachment_url text,
  calendar_sync_enabled boolean NOT NULL DEFAULT false,
  calendar_sync_status public.calendar_sync_status NOT NULL DEFAULT 'not_synced',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_number text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time time;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS allocated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS agency text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_sync_status public.calendar_sync_status NOT NULL DEFAULT 'not_synced';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_event_html_link text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_last_synced_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_sync_error text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_retry_count integer NOT NULL DEFAULT 0;

UPDATE public.tasks
SET task_number = 'TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0')
WHERE task_number IS NULL;

ALTER TABLE public.tasks ALTER COLUMN task_number SET DEFAULT ('TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0'));

-- Compatibility with older schema names.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'assignee_id'
  ) THEN
    UPDATE public.tasks
    SET assigned_to = COALESCE(assigned_to, assignee_id);
  END IF;
END $$;

UPDATE public.tasks
SET allocated_by = COALESCE(allocated_by, created_by)
WHERE allocated_by IS NULL;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON public.tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_allocated_by ON public.tasks(allocated_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_agency ON public.tasks(agency);
CREATE INDEX IF NOT EXISTS idx_tasks_calendar_sync_status ON public.tasks(calendar_sync_status);

-- Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment text NOT NULL,
  commented_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS commented_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_comments' AND column_name = 'user_id'
  ) THEN
    UPDATE public.task_comments
    SET commented_by = COALESCE(commented_by, user_id)
    WHERE user_id IN (SELECT id FROM auth.users);
  END IF;
END $$;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_commented_by ON public.task_comments(commented_by);

-- Attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ADD COLUMN IF NOT EXISTS uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.task_attachments ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now();
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_attachments' AND column_name = 'user_id'
  ) THEN
    UPDATE public.task_attachments
    SET uploaded_by = COALESCE(uploaded_by, user_id)
    WHERE user_id IN (SELECT id FROM auth.users);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_attachments' AND column_name = 'created_at'
  ) THEN
    UPDATE public.task_attachments
    SET uploaded_at = COALESCE(uploaded_at, created_at);
  END IF;
END $$;

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_uploaded_by ON public.task_attachments(uploaded_by);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.task_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS old_value jsonb;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS new_value jsonb;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_audit_logs' AND column_name = 'actor_id'
  ) THEN
    UPDATE public.task_audit_logs
    SET performed_by = COALESCE(performed_by, actor_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_audit_logs' AND column_name = 'action'
  ) THEN
    UPDATE public.task_audit_logs
    SET action_type = COALESCE(action_type, action::text);
    ALTER TABLE public.task_audit_logs ALTER COLUMN action DROP NOT NULL;
  END IF;
END $$;

UPDATE public.task_audit_logs SET action_type = 'unknown' WHERE action_type IS NULL;
ALTER TABLE public.task_audit_logs ALTER COLUMN action_type SET NOT NULL;

ALTER TABLE public.task_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.task_audit_logs TO authenticated;
GRANT ALL ON public.task_audit_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_task_audit_logs_task_id ON public.task_audit_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_logs_action_type ON public.task_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_task_audit_logs_performed_by ON public.task_audit_logs(performed_by);

-- Triggers and functions
CREATE OR REPLACE FUNCTION public.set_task_overdue_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.due_date IS NOT NULL
     AND NEW.due_date < current_date
     AND NEW.status <> 'done'::public.task_status THEN
    NEW.status = 'blocked'::public.task_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_overdue_tasks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_count integer;
BEGIN
  UPDATE public.tasks
  SET status = 'blocked'::public.task_status,
      updated_at = now()
  WHERE due_date IS NOT NULL
    AND due_date < current_date
    AND status <> 'done'::public.task_status
    AND status <> 'blocked'::public.task_status;

  GET DIAGNOSTICS changed_count = ROW_COUNT;
  RETURN changed_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_user_status_only_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.has_any_role(auth.uid(), ARRAY['admin', 'manager']) THEN
    RETURN NEW;
  END IF;

  IF OLD.assigned_to = auth.uid() THEN
    IF NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.due_time IS DISTINCT FROM OLD.due_time
       OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
       OR NEW.allocated_by IS DISTINCT FROM OLD.allocated_by
       OR NEW.department IS DISTINCT FROM OLD.department
       OR NEW.agency IS DISTINCT FROM OLD.agency
       OR NEW.attachment_url IS DISTINCT FROM OLD.attachment_url
       OR NEW.calendar_sync_enabled IS DISTINCT FROM OLD.calendar_sync_enabled
       OR NEW.calendar_sync_status IS DISTINCT FROM OLD.calendar_sync_status
       OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Users can update task status only';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_task_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_id_value uuid;
  performer uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    task_id_value := NEW.id;
    performer := COALESCE(NEW.created_by, auth.uid());
    INSERT INTO public.task_audit_logs (task_id, action_type, old_value, new_value, performed_by)
    VALUES (task_id_value, 'task_created', NULL, to_jsonb(NEW), performer);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    task_id_value := NEW.id;
    performer := auth.uid();
    INSERT INTO public.task_audit_logs (task_id, action_type, old_value, new_value, performed_by)
    VALUES (task_id_value, 'task_updated', to_jsonb(OLD), to_jsonb(NEW), performer);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    task_id_value := OLD.id;
    performer := auth.uid();
    INSERT INTO public.task_audit_logs (task_id, action_type, old_value, new_value, performed_by)
    VALUES (task_id_value, 'task_deleted', to_jsonb(OLD), NULL, performer);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_task_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks
  SET comments_count = comments_count + 1
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_updated ON public.tasks;
CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tasks_overdue ON public.tasks;
CREATE TRIGGER trg_tasks_overdue
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_overdue_status();

DROP TRIGGER IF EXISTS trg_tasks_user_status_only ON public.tasks;
CREATE TRIGGER trg_tasks_user_status_only
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_status_only_update();

DROP TRIGGER IF EXISTS trg_tasks_audit_log ON public.tasks;
CREATE TRIGGER trg_tasks_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.write_task_audit_log();

DROP TRIGGER IF EXISTS trg_increment_task_comments_count ON public.task_comments;
CREATE TRIGGER trg_increment_task_comments_count
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_task_comments_count();

-- RLS policies
DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins/managers update any task, assignees update own status" ON public.tasks;
DROP POLICY IF EXISTS "Admins delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager user task select" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task insert" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task update and assigned status update" ON public.tasks;
DROP POLICY IF EXISTS "Admin task delete" ON public.tasks;

CREATE POLICY "Admin manager user task select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR assigned_to = auth.uid()
);

CREATE POLICY "Admin manager task insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  AND created_by = auth.uid()
);

CREATE POLICY "Admin manager task update and assigned status update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR assigned_to = auth.uid()
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR assigned_to = auth.uid()
);

CREATE POLICY "Admin task delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin']));

DROP POLICY IF EXISTS "Task comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insert" ON public.task_comments;

CREATE POLICY "Task comments select"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND t.assigned_to = auth.uid()
  )
);

CREATE POLICY "Task comments insert"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  commented_by = auth.uid()
  AND (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND t.assigned_to = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Task attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Task attachments insert" ON public.task_attachments;

CREATE POLICY "Task attachments select"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND t.assigned_to = auth.uid()
  )
);

CREATE POLICY "Task attachments insert"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND t.assigned_to = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Task audit logs select" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Task audit logs insert" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Authenticated can read task audit logs" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Users can write their own audit logs" ON public.task_audit_logs;

CREATE POLICY "Task audit logs select"
ON public.task_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR performed_by = auth.uid()
);

CREATE POLICY "Task audit logs insert"
ON public.task_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (performed_by = auth.uid());

-- Normalize existing overdue rows now.
SELECT public.mark_overdue_tasks();
