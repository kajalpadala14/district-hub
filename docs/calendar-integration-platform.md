# Calendar Integration Platform

This module is designed so Google, Apple, Outlook, ICS export, and WebCal subscription feeds share the same data model and sync pipeline.

## Database

Migration:

- `supabase/migrations/20260717162000_calendar_integration_platform.sql`

Main tables:

- `calendar_integrations`
  - one row per connected user/provider/account
  - `provider` is text, so new providers do not need schema changes
  - `access_token` and `refresh_token` store encrypted token payloads only
- `calendar_events`
  - maps dashboard sources to provider events
  - source types: `task`, `planner`, `meeting`, `reminder`
  - status values: `synced`, `pending`, `failed`, `disabled`
- `calendar_sync_jobs`
  - queue for background sync/retry
- `calendar_reminders`
  - multiple reminders per source
- `calendar_subscription_tokens`
  - tokenized ICS/WebCal feeds

## Backend APIs

Base route: `/calendar`

- `GET /calendar/status`
- `POST /calendar/connect/:provider`
- `GET /calendar/oauth/:provider/callback`
- `POST /calendar/disconnect/:provider`
- `POST /calendar/sync`
- `POST /calendar/subscriptions`
- `DELETE /calendar/subscriptions/:id`
- `GET /calendar/export.ics`
- `GET /calendar/feed.ics?token=<token>`

Providers currently scaffolded:

- `google`
- `outlook`
- `ics`
- `apple`

Apple and generic calendar apps are supported through ICS/WebCal feeds.

## Environment

Required server values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CALENDAR_TOKEN_ENCRYPTION_KEY`
- `APP_BASE_URL`

Google:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

Outlook:

- `OUTLOOK_CLIENT_ID`
- `OUTLOOK_CLIENT_SECRET`
- `OUTLOOK_REDIRECT_URI`

Frontend:

- `VITE_API_BASE_URL`

Never prefix OAuth secrets or token encryption keys with `VITE_`.

## Sync Flow

Task create/update/delete:

1. Task is saved.
2. If calendar sync is enabled, a `calendar_sync_jobs` row is queued.
3. A worker can process pending jobs with reusable provider services.

Run pending background jobs:

```bash
npm run api:calendar-jobs
```

Schedule that command in Railway cron, PM2 cron, Windows Task Scheduler, or any production scheduler.

Manual sync:

```json
POST /calendar/sync
{
  "source_type": "task",
  "source_id": "<uuid>",
  "provider": "google",
  "background": false
}
```

ICS/WebCal:

- Use `GET /calendar/export.ics` for authenticated download.
- Use `GET /calendar/feed.ics?token=<token>` for Apple/Outlook subscription.

## Adding A Provider Later

Add a provider config in `server/services/calendarService.js` and implement the provider upsert/delete function. No database change is required because provider and source types are text.

## Security

- Tokens are encrypted before storage with AES-256-GCM.
- Raw access/refresh tokens are never returned by APIs.
- Public feed URLs use hashed random tokens.
- Secrets remain backend-only.

## Provider Support

- Google Calendar: OAuth connect, token refresh, create/update event.
- Outlook Calendar: OAuth connect, token refresh, create/update event through Microsoft Graph.
- Apple Calendar: WebCal/ICS subscription feed.
- Generic calendar apps: HTTPS `.ics` export and WebCal subscription.

Existing Supabase Edge Functions still support the earlier Google task flow. The Node backend now provides the provider-neutral implementation for future growth.
