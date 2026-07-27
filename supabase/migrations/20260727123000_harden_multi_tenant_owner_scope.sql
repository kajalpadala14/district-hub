-- Final multi-tenant hardening pass.
-- Every business/support table gets an owner_user_id where practical, with
-- automatic backfill and RLS policies that keep normal users tenant-scoped.

CREATE OR REPLACE FUNCTION public.current_owner_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.task_owner_user_id(_task_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT task.created_by
  FROM public.tasks task
  WHERE task.id = _task_id;
$$;

CREATE OR REPLACE FUNCTION public.planner_event_owner_user_id(_event_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event.user_id
  FROM public.planner_events event
  WHERE event.id = _event_id;
$$;

CREATE OR REPLACE FUNCTION public.can_access_tenant_owner(_owner_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR _owner_user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_owner_user_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.task_owner_user_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.planner_event_owner_user_id(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_tenant_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_owner_user_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.task_owner_user_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.planner_event_owner_user_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_tenant_owner(uuid) TO authenticated, service_role;

ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.planner_events ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.planner_settings ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.task_comments ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.task_attachments ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.task_audit_logs ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.task_activity_logs ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.task_notifications ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.task_calendar_events ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.google_calendar_connections ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.google_calendar_oauth_states ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.calendar_integrations ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.calendar_events ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.calendar_sync_jobs ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.calendar_reminders ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.calendar_subscription_tokens ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.reminder_queue ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.telegram_reminder_logs ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.profiles profile
SET owner_user_id = profile.id
FROM auth.users auth_user
WHERE profile.owner_user_id IS NULL
  AND auth_user.id = profile.id;

UPDATE public.profiles profile
SET owner_user_id = admin_user.user_id
FROM (
  SELECT user_id
  FROM public.user_roles
  WHERE role = 'admin'
  ORDER BY created_at
  LIMIT 1
) admin_user
WHERE profile.owner_user_id IS NULL;

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
UPDATE public.tasks SET owner_user_id = COALESCE(owner_user_id, created_by) WHERE owner_user_id IS NULL;
UPDATE public.planner_events SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.planner_settings SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.task_comments child
SET owner_user_id = COALESCE(child.owner_user_id, public.task_owner_user_id(child.task_id), child.commented_by)
WHERE child.owner_user_id IS NULL;
UPDATE public.task_attachments child
SET owner_user_id = COALESCE(child.owner_user_id, public.task_owner_user_id(child.task_id), child.uploaded_by)
WHERE child.owner_user_id IS NULL;
UPDATE public.task_audit_logs child
SET owner_user_id = COALESCE(child.owner_user_id, public.task_owner_user_id(child.task_id), child.actor_id, child.performed_by)
WHERE child.owner_user_id IS NULL;
UPDATE public.task_activity_logs child
SET owner_user_id = COALESCE(child.owner_user_id, public.task_owner_user_id(child.task_id))
WHERE child.owner_user_id IS NULL;
UPDATE public.task_notifications child
SET owner_user_id = COALESCE(child.owner_user_id, public.task_owner_user_id(child.task_id), child.user_id)
WHERE child.owner_user_id IS NULL;
UPDATE public.task_calendar_events child
SET owner_user_id = COALESCE(child.owner_user_id, public.task_owner_user_id(child.task_id), child.user_id)
WHERE child.owner_user_id IS NULL;
UPDATE public.google_calendar_connections SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.google_calendar_oauth_states SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.calendar_integrations SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.calendar_events SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.calendar_sync_jobs SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.calendar_reminders SET owner_user_id = COALESCE(owner_user_id, created_by) WHERE owner_user_id IS NULL;
UPDATE public.calendar_subscription_tokens SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.reminder_queue SET owner_user_id = COALESCE(owner_user_id, user_id) WHERE owner_user_id IS NULL;
UPDATE public.telegram_reminder_logs log
SET owner_user_id = COALESCE(log.owner_user_id, public.planner_event_owner_user_id(log.meeting_id::uuid))
WHERE log.owner_user_id IS NULL
  AND log.meeting_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

CREATE INDEX IF NOT EXISTS idx_tasks_owner_user_id ON public.tasks(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_planner_events_owner_user_id ON public.planner_events(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_planner_settings_owner_user_id ON public.planner_settings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_owner_user_id ON public.task_comments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_owner_user_id ON public.task_attachments(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_task_audit_logs_owner_user_id ON public.task_audit_logs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_logs_owner_user_id ON public.task_activity_logs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_task_notifications_owner_user_id ON public.task_notifications(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_task_calendar_events_owner_user_id ON public.task_calendar_events(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_owner_user_id ON public.google_calendar_connections(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_oauth_states_owner_user_id ON public.google_calendar_oauth_states(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_owner_user_id ON public.calendar_integrations(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_owner_user_id ON public.calendar_events(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_sync_jobs_owner_user_id ON public.calendar_sync_jobs(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_owner_user_id ON public.calendar_reminders(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_subscription_tokens_owner_user_id ON public.calendar_subscription_tokens(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_queue_owner_user_id ON public.reminder_queue(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_reminder_logs_owner_user_id ON public.telegram_reminder_logs(owner_user_id);

CREATE OR REPLACE FUNCTION public.set_owner_from_auth_or_self()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_user_id = COALESCE(NEW.owner_user_id, auth.uid(), NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_task_owner_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_user_id = COALESCE(NEW.owner_user_id, NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_owner_from_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_user_id = COALESCE(NEW.owner_user_id, NEW.user_id, auth.uid());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_owner_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_user_id = COALESCE(NEW.owner_user_id, auth.uid());
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_task_child_owner_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_user_id = COALESCE(
    NEW.owner_user_id,
    public.task_owner_user_id(NEW.task_id),
    auth.uid()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_calendar_reminder_owner_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.owner_user_id = COALESCE(NEW.owner_user_id, NEW.created_by, auth.uid());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_owner_user_id ON public.profiles;
CREATE TRIGGER trg_profiles_owner_user_id
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_auth_or_self();

DROP TRIGGER IF EXISTS trg_departments_owner_user_id ON public.departments;
CREATE TRIGGER trg_departments_owner_user_id
  BEFORE INSERT OR UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_auth();

DROP TRIGGER IF EXISTS trg_tasks_owner_user_id ON public.tasks;
CREATE TRIGGER trg_tasks_owner_user_id
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_task_owner_user_id();

DROP TRIGGER IF EXISTS trg_planner_events_owner_user_id ON public.planner_events;
CREATE TRIGGER trg_planner_events_owner_user_id
  BEFORE INSERT OR UPDATE ON public.planner_events
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_planner_settings_owner_user_id ON public.planner_settings;
CREATE TRIGGER trg_planner_settings_owner_user_id
  BEFORE INSERT OR UPDATE ON public.planner_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_task_comments_owner_user_id ON public.task_comments;
CREATE TRIGGER trg_task_comments_owner_user_id
  BEFORE INSERT OR UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_task_child_owner_user_id();

DROP TRIGGER IF EXISTS trg_task_attachments_owner_user_id ON public.task_attachments;
CREATE TRIGGER trg_task_attachments_owner_user_id
  BEFORE INSERT OR UPDATE ON public.task_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_task_child_owner_user_id();

DROP TRIGGER IF EXISTS trg_task_audit_logs_owner_user_id ON public.task_audit_logs;
CREATE TRIGGER trg_task_audit_logs_owner_user_id
  BEFORE INSERT OR UPDATE ON public.task_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_task_child_owner_user_id();

DROP TRIGGER IF EXISTS trg_task_activity_logs_owner_user_id ON public.task_activity_logs;
CREATE TRIGGER trg_task_activity_logs_owner_user_id
  BEFORE INSERT OR UPDATE ON public.task_activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_task_child_owner_user_id();

DROP TRIGGER IF EXISTS trg_task_notifications_owner_user_id ON public.task_notifications;
CREATE TRIGGER trg_task_notifications_owner_user_id
  BEFORE INSERT OR UPDATE ON public.task_notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_task_child_owner_user_id();

DROP TRIGGER IF EXISTS trg_task_calendar_events_owner_user_id ON public.task_calendar_events;
CREATE TRIGGER trg_task_calendar_events_owner_user_id
  BEFORE INSERT OR UPDATE ON public.task_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_task_child_owner_user_id();

DROP TRIGGER IF EXISTS trg_google_calendar_connections_owner_user_id ON public.google_calendar_connections;
CREATE TRIGGER trg_google_calendar_connections_owner_user_id
  BEFORE INSERT OR UPDATE ON public.google_calendar_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_google_calendar_oauth_states_owner_user_id ON public.google_calendar_oauth_states;
CREATE TRIGGER trg_google_calendar_oauth_states_owner_user_id
  BEFORE INSERT OR UPDATE ON public.google_calendar_oauth_states
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_calendar_integrations_owner_user_id ON public.calendar_integrations;
CREATE TRIGGER trg_calendar_integrations_owner_user_id
  BEFORE INSERT OR UPDATE ON public.calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_calendar_events_owner_user_id ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_owner_user_id
  BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_calendar_sync_jobs_owner_user_id ON public.calendar_sync_jobs;
CREATE TRIGGER trg_calendar_sync_jobs_owner_user_id
  BEFORE INSERT OR UPDATE ON public.calendar_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_calendar_reminders_owner_user_id ON public.calendar_reminders;
CREATE TRIGGER trg_calendar_reminders_owner_user_id
  BEFORE INSERT OR UPDATE ON public.calendar_reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_calendar_reminder_owner_user_id();

DROP TRIGGER IF EXISTS trg_calendar_subscription_tokens_owner_user_id ON public.calendar_subscription_tokens;
CREATE TRIGGER trg_calendar_subscription_tokens_owner_user_id
  BEFORE INSERT OR UPDATE ON public.calendar_subscription_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

DROP TRIGGER IF EXISTS trg_reminder_queue_owner_user_id ON public.reminder_queue;
CREATE TRIGGER trg_reminder_queue_owner_user_id
  BEFORE INSERT OR UPDATE ON public.reminder_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_owner_from_user_id();

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
        OR task.owner_user_id = auth.uid()
        OR task.created_by = auth.uid()
        OR task.assignee_id = auth.uid()
        OR task.assigned_to = auth.uid()
        OR assignee_profile.owner_user_id = auth.uid()
      )
  );
$$;

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
WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Isolated task update"
ON public.tasks
FOR UPDATE TO authenticated
USING (public.can_access_task(id))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR owner_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Isolated task delete"
ON public.tasks
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR owner_user_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users manage own planner events" ON public.planner_events;
CREATE POLICY "Users manage own planner events"
ON public.planner_events
FOR ALL TO authenticated
USING (public.can_access_tenant_owner(owner_user_id))
WITH CHECK (public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Users manage own planner settings" ON public.planner_settings;
CREATE POLICY "Users manage own planner settings"
ON public.planner_settings
FOR ALL TO authenticated
USING (public.can_access_tenant_owner(owner_user_id))
WITH CHECK (public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Isolated task comments select" ON public.task_comments;
DROP POLICY IF EXISTS "Isolated task comments insert" ON public.task_comments;
CREATE POLICY "Isolated task comments select"
ON public.task_comments
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id));
CREATE POLICY "Isolated task comments insert"
ON public.task_comments
FOR INSERT TO authenticated
WITH CHECK (commented_by = auth.uid() AND public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Isolated task attachments select" ON public.task_attachments;
DROP POLICY IF EXISTS "Isolated task attachments insert" ON public.task_attachments;
CREATE POLICY "Isolated task attachments select"
ON public.task_attachments
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id));
CREATE POLICY "Isolated task attachments insert"
ON public.task_attachments
FOR INSERT TO authenticated
WITH CHECK (uploaded_by = auth.uid() AND public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Isolated task audit logs select" ON public.task_audit_logs;
DROP POLICY IF EXISTS "Isolated task audit logs insert" ON public.task_audit_logs;
CREATE POLICY "Isolated task audit logs select"
ON public.task_audit_logs
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id) OR actor_id = auth.uid() OR performed_by = auth.uid());
CREATE POLICY "Isolated task audit logs insert"
ON public.task_audit_logs
FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant_owner(owner_user_id) OR actor_id = auth.uid() OR performed_by = auth.uid());

DROP POLICY IF EXISTS "Isolated task activity logs select" ON public.task_activity_logs;
DROP POLICY IF EXISTS "Isolated task activity logs insert" ON public.task_activity_logs;
CREATE POLICY "Isolated task activity logs select"
ON public.task_activity_logs
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id));
CREATE POLICY "Isolated task activity logs insert"
ON public.task_activity_logs
FOR INSERT TO authenticated
WITH CHECK (public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Isolated task notifications select" ON public.task_notifications;
DROP POLICY IF EXISTS "Isolated task notifications update" ON public.task_notifications;
CREATE POLICY "Isolated task notifications select"
ON public.task_notifications
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id) OR user_id = auth.uid());
CREATE POLICY "Isolated task notifications update"
ON public.task_notifications
FOR UPDATE TO authenticated
USING (public.can_access_tenant_owner(owner_user_id) OR user_id = auth.uid())
WITH CHECK (public.can_access_tenant_owner(owner_user_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can read their task calendar events" ON public.task_calendar_events;
CREATE POLICY "Users can read their task calendar events"
ON public.task_calendar_events
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own calendar events" ON public.calendar_events;
CREATE POLICY "Users read own calendar events"
ON public.calendar_events
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own calendar reminders" ON public.calendar_reminders;
CREATE POLICY "Users manage own calendar reminders"
ON public.calendar_reminders
FOR ALL TO authenticated
USING (public.can_access_tenant_owner(owner_user_id))
WITH CHECK (public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Users manage own calendar subscription tokens" ON public.calendar_subscription_tokens;
CREATE POLICY "Users manage own calendar subscription tokens"
ON public.calendar_subscription_tokens
FOR ALL TO authenticated
USING (public.can_access_tenant_owner(owner_user_id))
WITH CHECK (public.can_access_tenant_owner(owner_user_id));

DROP POLICY IF EXISTS "Users read own reminder queue" ON public.reminder_queue;
CREATE POLICY "Users read own reminder queue"
ON public.reminder_queue
FOR SELECT TO authenticated
USING (public.can_access_tenant_owner(owner_user_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own telegram reminder logs" ON public.telegram_reminder_logs;
CREATE POLICY "Users read own telegram reminder logs"
ON public.telegram_reminder_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR owner_user_id = auth.uid());
