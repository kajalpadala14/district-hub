CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.planner_events
  ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 0;

UPDATE public.planner_settings
SET ics_token = COALESCE(NULLIF(ics_token, ''), NULLIF(subscription_token, ''), encode(gen_random_bytes(18), 'hex')),
    subscription_token = COALESCE(NULLIF(ics_token, ''), NULLIF(subscription_token, ''), encode(gen_random_bytes(18), 'hex'))
WHERE ics_token IS DISTINCT FROM subscription_token
   OR NULLIF(ics_token, '') IS NULL
   OR NULLIF(subscription_token, '') IS NULL;

ALTER TABLE public.planner_settings
  ALTER COLUMN subscription_token SET NOT NULL,
  ALTER COLUMN ics_token SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_planner_settings_calendar_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ics_token := COALESCE(NULLIF(NEW.ics_token, ''), NULLIF(NEW.subscription_token, ''), encode(gen_random_bytes(18), 'hex'));
  NEW.subscription_token := COALESCE(NULLIF(NEW.subscription_token, ''), NEW.ics_token);

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_token := NEW.ics_token;
    NEW.apple_calendar_url := COALESCE(NEW.apple_calendar_url, NEW.apple_ics_url, '');
    NEW.apple_ics_url := COALESCE(NEW.apple_ics_url, NEW.apple_calendar_url, '');
    RETURN NEW;
  END IF;

  IF NEW.ics_token IS DISTINCT FROM OLD.ics_token THEN
    NEW.subscription_token := NEW.ics_token;
  ELSIF NEW.subscription_token IS DISTINCT FROM OLD.subscription_token THEN
    NEW.ics_token := NEW.subscription_token;
  ELSIF NEW.ics_token IS DISTINCT FROM NEW.subscription_token THEN
    NEW.subscription_token := NEW.ics_token;
  END IF;

  IF NEW.apple_calendar_url IS DISTINCT FROM OLD.apple_calendar_url THEN
    NEW.apple_ics_url := COALESCE(NEW.apple_calendar_url, '');
  ELSIF NEW.apple_ics_url IS DISTINCT FROM OLD.apple_ics_url THEN
    NEW.apple_calendar_url := COALESCE(NEW.apple_ics_url, '');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bump_planner_event_sequence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'updated_at' - 'sequence' - 'created_at')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'updated_at' - 'sequence' - 'created_at') THEN
    NEW.sequence := COALESCE(OLD.sequence, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_events_sequence ON public.planner_events;
CREATE TRIGGER trg_planner_events_sequence
  BEFORE UPDATE ON public.planner_events
  FOR EACH ROW
  EXECUTE FUNCTION public.bump_planner_event_sequence();

CREATE OR REPLACE FUNCTION public.rotate_planner_subscription_token(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  day_start time,
  day_end time,
  slot_min integer,
  gap_min integer,
  lunch_start time,
  lunch_end time,
  apple_ics_url text,
  apple_calendar_url text,
  subscription_token text,
  ics_token text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.planner_settings%ROWTYPE;
  v_token text;
  v_existing_settings_found boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT (auth.uid() = p_user_id OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Not authorized to rotate planner subscription token'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_settings
  FROM public.planner_settings ps
  WHERE ps.user_id = p_user_id
  FOR UPDATE;

  v_existing_settings_found := FOUND;

  LOOP
    v_token := encode(gen_random_bytes(32), 'hex');
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.planner_settings ps
      WHERE ps.subscription_token = v_token OR ps.ics_token = v_token
    );
  END LOOP;

  IF NOT v_existing_settings_found THEN
    INSERT INTO public.planner_settings (user_id, subscription_token, ics_token)
    VALUES (p_user_id, v_token, v_token)
    RETURNING * INTO v_settings;
  ELSE
    UPDATE public.planner_settings ps
    SET subscription_token = v_token,
        ics_token = v_token,
        updated_at = now()
    WHERE ps.user_id = p_user_id
    RETURNING * INTO v_settings;
  END IF;

  RETURN QUERY
  SELECT
    v_settings.user_id,
    v_settings.day_start,
    v_settings.day_end,
    v_settings.slot_min,
    v_settings.gap_min,
    v_settings.lunch_start,
    v_settings.lunch_end,
    v_settings.apple_ics_url,
    v_settings.apple_calendar_url,
    v_settings.subscription_token,
    v_settings.ics_token;
END;
$$;

REVOKE ALL ON FUNCTION public.rotate_planner_subscription_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rotate_planner_subscription_token(uuid) TO authenticated;
