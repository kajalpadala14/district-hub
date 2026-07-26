-- Telegram Group Reminder System Migration
-- Creates telegram_reminder_logs for duplicate prevention across server restarts.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Telegram Reminder Logs (Duplicate Prevention Table)
CREATE TABLE IF NOT EXISTS public.telegram_reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id text NOT NULL,
  reminder_type text NOT NULL,
  scheduled_time text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT telegram_reminder_logs_unique_send UNIQUE (meeting_id, reminder_type, scheduled_time)
);

CREATE INDEX IF NOT EXISTS idx_telegram_reminder_logs_meeting ON public.telegram_reminder_logs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_telegram_reminder_logs_type ON public.telegram_reminder_logs(reminder_type);

ALTER TABLE public.telegram_reminder_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.telegram_reminder_logs TO service_role;
GRANT SELECT ON public.telegram_reminder_logs TO authenticated;
