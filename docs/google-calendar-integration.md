# Google Calendar Integration

## Overview

The task module supports Google Calendar synchronization through Supabase Edge Functions. Browser code only requests actions; OAuth tokens are stored in server-side tables and used by Edge Functions with the service role key.

## User Flow

1. Open `Tasks`.
2. Click `Connect Google`.
3. Approve Google Calendar access.
4. Create or edit a task and enable `Sync with Google Calendar`.
5. The task is created or updated in Google Calendar using:
   - task title as event title
   - task description as event description
   - due date and due time as event start
   - a 30 minute event duration
   - email reminder 24 hours before
   - popup reminder 60 minutes before

Synced tasks show a calendar status badge in the task table. Failed tasks show `Sync Failed` and expose a retry action.

## Database Changes

Migration: `supabase/migrations/20260717132000_google_calendar_integration.sql`

Task columns:

- `due_time`
- `calendar_sync_enabled`
- `google_calendar_event_id`
- `calendar_event_html_link`
- `calendar_sync_status`
- `calendar_last_synced_at`
- `calendar_sync_error`
- `calendar_retry_count`

Supporting tables:

- `google_calendar_connections`: stores OAuth tokens. It is not granted to authenticated clients.
- `google_calendar_connection_status`: safe client view without tokens.
- `google_calendar_oauth_states`: short-lived OAuth state values.
- `task_calendar_events`: per-user Google event mapping for task owner and assigned user calendars.
- `task_audit_logs`: audit trail for task and calendar actions.

## Edge Functions

- `google-calendar-auth-url`: creates a Google OAuth URL.
- `google-calendar-oauth-callback`: exchanges OAuth code for tokens.
- `google-calendar-sync`: creates or updates task events.
- `google-calendar-delete`: removes task events from Google Calendar.

## Environment Variables

Use `.env.example` for placeholder values and keep real credentials in `.env` or Supabase secrets. Full setup guidance is in `docs/environment-setup.md`.

Configure these for Supabase Edge Functions:

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://<project-ref>.functions.supabase.co/google-calendar-oauth-callback
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

In Google Cloud Console, enable Google Calendar API and add `GOOGLE_REDIRECT_URI` as an authorized redirect URI for the OAuth client.

## Security Notes

- Google refresh tokens are never sent to the browser.
- Clients can only read connection status through a token-free view.
- Task sync functions verify the current Supabase user can access the task.
- Admin/manager role checks reuse the existing `user_roles` table.
- Assigned-user calendar support is per connected assignee. If the assignee has not connected Google Calendar, sync skips their calendar and records the task owner event.

## Retry Behavior

When sync fails, `calendar_sync_status` becomes `failed`, `calendar_sync_error` stores the message, and `calendar_retry_count` increments. The task table shows a retry button for failed syncs.

## Deployment

```bash
supabase db push
supabase functions deploy google-calendar-auth-url
supabase functions deploy google-calendar-oauth-callback
supabase functions deploy google-calendar-sync
supabase functions deploy google-calendar-delete
```

After deployment, create a test task with sync enabled, verify the table badge changes to `Synced`, and open the event from `Open in Google Calendar`.
