CREATE SEQUENCE IF NOT EXISTS public.task_number_seq START 1;

CREATE TABLE IF NOT EXISTS public.backend_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  role public.app_role NOT NULL DEFAULT 'employee',
  department text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backend_users ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.backend_users TO service_role;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS backend_assigned_to uuid REFERENCES public.backend_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS backend_allocated_by uuid REFERENCES public.backend_users(id) ON DELETE SET NULL;

UPDATE public.tasks
SET task_number = 'TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0')
WHERE task_number IS NULL;

ALTER TABLE public.tasks ALTER COLUMN task_number SET DEFAULT ('TASK-' || lpad(nextval('public.task_number_seq')::text, 6, '0'));

CREATE INDEX IF NOT EXISTS idx_tasks_task_number ON public.tasks(task_number);
CREATE INDEX IF NOT EXISTS idx_tasks_agency ON public.tasks(agency);
CREATE INDEX IF NOT EXISTS idx_tasks_backend_assigned_to ON public.tasks(backend_assigned_to);

CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.backend_users(id) ON DELETE SET NULL,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.backend_users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.backend_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES public.backend_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.task_comments TO service_role;
GRANT ALL ON public.task_attachments TO service_role;
GRANT ALL ON public.task_notifications TO service_role;
GRANT ALL ON public.task_activity_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_user_id ON public.task_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_task_id ON public.task_activity_logs(task_id);

CREATE OR REPLACE FUNCTION public.increment_task_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.tasks
  SET comments_count = comments_count + 1
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_increment_task_comments_count ON public.task_comments;
CREATE TRIGGER trg_increment_task_comments_count
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_task_comments_count();

CREATE TRIGGER trg_backend_users_updated
  BEFORE UPDATE ON public.backend_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
