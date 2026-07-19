-- Security hardening for frontend-facing Supabase tables.

DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins/managers update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins delete tasks" ON public.tasks;

CREATE POLICY "Scoped task select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR created_by = auth.uid()
  OR assignee_id = auth.uid()
);

CREATE POLICY "Admin manager task insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  AND created_by = auth.uid()
);

CREATE POLICY "Admin manager task update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'manager']));

CREATE POLICY "Admin task delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can read task audit logs" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Users can write task audit logs" ON public.task_audit_logs;

CREATE POLICY "Scoped task audit logs select"
ON public.task_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR actor_id = auth.uid()
  OR performed_by = auth.uid()
);

CREATE POLICY "Scoped task audit logs insert"
ON public.task_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR actor_id = auth.uid()
  OR performed_by = auth.uid()
);

DROP POLICY IF EXISTS "Authenticated can view departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated can manage departments" ON public.departments;

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

DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can manage profiles" ON public.profiles;

CREATE POLICY "Authenticated can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

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
