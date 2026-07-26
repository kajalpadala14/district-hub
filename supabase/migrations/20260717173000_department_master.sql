CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;

DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
CREATE POLICY "Authenticated can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Authenticated can manage departments" ON public.departments;
CREATE POLICY "Authenticated can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_departments_updated ON public.departments;
CREATE TRIGGER trg_departments_updated
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.departments (name)
VALUES
  ('Agri and Allied'),
  ('Agriculture'),
  ('District Administration'),
  ('Education'),
  ('Health'),
  ('SBM'),
  ('Zila Panchayat')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name)
SELECT DISTINCT trim(department)
FROM public.profiles
WHERE department IS NOT NULL AND trim(department) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name)
SELECT DISTINCT trim(department)
FROM public.tasks
WHERE department IS NOT NULL AND trim(department) <> ''
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);
