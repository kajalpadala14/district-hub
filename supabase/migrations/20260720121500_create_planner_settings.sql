CREATE TABLE IF NOT EXISTS public.planner_settings (
  user_id uuid PRIMARY KEY,
  day_start time NOT NULL DEFAULT '10:00',
  day_end time NOT NULL DEFAULT '18:00',
  slot_min integer NOT NULL DEFAULT 30,
  gap_min integer NOT NULL DEFAULT 15,
  lunch_start time NOT NULL DEFAULT '13:30',
  lunch_end time NOT NULL DEFAULT '14:30',
  apple_ics_url text NOT NULL DEFAULT '',
  subscription_token text NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT planner_settings_slot_min_check CHECK (slot_min BETWEEN 5 AND 240),
  CONSTRAINT planner_settings_gap_min_check CHECK (gap_min BETWEEN 0 AND 120),
  CONSTRAINT planner_settings_subscription_token_key UNIQUE (subscription_token)
);

ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_settings TO authenticated;
GRANT ALL ON public.planner_settings TO service_role;

DROP POLICY IF EXISTS "Users manage own planner settings" ON public.planner_settings;
CREATE POLICY "Users manage own planner settings"
ON public.planner_settings
FOR ALL
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_planner_settings_updated ON public.planner_settings;
CREATE TRIGGER trg_planner_settings_updated
  BEFORE UPDATE ON public.planner_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
