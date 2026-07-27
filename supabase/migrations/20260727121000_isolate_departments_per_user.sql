-- Department masters belong to the dashboard user who created them.
-- Admin users can see all department masters; normal users only see their own.

ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.departments department
SET owner_user_id = admin_user.user_id
FROM (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1
) admin_user
WHERE department.owner_user_id IS NULL;

ALTER TABLE public.departments
DROP CONSTRAINT IF EXISTS departments_name_key;

DROP INDEX IF EXISTS idx_departments_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_owner_name_unique
ON public.departments(owner_user_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_departments_owner_user_id
ON public.departments(owner_user_id);

DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admin manager departments insert" ON public.departments;
DROP POLICY IF EXISTS "Admin manager departments update" ON public.departments;
DROP POLICY IF EXISTS "Admin manager departments delete" ON public.departments;
DROP POLICY IF EXISTS "Isolated department select" ON public.departments;
DROP POLICY IF EXISTS "Isolated department insert" ON public.departments;
DROP POLICY IF EXISTS "Isolated department update" ON public.departments;
DROP POLICY IF EXISTS "Isolated department delete" ON public.departments;

CREATE POLICY "Isolated department select"
ON public.departments
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR owner_user_id = auth.uid()
);

CREATE POLICY "Isolated department insert"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR owner_user_id = auth.uid()
);

CREATE POLICY "Isolated department update"
ON public.departments
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR owner_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR owner_user_id = auth.uid()
);

CREATE POLICY "Isolated department delete"
ON public.departments
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR owner_user_id = auth.uid()
);
