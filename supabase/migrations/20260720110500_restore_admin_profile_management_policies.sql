-- Allow dashboard admins/managers to manage employee profile rows.
-- Regular users can still only create or update their own profile.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Admin manager profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Admin manager profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Admin manager profiles delete" ON public.profiles;

CREATE POLICY "Admin manager profiles insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Admin manager profiles update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']) OR id = auth.uid())
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']) OR id = auth.uid());

CREATE POLICY "Admin manager profiles delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));
