-- Employees are stored in public.profiles too, but they must belong to the
-- dashboard user who created them. Dashboard login profiles keep id = auth.uid().

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.profiles
SET owner_user_id = id
WHERE owner_user_id IS NULL
  AND (
    email ILIKE '%@review-dashboard.example.com'
    OR email ILIKE '%@district.gov.in'
    OR email = 'local.user@gov.local'
  );

CREATE INDEX IF NOT EXISTS idx_profiles_owner_user_id
ON public.profiles(owner_user_id);

CREATE OR REPLACE FUNCTION public.can_access_task(_task_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks task
    LEFT JOIN public.profiles assignee_profile
      ON assignee_profile.id = task.assignee_id
    WHERE task.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR task.created_by = auth.uid()
        OR task.assignee_id = auth.uid()
        OR task.assigned_to = auth.uid()
        OR assignee_profile.owner_user_id = auth.uid()
      )
  );
$$;

DROP POLICY IF EXISTS "Isolated profile select" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile update" ON public.profiles;
DROP POLICY IF EXISTS "Admin profile delete" ON public.profiles;

CREATE POLICY "Isolated profile select"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR id = auth.uid()
  OR owner_user_id = auth.uid()
);

CREATE POLICY "Isolated profile insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR id = auth.uid()
  OR owner_user_id = auth.uid()
);

CREATE POLICY "Isolated profile update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR id = auth.uid()
  OR owner_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR id = auth.uid()
  OR owner_user_id = auth.uid()
);

CREATE POLICY "Isolated profile delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR owner_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Isolated task select" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task insert" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task update" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task delete" ON public.tasks;

CREATE POLICY "Isolated task select"
ON public.tasks
FOR SELECT
TO authenticated
USING (public.can_access_task(id));

CREATE POLICY "Isolated task insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Isolated task update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.can_access_task(id))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

CREATE POLICY "Isolated task delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());
