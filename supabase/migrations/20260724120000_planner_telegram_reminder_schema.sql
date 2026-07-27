-- Production-ready planner event and Telegram reminder queue schema.
-- This migration keeps the existing planner_events data model compatible while
-- adding enum-backed statuses and a durable queue for scheduled Telegram sends.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'planner_event_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.planner_event_status AS ENUM (
      'confirmed',
      'tentative',
      'cancelled',
      'completed'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'reminder_queue_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.reminder_queue_status AS ENUM (
      'pending',
      'processing',
      'sent',
      'failed',
      'cancelled'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'telegram_recipient_type'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.telegram_recipient_type AS ENUM (
      'user',
      'group',
      'channel'
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
  status public.planner_event_status NOT NULL DEFAULT 'confirmed',
  priority text NOT NULL DEFAULT 'medium',
  color text,
  sequence integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planner_events_title_check CHECK (length(trim(title)) > 0),
  CONSTRAINT planner_events_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT planner_events_time_check CHECK (is_all_day OR start_time IS NOT NULL),
  CONSTRAINT planner_events_end_after_start_check CHECK (
    is_all_day
    OR end_time IS NULL
    OR start_time IS NULL
    OR end_time > start_time
  )
);

ALTER TABLE public.planner_events
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 0;

ALTER TABLE public.planner_events
  DROP CONSTRAINT IF EXISTS planner_events_status_check;

ALTER TABLE public.planner_events
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.planner_events
  ALTER COLUMN status TYPE public.planner_event_status
  USING status::public.planner_event_status,
  ALTER COLUMN status SET DEFAULT 'confirmed'::public.planner_event_status,
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'planner_events_end_after_start_check'
      AND conrelid = 'public.planner_events'::regclass
  ) THEN
    ALTER TABLE public.planner_events
      ADD CONSTRAINT planner_events_end_after_start_check CHECK (
        is_all_day
        OR end_time IS NULL
        OR start_time IS NULL
        OR end_time > start_time
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS planner_events_id_user_id_key
  ON public.planner_events(id, user_id);

CREATE INDEX IF NOT EXISTS idx_planner_events_user_date
  ON public.planner_events(user_id, date);

CREATE INDEX IF NOT EXISTS idx_planner_events_user_status_date
  ON public.planner_events(user_id, status, date);

CREATE INDEX IF NOT EXISTS idx_planner_events_due_at
  ON public.planner_events(date, start_time)
  WHERE status IN ('confirmed', 'tentative') AND is_all_day = false;

CREATE INDEX IF NOT EXISTS idx_planner_events_updated_at
  ON public.planner_events(updated_at);

COMMENT ON TABLE public.planner_events IS
  'Canonical planner meeting/event table used by the planner UI and reminder system.';
COMMENT ON COLUMN public.planner_events.user_id IS
  'Owner of the planner event. References auth.users for Supabase Auth integration.';
COMMENT ON COLUMN public.planner_events.status IS
  'Lifecycle status for the planner event: confirmed, tentative, cancelled, or completed.';
COMMENT ON COLUMN public.planner_events.sequence IS
  'Incremented when meaningful event fields change; used to avoid stale reminder delivery.';
COMMENT ON COLUMN public.planner_events.metadata IS
  'Extensible JSON payload for provider-specific or notification-specific data.';

CREATE TABLE IF NOT EXISTS public.reminder_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planner_event_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_chat_id text NOT NULL,
  recipient_type public.telegram_recipient_type NOT NULL DEFAULT 'user',
  reminder_minutes_before integer NOT NULL,
  event_sequence integer NOT NULL DEFAULT 0,
  remind_at timestamptz NOT NULL,
  next_retry_at timestamptz NOT NULL DEFAULT now(),
  status public.reminder_queue_status NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  locked_at timestamptz,
  locked_by text,
  sent_at timestamptz,
  cancelled_at timestamptz,
  telegram_message_id text,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reminder_queue_event_user_fk
    FOREIGN KEY (planner_event_id, user_id)
    REFERENCES public.planner_events(id, user_id)
    ON DELETE CASCADE,
  CONSTRAINT reminder_queue_minutes_check CHECK (reminder_minutes_before >= 0),
  CONSTRAINT reminder_queue_attempts_check CHECK (retry_count >= 0 AND max_attempts > 0),
  CONSTRAINT reminder_queue_chat_id_check CHECK (length(trim(telegram_chat_id)) > 0),
  CONSTRAINT reminder_queue_sent_status_check CHECK (
    (status = 'sent' AND sent_at IS NOT NULL)
    OR status <> 'sent'
  ),
  CONSTRAINT reminder_queue_cancelled_status_check CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR status <> 'cancelled'
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_queue'
      AND column_name = 'scheduled_for'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_queue'
      AND column_name = 'remind_at'
  ) THEN
    ALTER TABLE public.reminder_queue RENAME COLUMN scheduled_for TO remind_at;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_queue'
      AND column_name = 'next_attempt_at'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_queue'
      AND column_name = 'next_retry_at'
  ) THEN
    ALTER TABLE public.reminder_queue RENAME COLUMN next_attempt_at TO next_retry_at;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_queue'
      AND column_name = 'attempts'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reminder_queue'
      AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE public.reminder_queue RENAME COLUMN attempts TO retry_count;
  END IF;
