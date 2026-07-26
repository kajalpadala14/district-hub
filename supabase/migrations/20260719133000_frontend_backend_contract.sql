-- Align the Supabase schema with the frontend dashboard contract.
-- This keeps the app on real backend tables for departments, employees, tasks,
-- planner meetings, and audit logs.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'employee');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'done');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_sync_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.calendar_sync_status AS ENUM ('not_synced', 'pending', 'synced', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_audit_action' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.task_audit_action AS ENUM (
      'task_created',
      'task_updated',
      'task_deleted',
      'calendar_synced',
      'calendar_sync_failed'
    );
  END IF;
END $$;

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

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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
      AND role = _role
  );
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

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text,
  phone text,
  address text,
  department text,
  job_title text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'profiles'
      AND con.contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.profiles
SET email = concat(id::text, '@local.employee')
WHERE email IS NULL OR trim(email) = '';

ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Authenticated can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid();
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
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
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE SEQUENCE IF NOT EXISTS public.task_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  due_date date,
  due_time time,
  scheduled_date date,
  department text,
  assignee_id uuid,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  calendar_sync_enabled boolean NOT NULL DEFAULT false,
  calendar_sync_status public.calendar_sync_status NOT NULL DEFAULT 'not_synced',
  google_calendar_event_id text,
  calendar_event_html_link text,
  calendar_last_synced_at timestamptz,
  calendar_sync_error text,
  calendar_retry_count integer NOT NULL DEFAULT 0
);

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'tasks'
      AND con.contype = 'f'
      AND pg_get_constraintdef(con.oid) ILIKE '%assignee_id%'
  LOOP
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_number text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS due_time time;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_date date;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assignee_id uuid;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_sync_status public.calendar_sync_status NOT NULL DEFAULT 'not_synced';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_event_html_link text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_last_synced_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_sync_error text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS calendar_retry_count integer NOT NULL DEFAULT 0;

UPDATE public.tasks
SET task_number = 'TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0')
WHERE task_number IS NULL;

ALTER TABLE public.tasks ALTER COLUMN task_number SET DEFAULT ('TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0'));
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON public.tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON public.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at);

DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins/managers update any task, assignees update own status" ON public.tasks;
DROP POLICY IF EXISTS "Admins delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager user task select" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task insert" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task update and assigned status update" ON public.tasks;
DROP POLICY IF EXISTS "Admin task delete" ON public.tasks;

CREATE POLICY "Authenticated can view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins and managers create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  AND created_by = auth.uid()
);

CREATE POLICY "Admins/managers update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Admins delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_tasks_updated ON public.tasks;
CREATE TRIGGER trg_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;

DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated can manage departments" ON public.departments;

CREATE POLICY "Authenticated can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

DROP TRIGGER IF EXISTS trg_departments_updated ON public.departments;
CREATE TRIGGER trg_departments_updated
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.departments (name)
VALUES
  ('Agri and Allied'),
  ('Agriculture'),
  ('District Administration'),
  ('Education'),
  ('Health'),
  ('SBM'),
  ('Zila Panchayat')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name)
SELECT DISTINCT trim(department)
FROM public.profiles
WHERE department IS NOT NULL AND trim(department) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name)
SELECT DISTINCT trim(department)
FROM public.tasks
WHERE department IS NOT NULL AND trim(department) <> ''
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  comment text NOT NULL,
  commented_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS commented_by uuid;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_comments TO authenticated;
GRANT ALL ON public.task_comments TO service_role;

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ADD COLUMN IF NOT EXISTS uploaded_by uuid;
ALTER TABLE public.task_attachments ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;

CREATE TABLE IF NOT EXISTS public.task_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  action public.task_audit_action,
  actor_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_type text,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS action public.task_audit_action;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS actor_id uuid;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS action_type text;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS old_value jsonb;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS new_value jsonb;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS performed_by uuid;
ALTER TABLE public.task_audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.task_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.task_audit_logs TO authenticated;
GRANT ALL ON public.task_audit_logs TO service_role;

DROP POLICY IF EXISTS "Authenticated can read task audit logs" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Users can write their own audit logs" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Task audit logs select" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Task audit logs insert" ON public.task_audit_logs;

CREATE POLICY "Authenticated can read task audit logs"
ON public.task_audit_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can write task audit logs"
ON public.task_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);
