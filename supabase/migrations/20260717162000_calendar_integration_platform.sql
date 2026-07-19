-- Future-proof calendar integration platform for tasks, planner events, meetings, reminders, and ICS feeds.
-- Provider names are text so new providers can be added without schema changes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_sync_status' AND typnamespace = 'public'::regnamespace) THEN
    ALTER TYPE public.calendar_sync_status ADD VALUE IF NOT EXISTS 'disabled';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_email text,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  token_key_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  sync_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider, provider_account_email)
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  provider text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id uuid REFERENCES public.calendar_integrations(id) ON DELETE SET NULL,
  external_event_id text,
  external_event_url text,
  sync_status text NOT NULL DEFAULT 'pending',
  sync_error text,
  retry_count integer NOT NULL DEFAULT 0,
  last_synced_at timestamptz,
  payload_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_sync_status_check CHECK (sync_status IN ('synced', 'pending', 'failed', 'disabled')),
  UNIQUE (source_type, source_id, provider, user_id)
);

CREATE TABLE IF NOT EXISTS public.calendar_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  provider text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_sync_jobs_action_check CHECK (action IN ('create', 'update', 'delete', 'sync')),
  CONSTRAINT calendar_sync_jobs_status_check CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled'))
);

CREATE TABLE IF NOT EXISTS public.calendar_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  method text NOT NULL DEFAULT 'popup',
  minutes_before integer NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_reminders_method_check CHECK (method IN ('popup', 'email')),
  CONSTRAINT calendar_reminders_minutes_check CHECK (minutes_before >= 0)
);

CREATE TABLE IF NOT EXISTS public.calendar_subscription_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT 'Default planner feed',
  scope text NOT NULL DEFAULT 'planner',
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider ON public.calendar_integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_sync_enabled ON public.calendar_integrations(sync_enabled);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON public.calendar_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_provider_status ON public.calendar_events(provider, sync_status);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_jobs_due ON public.calendar_sync_jobs(status, run_after);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_jobs_source ON public.calendar_sync_jobs(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_source ON public.calendar_reminders(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_subscription_tokens_user ON public.calendar_subscription_tokens(user_id);

ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_subscription_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.calendar_integrations FROM anon, authenticated;
REVOKE ALL ON public.calendar_sync_jobs FROM anon, authenticated;
GRANT ALL ON public.calendar_integrations TO service_role;
GRANT ALL ON public.calendar_events TO service_role;
GRANT ALL ON public.calendar_sync_jobs TO service_role;
GRANT ALL ON public.calendar_reminders TO service_role;
GRANT ALL ON public.calendar_subscription_tokens TO service_role;
GRANT SELECT ON public.calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_subscription_tokens TO authenticated;

DROP VIEW IF EXISTS public.calendar_integration_status;
CREATE VIEW public.calendar_integration_status AS
SELECT
  id,
  user_id,
  provider,
  provider_account_email,
  token_expiry,
  sync_enabled,
  created_at,
  updated_at
FROM public.calendar_integrations
WHERE user_id = auth.uid();

GRANT SELECT ON public.calendar_integration_status TO authenticated;

DROP POLICY IF EXISTS "Users read own calendar events" ON public.calendar_events;
CREATE POLICY "Users read own calendar events"
ON public.calendar_events
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own calendar reminders" ON public.calendar_reminders;
CREATE POLICY "Users manage own calendar reminders"
ON public.calendar_reminders
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users manage own calendar subscription tokens" ON public.calendar_subscription_tokens;
CREATE POLICY "Users manage own calendar subscription tokens"
ON public.calendar_subscription_tokens
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_calendar_integrations_updated
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_calendar_events_updated
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_calendar_sync_jobs_updated
  BEFORE UPDATE ON public.calendar_sync_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_calendar_subscription_tokens_updated
  BEFORE UPDATE ON public.calendar_subscription_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
