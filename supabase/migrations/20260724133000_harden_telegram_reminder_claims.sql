-- Harden Telegram reminder queue claiming for already-deployed databases.
-- Replaces the claim function without requiring reminder_queue recreation.

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
  'Atomically claims due pending Telegram reminders, recovers stale processing locks, and returns Telegram delivery payloads for a worker.';

REVOKE ALL ON FUNCTION public.claim_due_telegram_reminders(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_due_telegram_reminders(text, integer) TO service_role;
