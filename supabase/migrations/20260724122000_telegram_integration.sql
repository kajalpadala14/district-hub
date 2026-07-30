-- Create telegram_subscribers table
CREATE TABLE IF NOT EXISTS public.telegram_subscribers (
  chat_id text PRIMARY KEY,
  username text,
  first_name text,
  last_name text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.telegram_subscribers TO anon, authenticated, service_role;

-- Allow authenticated users to view subscribers list
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.telegram_subscribers;
CREATE POLICY "Enable read access for authenticated users" ON public.telegram_subscribers
  FOR SELECT TO authenticated USING (true);
