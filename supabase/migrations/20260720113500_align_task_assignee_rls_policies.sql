-- The frontend stores assigned employees in tasks.assignee_id. Some older
-- policies still checked tasks.assigned_to, so signed-in assignees could be
-- excluded from task-related reads/writes.

DROP POLICY IF EXISTS "Admin manager user task select" ON public.tasks;
DROP POLICY IF EXISTS "Admin manager task update and assigned status update" ON public.tasks;

CREATE POLICY "Admin manager user task select"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR assigned_to = auth.uid()
  OR assignee_id = auth.uid()
);

CREATE POLICY "Admin manager task update and assigned status update"
ON public.tasks
FOR UPDATE
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR assigned_to = auth.uid()
  OR assignee_id = auth.uid()
)
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR assigned_to = auth.uid()
  OR assignee_id = auth.uid()
);

DROP POLICY IF EXISTS "Task comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Task comments insert" ON public.task_comments;
DROP POLICY IF EXISTS "Task attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Task attachments insert" ON public.task_attachments;

CREATE POLICY "Task comments select"
ON public.task_comments
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_comments.task_id
      AND (t.assigned_to = auth.uid() OR t.assignee_id = auth.uid())
  )
);

CREATE POLICY "Task comments insert"
ON public.task_comments
FOR INSERT
TO authenticated
WITH CHECK (
  commented_by = auth.uid()
  AND (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_comments.task_id
        AND (t.assigned_to = auth.uid() OR t.assignee_id = auth.uid())
    )
  )
);

CREATE POLICY "Task attachments select"
ON public.task_attachments
FOR SELECT
TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
  OR EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = task_attachments.task_id
      AND (t.assigned_to = auth.uid() OR t.assignee_id = auth.uid())
  )
);

CREATE POLICY "Task attachments insert"
ON public.task_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND (
    public.has_any_role(auth.uid(), ARRAY['admin', 'manager'])
    OR EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_attachments.task_id
        AND (t.assigned_to = auth.uid() OR t.assignee_id = auth.uid())
    )
  )
);
