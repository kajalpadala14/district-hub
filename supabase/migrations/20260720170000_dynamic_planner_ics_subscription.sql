CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.planner_settings
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS ics_token text,
  ADD COLUMN IF NOT EXISTS apple_calendar_url text NOT NULL DEFAULT '';

UPDATE public.planner_settings
SET ics_token = COALESCE(ics_token, subscription_token),
    apple_calendar_url = COALESCE(NULLIF(apple_calendar_url, ''), apple_ics_url, '')
WHERE ics_token IS NULL
   OR apple_calendar_url IS DISTINCT FROM COALESCE(NULLIF(apple_calendar_url, ''), apple_ics_url, '');

ALTER TABLE public.planner_settings
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN ics_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS planner_settings_id_key ON public.planner_settings(id);
CREATE UNIQUE INDEX IF NOT EXISTS planner_settings_ics_token_key ON public.planner_settings(ics_token);

CREATE OR REPLACE FUNCTION public.sync_planner_settings_calendar_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ics_token := COALESCE(NULLIF(NEW.ics_token, ''), NULLIF(NEW.subscription_token, ''), encode(extensions.gen_random_bytes(18), 'hex'));
  NEW.subscription_token := COALESCE(NULLIF(NEW.subscription_token, ''), NEW.ics_token);

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_token := NEW.ics_token;
    NEW.apple_calendar_url := COALESCE(NEW.apple_calendar_url, NEW.apple_ics_url, '');
    NEW.apple_ics_url := COALESCE(NEW.apple_ics_url, NEW.apple_calendar_url, '');
  ELSIF NEW.ics_token IS DISTINCT FROM OLD.ics_token THEN
    NEW.subscription_token := NEW.ics_token;
  ELSIF NEW.subscription_token IS DISTINCT FROM OLD.subscription_token THEN
    NEW.ics_token := NEW.subscription_token;
  END IF;

  IF NEW.apple_calendar_url IS DISTINCT FROM OLD.apple_calendar_url THEN
    NEW.apple_ics_url := COALESCE(NEW.apple_calendar_url, '');
  ELSIF NEW.apple_ics_url IS DISTINCT FROM OLD.apple_ics_url THEN
    NEW.apple_calendar_url := COALESCE(NEW.apple_ics_url, '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_settings_calendar_columns ON public.planner_settings;
CREATE TRIGGER trg_planner_settings_calendar_columns
  BEFORE INSERT OR UPDATE ON public.planner_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_planner_settings_calendar_columns();

CREATE TABLE IF NOT EXISTS public.planner_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  date date NOT NULL,
  start_time time,
  end_time time,
  is_all_day boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'confirmed',
  priority text NOT NULL DEFAULT 'medium',
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planner_events_title_check CHECK (length(trim(title)) > 0),
  CONSTRAINT planner_events_status_check CHECK (status IN ('confirmed', 'tentative', 'cancelled', 'completed')),
  CONSTRAINT planner_events_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT planner_events_time_check CHECK (is_all_day OR start_time IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_planner_events_user_date ON public.planner_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_planner_events_updated_at ON public.planner_events(updated_at);

ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_events TO authenticated;
GRANT ALL ON public.planner_events TO service_role;

DROP POLICY IF EXISTS "Users manage own planner events" ON public.planner_events;
CREATE POLICY "Users manage own planner events"
ON public.planner_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_planner_events_updated ON public.planner_events;
CREATE TRIGGER trg_planner_events_updated
  BEFORE UPDATE ON public.planner_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.planner_events (
  user_id,
  title,
  description,
  location,
  date,
  start_time,
  end_time,
  is_all_day,
  status,
  priority,
  created_at,
  updated_at
)
SELECT
  created_by,
  title,
  description,
  department,
  COALESCE(scheduled_date, due_date),
  due_time,
  CASE WHEN due_time IS NULL THEN NULL ELSE due_time + interval '30 minutes' END,
  due_time IS NULL,
  CASE
    WHEN status = 'blocked' THEN 'cancelled'
    WHEN status = 'done' THEN 'completed'
    WHEN status = 'todo' THEN 'tentative'
    ELSE 'confirmed'
  END,
  priority::text,
  created_at,
  updated_at
FROM public.tasks
WHERE COALESCE(scheduled_date, due_date) IS NOT NULL
  AND created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.planner_events event
    WHERE event.user_id = tasks.created_by
      AND event.title = tasks.title
      AND event.date = COALESCE(tasks.scheduled_date, tasks.due_date)
      AND event.created_at = tasks.created_at
  );
