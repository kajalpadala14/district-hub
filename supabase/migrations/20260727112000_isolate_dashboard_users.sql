-- Enforce independent dashboard accounts:
-- - admin can see/manage all user-owned records
-- - every non-admin account can only see/manage records tied to auth.uid()

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
    WHERE task.id = _task_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR task.created_by = auth.uid()
        OR task.assignee_id = auth.uid()
        OR task.assigned_to = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid) TO authenticated, service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin manager profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Admin manager profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Admin manager profiles delete" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile select" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile update" ON public.profiles;
DROP POLICY IF EXISTS "Admin profile delete" ON public.profiles;

CREATE POLICY "Isolated profile select"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

CREATE POLICY "Isolated profile insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

CREATE POLICY "Isolated profile update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') OR id = auth.uid());

CREATE POLICY "Admin profile delete"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Isolated role select" ON public.user_roles;
DROP POLICY IF EXISTS "Admin role insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admin role update" ON public.user_roles;
DROP POLICY IF EXISTS "Admin role delete" ON public.user_roles;

CREATE POLICY "Isolated role select"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Admin role insert"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin role update"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin role delete"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can view tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins and managers create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins/managers update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins/managers update any task, assignees update own status" ON public.tasks;
DROP POLICY IF EXISTS "Admins delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Scoped task select" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task insert" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task update" ON public.tasks;
DROP POLICY IF EXISTS "Admin task delete" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager user task select" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task update and assigned status update" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task select" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task insert" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task update" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task delete" ON public.tasks;

CREATE POLICY "Isolated task select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR assigned_to = auth.uid()
);

CREATE POLICY "Isolated task insert"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Isolated task update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR assigned_to = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR created_by = auth.uid()
  OR assignee_id = auth.uid()
  OR assigned_to = auth.uid()
);

CREATE POLICY "Isolated task delete"
ON public.tasks
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can read task audit logs" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Users can write task audit logs" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Scoped task audit logs select" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Scoped task audit logs insert" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Isolated task audit logs select" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Isolated task audit logs insert" ON public.task_audit_logs;

CREATE POLICY "Isolated task audit logs select"
ON public.task_audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR actor_id = auth.uid()
  OR performed_by = auth.uid()
  OR public.can_access_task(task_id)
);

CREATE POLICY "Isolated task audit logs insert"
ON public.task_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR actor_id = auth.uid()
  OR performed_by = auth.uid()
  OR public.can_access_task(task_id)
);

DROP POLICY IF EXISTS "Task comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insert" ON public.task_comments;
DROP POLICY IF EXISTS "Isolated task comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Isolated task comments insert" ON public.task_comments;

CREATE POLICY "Isolated task comments select"
ON public.task_comments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.can_access_task(task_id));

CREATE POLICY "Isolated task comments insert"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  commented_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.can_access_task(task_id))
);

DROP POLICY IF EXISTS "Task attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Task attachments insert" ON public.task_attachments;
DROP POLICY IF EXISTS "Isolated task attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Isolated task attachments insert" ON public.task_attachments;

CREATE POLICY "Isolated task attachments select"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.can_access_task(task_id));

CREATE POLICY "Isolated task attachments insert"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.can_access_task(task_id))
);

DROP POLICY IF EXISTS "Isolated task notifications select" ON public.task_notifications;
DROP POLICY IF EXISTS "Isolated task notifications update" ON public.task_notifications;

CREATE POLICY "Isolated task notifications select"
ON public.task_notifications
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR user_id = auth.uid()
  OR public.can_access_task(task_id)
);

CREATE POLICY "Isolated task notifications update"
ON public.task_notifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid())
WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
