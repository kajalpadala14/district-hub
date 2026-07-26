# Environment Setup

## Files

- `.env`: real local values. Do not commit this file.
- `.env.example`: placeholder values for developers. Commit this file.
- Supabase Edge Function secrets: production/server values configured with Supabase, not shipped to the browser.

## Required Variables

Frontend-safe variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

These two values are included in the frontend bundle. Use only publishable/public keys here.

Server and Edge Function variables:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI
```

Never prefix secrets such as `SUPABASE_SERVICE_ROLE_KEY` or `GOOGLE_CLIENT_SECRET` with `VITE_`.

## Where To Get Values

- Supabase Project URL: Supabase dashboard, Project Settings, API.
- Supabase Publishable or anon key: Supabase dashboard, Project Settings, API.
- Supabase Service Role Key: Supabase dashboard, Project Settings, API. Treat this as a server-only admin secret.
- Google Client ID and Secret: Google Cloud Console, APIs and Services, Credentials, OAuth client.
- Google Redirect URI: your deployed Supabase function URL:

```text
https://<project-ref>.functions.supabase.co/google-calendar-oauth-callback
```

Add that same redirect URI to the Google OAuth client.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Replace placeholder values in `.env`.
3. Restart the dev server after changing env values.
4. For Google Calendar Edge Functions, set secrets in Supabase:

```bash
supabase secrets set GOOGLE_CLIENT_ID=...
supabase secrets set GOOGLE_CLIENT_SECRET=...
supabase secrets set GOOGLE_REDIRECT_URI=...
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions in deployed projects. If running locally, add them to the local function environment.

## Validation

The app validates required frontend variables during Supabase client startup. Server utilities validate server-only variables before creating privileged Supabase clients. Calendar Edge Functions validate required OAuth and Supabase secrets before they call Google APIs.

If a variable is missing, startup fails with a clear error listing the missing variable names.

## Security Rules

- Commit `.env.example`, never `.env`.
- Do not place server secrets in React components.
- Do not create `VITE_` variables for secrets.
- Rotate keys immediately if a real `.env` was previously committed or shared.
- Keep production secrets in the hosting provider or Supabase secret store.
- Avoid logging tokens, OAuth codes, refresh tokens, or service role keys.
