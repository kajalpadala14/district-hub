CREATE TYPE public.calendar_sync_status AS ENUM ('not_synced', 'pending', 'synced', 'failed');
CREATE TYPE public.task_audit_action AS ENUM (
  'task_created',
  'task_updated',
  'task_deleted',
  'calendar_synced',
  'calendar_sync_failed'
);

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS due_time time,
  ADD COLUMN IF NOT EXISTS calendar_sync_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS calendar_event_html_link text,
  ADD COLUMN IF NOT EXISTS calendar_sync_status public.calendar_sync_status NOT NULL DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS calendar_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_sync_error text,
  ADD COLUMN IF NOT EXISTS calendar_retry_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_calendar_sync_status ON public.tasks(calendar_sync_status);
CREATE INDEX IF NOT EXISTS idx_tasks_google_calendar_event_id ON public.tasks(google_calendar_event_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_schedule ON public.tasks(due_date, due_time);

CREATE TABLE IF NOT EXISTS public.google_calendar_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  token_type text DEFAULT 'Bearer',
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.google_calendar_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  return_to text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_calendar_connections FROM anon, authenticated;
REVOKE ALL ON public.google_calendar_oauth_states FROM anon, authenticated;
GRANT ALL ON public.google_calendar_connections TO service_role;
GRANT ALL ON public.google_calendar_oauth_states TO service_role;

DROP VIEW IF EXISTS public.google_calendar_connection_status;
CREATE VIEW public.google_calendar_connection_status AS
SELECT
  user_id,
  google_email,
  expires_at,
  connected_at,
  updated_at
FROM public.google_calendar_connections
WHERE user_id = auth.uid();

GRANT SELECT ON public.google_calendar_connection_status TO authenticated;

CREATE TABLE IF NOT EXISTS public.task_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action public.task_audit_action NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.task_audit_logs TO authenticated;
GRANT ALL ON public.task_audit_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_task_audit_logs_task_id ON public.task_audit_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_logs_actor_id ON public.task_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_logs_action ON public.task_audit_logs(action);

CREATE TABLE IF NOT EXISTS public.task_calendar_events (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_calendar_event_id text NOT NULL,
  calendar_event_html_link text,
  calendar_sync_status public.calendar_sync_status NOT NULL DEFAULT 'synced',
  calendar_last_synced_at timestamptz,
  calendar_sync_error text,
  calendar_retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

ALTER TABLE public.task_calendar_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.task_calendar_events TO authenticated;
GRANT ALL ON public.task_calendar_events TO service_role;

CREATE INDEX IF NOT EXISTS idx_task_calendar_events_user_id ON public.task_calendar_events(user_id);

CREATE POLICY "Users can read their task calendar events" ON public.task_calendar_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated can read task audit logs" ON public.task_audit_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can write their own audit logs" ON public.task_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE TRIGGER trg_google_calendar_connections_updated
  BEFORE UPDATE ON public.google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_task_calendar_events_updated
  BEFORE UPDATE ON public.task_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
