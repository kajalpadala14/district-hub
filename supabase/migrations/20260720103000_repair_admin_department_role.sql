-- Repair the dashboard admin account role so admin/manager-only RLS policies
-- can manage departments without opening department writes to every user.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE lower(email) = 'admin@district.gov.in'
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;

DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated can manage departments" ON public.departments;
DROP POLICY IF EXISTS "Admin manager departments insert" ON public.departments;
DROP POLICY IF EXISTS "Admin manager departments update" ON public.departments;
DROP POLICY IF EXISTS "Admin manager departments delete" ON public.departments;

CREATE POLICY "Authenticated can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin manager departments insert"
ON public.departments
FOR INSERT
TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Admin manager departments update"
ON public.departments
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Admin manager departments delete"
ON public.departments
FOR DELETE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));
