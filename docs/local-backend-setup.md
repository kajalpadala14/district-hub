# Local Backend Setup

## Current Project

Supabase project id:

```text
lqvmldzhfcedsgznrpms
```

Backend features in this project:

- Supabase database migrations
- Task audit logs
- Google Calendar OAuth connection storage
- Google Calendar sync Edge Functions
- Task create/update/delete calendar sync

## 1. Install Required Tools

Install Docker Desktop:

```text
https://www.docker.com/products/docker-desktop/
```

Install Supabase CLI:

```bash
npm install -g supabase
```

Verify:

```bash
docker --version
supabase --version
```

On Windows PowerShell, use the `.cmd` shim if `supabase` is blocked by script execution policy:

```powershell
supabase.cmd --version
```

## 2. Configure Environment

Copy placeholders:

```bash
copy .env.example .env
```

Fill real values in `.env`.

Check local config without printing secrets:

```bash
npm run backend:check-env
```

## 3. Start Local Supabase

```bash
supabase start
```

This starts local Postgres, Auth, Storage, Realtime, and Edge Function runtime.

## 4. Apply Database Migrations

For local database:

```bash
supabase db reset
```

For linked remote project:

```bash
supabase link --project-ref lqvmldzhfcedsgznrpms
supabase db push
```

## 5. Configure Edge Function Secrets

For remote Supabase:

```bash
supabase secrets set GOOGLE_CLIENT_ID=your-google-client-id
supabase secrets set GOOGLE_CLIENT_SECRET=your-google-client-secret
supabase secrets set GOOGLE_REDIRECT_URI=https://lqvmldzhfcedsgznrpms.functions.supabase.co/google-calendar-oauth-callback
```

For local function testing, create `supabase/.env.local` with the same values. Do not commit it.

## 6. Serve Edge Functions Locally

```bash
supabase functions serve google-calendar-auth-url --env-file supabase/.env.local
supabase functions serve google-calendar-oauth-callback --env-file supabase/.env.local
supabase functions serve google-calendar-sync --env-file supabase/.env.local
supabase functions serve google-calendar-delete --env-file supabase/.env.local
```

## 7. Deploy Edge Functions

```bash
supabase functions deploy google-calendar-auth-url
supabase functions deploy google-calendar-oauth-callback
supabase functions deploy google-calendar-sync
supabase functions deploy google-calendar-delete
```

## 8. Google Cloud Setup

In Google Cloud Console:

1. Enable Google Calendar API.
2. Create OAuth Client ID.
3. Add redirect URI:

```text
https://lqvmldzhfcedsgznrpms.functions.supabase.co/google-calendar-oauth-callback
```

For local testing, also add:

```text
http://127.0.0.1:54321/functions/v1/google-calendar-oauth-callback
```

## 9. Test Flow

1. Run the frontend:

```bash
npm run dev
```

2. Open Tasks.
3. Click `Connect Google`.
4. Create a task with `Sync with Google Calendar` enabled.
5. Confirm the table badge changes to `Synced`.
6. Click `Open in Google Calendar`.
7. Edit the task and verify the event updates.
8. Delete the task and verify the event is removed.

## 10. Security Checklist

- `.env` is ignored by Git.
- `.env.example` contains placeholders only.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- `GOOGLE_CLIENT_SECRET` is server-only.
- No secret variables use `VITE_`.
- Rotate any key that was previously committed.

## Troubleshooting

If Vite shows missing files from `node_modules/.vite/deps`, clear the Vite optimizer cache and restart the dev server:

```powershell
Remove-Item -LiteralPath node_modules\.vite -Recurse -Force
npm run dev -- --force
```

Do not use CMD-style `rmdir /s /q` inside PowerShell. If you need CMD syntax, run it through `cmd /c`:

```powershell
cmd /c rmdir /s /q node_modules\.vite
```
