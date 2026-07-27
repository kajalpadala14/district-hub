-- Enforce owner-only workspaces for every authenticated account.
-- No admin bypass is allowed for workspace/business data. Existing rows remain
-- untouched and stay attached to their current owner_user_id/user_id.

CREATE OR REPLACE FUNCTION public.can_access_tenant_owner(_owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _owner_user_id = auth.uid();
$$;

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
        task.owner_user_id = auth.uid()
        OR task.created_by = auth.uid()
        OR task.assignee_id = auth.uid()
        OR task.assigned_to = auth.uid()
        OR assignee_profile.owner_user_id = auth.uid()
      )
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_tenant_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_tenant_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_task(uuid) TO authenticated, service_role;

DO $$
DECLARE
  target_table text;
  policy_name text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'profiles',
    'user_roles',
    'departments',
    'tasks',
    'planner_events',
    'planner_settings',
    'task_comments',
    'task_attachments',
    'task_audit_logs',
    'task_activity_logs',
    'task_notifications',
    'task_calendar_events',
    'calendar_events',
    'calendar_reminders',
    'calendar_subscription_tokens',
    'reminder_queue',
    'telegram_reminder_logs'
  ]
  LOOP
    FOR policy_name IN
      SELECT pol.polname
      FROM pg_policy pol
      JOIN pg_class cls ON cls.oid = pol.polrelid
      JOIN pg_namespace ns ON ns.oid = cls.relnamespace
      WHERE ns.nspname = 'public'
        AND cls.relname = target_table
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, target_table);
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_subscription_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_reminder_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolated profile select" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile insert" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile update" ON public.profiles;
DROP POLICY IF EXISTS "Isolated profile delete" ON public.profiles;
DROP POLICY IF EXISTS "Admin profile delete" ON public.profiles;

CREATE POLICY "Isolated profile select"
ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR owner_user_id = auth.uid());

CREATE POLICY "Isolated profile insert"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid() OR owner_user_id = auth.uid());

CREATE POLICY "Isolated profile update"
ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid() OR owner_user_id = auth.uid())
WITH CHECK (id = auth.uid() OR owner_user_id = auth.uid());

CREATE POLICY "Isolated profile delete"
ON public.profiles
FOR DELETE TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Isolated role select" ON public.user_roles;
DROP POLICY IF EXISTS "Admin role insert" ON public.user_roles;
DROP POLICY IF EXISTS "Admin role update" ON public.user_roles;
DROP POLICY IF EXISTS "Admin role delete" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated can view roles" ON public.user_roles;

CREATE POLICY "Isolated role select"
ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Isolated department select" ON public.departments;
DROP POLICY IF EXISTS "Isolated department insert" ON public.departments;
DROP POLICY IF EXISTS "Isolated department update" ON public.departments;
DROP POLICY IF EXISTS "Isolated department delete" ON public.departments;

CREATE POLICY "Isolated department select"
ON public.departments
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "Isolated department insert"
ON public.departments
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Isolated department update"
ON public.departments
FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Isolated department delete"
ON public.departments
FOR DELETE TO authenticated
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Isolated task select" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task insert" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task update" ON public.tasks;
DROP POLICY IF EXISTS "Isolated task delete" ON public.tasks;

CREATE POLICY "Isolated task select"
ON public.tasks
FOR SELECT TO authenticated
USING (public.can_access_task(id));

CREATE POLICY "Isolated task insert"
ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Isolated task update"
ON public.tasks
FOR UPDATE TO authenticated
USING (public.can_access_task(id))
WITH CHECK (owner_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Isolated task delete"
ON public.tasks
FOR DELETE TO authenticated
USING (owner_user_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users manage own planner events" ON public.planner_events;
CREATE POLICY "Users manage own planner events"
ON public.planner_events
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own planner settings" ON public.planner_settings;
CREATE POLICY "Users manage own planner settings"
ON public.planner_settings
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Isolated task comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Isolated task comments insert" ON public.task_comments;
CREATE POLICY "Isolated task comments select"
ON public.task_comments
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());
CREATE POLICY "Isolated task comments insert"
ON public.task_comments
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid() AND commented_by = auth.uid());

DROP POLICY IF EXISTS "Isolated task attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Isolated task attachments insert" ON public.task_attachments;
CREATE POLICY "Isolated task attachments select"
ON public.task_attachments
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());
CREATE POLICY "Isolated task attachments insert"
ON public.task_attachments
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid() AND uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Isolated task audit logs select" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Isolated task audit logs insert" ON public.task_audit_logs;
CREATE POLICY "Isolated task audit logs select"
ON public.task_audit_logs
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR actor_id = auth.uid() OR performed_by = auth.uid());
CREATE POLICY "Isolated task audit logs insert"
ON public.task_audit_logs
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid() OR actor_id = auth.uid() OR performed_by = auth.uid());

DROP POLICY IF EXISTS "Isolated task activity logs select" ON public.task_activity_logs;
DROP POLICY IF EXISTS "Isolated task activity logs insert" ON public.task_activity_logs;
CREATE POLICY "Isolated task activity logs select"
ON public.task_activity_logs
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());
CREATE POLICY "Isolated task activity logs insert"
ON public.task_activity_logs
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Isolated task notifications select" ON public.task_notifications;
DROP POLICY IF EXISTS "Isolated task notifications update" ON public.task_notifications;
CREATE POLICY "Isolated task notifications select"
ON public.task_notifications
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "Isolated task notifications update"
ON public.task_notifications
FOR UPDATE TO authenticated
USING (owner_user_id = auth.uid() OR user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read their task calendar events" ON public.task_calendar_events;
CREATE POLICY "Users can read their task calendar events"
ON public.task_calendar_events
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own calendar events" ON public.calendar_events;
CREATE POLICY "Users read own calendar events"
ON public.calendar_events
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own calendar reminders" ON public.calendar_reminders;
CREATE POLICY "Users manage own calendar reminders"
ON public.calendar_reminders
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own calendar subscription tokens" ON public.calendar_subscription_tokens;
CREATE POLICY "Users manage own calendar subscription tokens"
ON public.calendar_subscription_tokens
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own reminder queue" ON public.reminder_queue;
CREATE POLICY "Users read own reminder queue"
ON public.reminder_queue
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own telegram reminder logs" ON public.telegram_reminder_logs;
CREATE POLICY "Users read own telegram reminder logs"
ON public.telegram_reminder_logs
FOR SELECT TO authenticated
USING (owner_user_id = auth.uid());