END $$;

ALTER TABLE public.reminder_queue
  ALTER COLUMN recipient_type DROP DEFAULT,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN recipient_type TYPE public.telegram_recipient_type
  USING recipient_type::public.telegram_recipient_type,
  ALTER COLUMN recipient_type SET DEFAULT 'user'::public.telegram_recipient_type,
  ALTER COLUMN recipient_type SET NOT NULL,
  ALTER COLUMN status TYPE public.reminder_queue_status
  USING status::public.reminder_queue_status,
  ALTER COLUMN status SET DEFAULT 'pending'::public.reminder_queue_status,
  ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_queue_event_user_fk'
      AND conrelid = 'public.reminder_queue'::regclass
  ) THEN
    ALTER TABLE public.reminder_queue
      ADD CONSTRAINT reminder_queue_event_user_fk
      FOREIGN KEY (planner_event_id, user_id)
      REFERENCES public.planner_events(id, user_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_queue_minutes_check'
      AND conrelid = 'public.reminder_queue'::regclass
  ) THEN
    ALTER TABLE public.reminder_queue
      ADD CONSTRAINT reminder_queue_minutes_check CHECK (reminder_minutes_before >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_queue_attempts_check'
      AND conrelid = 'public.reminder_queue'::regclass
  ) THEN
    ALTER TABLE public.reminder_queue
      ADD CONSTRAINT reminder_queue_attempts_check CHECK (retry_count >= 0 AND max_attempts > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_queue_chat_id_check'
      AND conrelid = 'public.reminder_queue'::regclass
  ) THEN
    ALTER TABLE public.reminder_queue
      ADD CONSTRAINT reminder_queue_chat_id_check CHECK (length(trim(telegram_chat_id)) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_queue_sent_status_check'
      AND conrelid = 'public.reminder_queue'::regclass
  ) THEN
    ALTER TABLE public.reminder_queue
      ADD CONSTRAINT reminder_queue_sent_status_check CHECK (
        (status = 'sent' AND sent_at IS NOT NULL)
        OR status <> 'sent'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'reminder_queue_cancelled_status_check'
      AND conrelid = 'public.reminder_queue'::regclass
  ) THEN
    ALTER TABLE public.reminder_queue
      ADD CONSTRAINT reminder_queue_cancelled_status_check CHECK (
        (status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR status <> 'cancelled'
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS reminder_queue_idempotency_key_key
  ON public.reminder_queue(idempotency_key);

CREATE INDEX IF NOT EXISTS idx_reminder_queue_due_pending
  ON public.reminder_queue(next_retry_at, remind_at, id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reminder_queue_event
  ON public.reminder_queue(planner_event_id);

CREATE INDEX IF NOT EXISTS idx_reminder_queue_user_status
  ON public.reminder_queue(user_id, status, remind_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminder_queue_locked_processing
  ON public.reminder_queue(locked_at)
  WHERE status = 'processing';

COMMENT ON TABLE public.reminder_queue IS
  'Durable Telegram reminder queue processed by Supabase Edge Function or service-role workers.';
COMMENT ON COLUMN public.reminder_queue.planner_event_id IS
  'Planner event that generated this reminder.';
COMMENT ON COLUMN public.reminder_queue.telegram_chat_id IS
  'Telegram chat identifier for a user, group, supergroup, or channel. Bot tokens are never stored here.';
COMMENT ON COLUMN public.reminder_queue.recipient_type IS
  'Telegram destination type: user, group, or channel.';
COMMENT ON COLUMN public.reminder_queue.remind_at IS
  'Original reminder due time.';
COMMENT ON COLUMN public.reminder_queue.next_retry_at IS
  'Next time a worker may attempt delivery. Used for retry backoff.';
COMMENT ON COLUMN public.reminder_queue.retry_count IS
  'Number of Telegram delivery attempts already made.';
COMMENT ON COLUMN public.reminder_queue.event_sequence IS
  'Planner event sequence captured when the reminder was queued; prevents stale sends after edits.';
COMMENT ON COLUMN public.reminder_queue.idempotency_key IS
  'Unique delivery key used to prevent duplicate reminders across retries and concurrent workers.';
COMMENT ON COLUMN public.reminder_queue.payload IS
  'Rendered or render-ready Telegram message payload.';

CREATE OR REPLACE FUNCTION public.planner_event_starts_at(p_event public.planner_events)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_event.is_all_day THEN (p_event.date::timestamp AT TIME ZONE 'Asia/Kolkata')
    WHEN p_event.start_time IS NOT NULL THEN ((p_event.date + p_event.start_time)::timestamp AT TIME ZONE 'Asia/Kolkata')
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.planner_event_starts_at(public.planner_events) IS
  'Returns the planner event start timestamp in Asia/Kolkata as timestamptz.';

CREATE OR REPLACE FUNCTION public.enqueue_planner_event_telegram_reminders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_start timestamptz;
  v_telegram jsonb;
  v_chat_id text;
  v_recipient_type public.telegram_recipient_type;
  v_minutes integer;
  v_minutes_values jsonb;
  v_remind_at timestamptz;
  v_idempotency_key text;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  v_event_start := public.planner_event_starts_at(NEW);
  IF v_event_start IS NULL THEN
    RETURN NEW;
  END IF;

  v_telegram := COALESCE(NEW.metadata -> 'telegram', '{}'::jsonb);
  v_chat_id := NULLIF(trim(v_telegram ->> 'chat_id'), '');

  IF v_chat_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_recipient_type := CASE
    WHEN v_telegram ->> 'recipient_type' IN ('user', 'group', 'channel')
      THEN (v_telegram ->> 'recipient_type')::public.telegram_recipient_type
    ELSE 'user'::public.telegram_recipient_type
  END;

  v_minutes_values := CASE
    WHEN jsonb_typeof(v_telegram -> 'reminder_minutes_before') = 'array'
      THEN v_telegram -> 'reminder_minutes_before'
    WHEN jsonb_typeof(NEW.metadata -> 'reminder_minutes_before') = 'array'
      THEN NEW.metadata -> 'reminder_minutes_before'
    WHEN v_telegram ? 'reminder_minutes_before'
      THEN jsonb_build_array(v_telegram -> 'reminder_minutes_before')
    WHEN NEW.metadata ? 'reminder_minutes_before'
      THEN jsonb_build_array(NEW.metadata -> 'reminder_minutes_before')
    ELSE '[]'::jsonb
  END;

  FOR v_minutes IN
    SELECT DISTINCT value_text::integer
    FROM jsonb_array_elements_text(v_minutes_values) AS reminder_values(value_text)
    WHERE value_text ~ '^\d+$'
  LOOP
    IF v_minutes < 0 THEN
      CONTINUE;
    END IF;

    v_remind_at := v_event_start - make_interval(mins => v_minutes);
    v_idempotency_key := concat_ws(
      ':',
      'planner_event',
      NEW.id::text,
      NEW.user_id::text,
      v_chat_id,
      v_minutes::text,
      NEW.sequence::text
    );

    INSERT INTO public.reminder_queue (
      planner_event_id,
      user_id,
      telegram_chat_id,
      recipient_type,
      reminder_minutes_before,
      event_sequence,
      remind_at,
      next_retry_at,
      idempotency_key,
      payload
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      v_chat_id,
      v_recipient_type,
      v_minutes,
      NEW.sequence,
      v_remind_at,
      GREATEST(v_remind_at, now()),
      v_idempotency_key,
      jsonb_build_object(
        'event_id', NEW.id,
        'title', NEW.title,
        'description', NEW.description,
        'location', NEW.location,
        'date', NEW.date,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'reminder_minutes_before', v_minutes
      )
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enqueue_planner_event_telegram_reminders() IS
  'Queues Telegram reminders for newly inserted planner events using metadata.telegram reminder settings.';

CREATE OR REPLACE FUNCTION public.claim_due_telegram_reminders(
  p_worker_id text DEFAULT NULL,
  p_batch_size integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  planner_event_id uuid,
  user_id uuid,
  telegram_chat_id text,
  recipient_type public.telegram_recipient_type,
  reminder_minutes_before integer,
  event_sequence integer,
  remind_at timestamptz,
  retry_count integer,
  max_attempts integer,
  payload jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_worker_id text := COALESCE(NULLIF(trim(p_worker_id), ''), concat('worker-', gen_random_uuid()::text));
  v_batch_size integer := LEAST(GREATEST(COALESCE(p_batch_size, 50), 1), 500);
BEGIN
  UPDATE public.reminder_queue
  SET status = 'pending',
      locked_at = NULL,
      locked_by = NULL,
      last_error = COALESCE(last_error, 'Processing lock expired before delivery completed'),
      updated_at = now()
  WHERE status = 'processing'
    AND locked_at < now() - interval '10 minutes'
    AND retry_count < max_attempts;

  RETURN QUERY
  WITH due_reminders AS (
    SELECT rq.id
    FROM public.reminder_queue rq
    JOIN public.planner_events pe
      ON pe.id = rq.planner_event_id
     AND pe.user_id = rq.user_id
    WHERE rq.status = 'pending'
      AND rq.remind_at <= now()
      AND rq.next_retry_at <= now()
      AND rq.retry_count < rq.max_attempts
      AND pe.status IN ('confirmed', 'tentative')
      AND pe.sequence = rq.event_sequence
    ORDER BY rq.remind_at ASC, rq.created_at ASC, rq.id ASC
    LIMIT v_batch_size
    FOR UPDATE OF rq SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.reminder_queue rq
    SET status = 'processing',
        locked_at = now(),
        locked_by = v_worker_id,
        last_error = NULL,
        updated_at = now()
    FROM due_reminders
    WHERE rq.id = due_reminders.id
    RETURNING
      rq.id,
      rq.planner_event_id,
      rq.user_id,
      rq.telegram_chat_id,
      rq.recipient_type,
      rq.reminder_minutes_before,
      rq.event_sequence,
      rq.remind_at,
      rq.retry_count,
      rq.max_attempts,
      rq.payload
  )
  SELECT
    claimed.id,
    claimed.planner_event_id,
    claimed.user_id,
    claimed.telegram_chat_id,
    claimed.recipient_type,
    claimed.reminder_minutes_before,
    claimed.event_sequence,
    claimed.remind_at,
    claimed.retry_count,
    claimed.max_attempts,
    claimed.payload
  FROM claimed;
END;
$$;

COMMENT ON FUNCTION public.claim_due_telegram_reminders(text, integer) IS
  'Atomically claims due pending Telegram reminders, marks them processing, and returns Telegram delivery payloads for a worker.';

REVOKE ALL ON FUNCTION public.claim_due_telegram_reminders(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_telegram_reminders(text, integer) TO service_role;

ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_queue ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_events TO authenticated;
GRANT ALL ON public.planner_events TO service_role;
GRANT SELECT ON public.reminder_queue TO authenticated;
GRANT ALL ON public.reminder_queue TO service_role;

DROP POLICY IF EXISTS "Users manage own planner events" ON public.planner_events;
CREATE POLICY "Users manage own planner events"
ON public.planner_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users read own reminder queue" ON public.reminder_queue;
CREATE POLICY "Users read own reminder queue"
ON public.reminder_queue
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_planner_events_updated ON public.planner_events;
CREATE TRIGGER trg_planner_events_updated
  BEFORE UPDATE ON public.planner_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_reminder_queue_updated ON public.reminder_queue;
CREATE TRIGGER trg_reminder_queue_updated
  BEFORE UPDATE ON public.reminder_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_enqueue_planner_event_telegram_reminders ON public.planner_events;
CREATE TRIGGER trg_enqueue_planner_event_telegram_reminders
  AFTER INSERT ON public.planner_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_planner_event_telegram_reminders();
