# Telegram Bot Edge Function

Folder structure:

```text
supabase/functions/telegram-bot/
  index.ts
  README.md
```

## Environment Variables

Set these as Supabase Edge Function secrets:

```bash
supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
supabase secrets set TELEGRAM_BOT_TOKEN="<bot-token-from-botfather>"
supabase secrets set TELEGRAM_WEBHOOK_SECRET="<random-long-secret>"
supabase secrets set PLANNER_PUBLIC_BASE_URL="https://<your-app-domain>"
```

`PLANNER_PUBLIC_BASE_URL` is optional and only used in the `/connect` reply. Keep
`TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`
out of the frontend.

## Deploy

```bash
supabase functions deploy telegram-bot --no-verify-jwt
```

## Register Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<project-ref>.functions.supabase.co/telegram-bot",
    "secret_token": "'"$TELEGRAM_WEBHOOK_SECRET"'",
    "allowed_updates": ["message"]
  }'
```

Check status:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

## Local Testing

Start the function locally:

```bash
supabase functions serve telegram-bot --no-verify-jwt --env-file .env
```

Send a `/start` test update:

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/telegram-bot" \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: $TELEGRAM_WEBHOOK_SECRET" \
  -d '{
    "update_id": 1000001,
    "message": {
      "message_id": 1,
      "text": "/start",
      "chat": { "id": 123456789, "type": "private" },
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "Demo",
        "last_name": "User",
        "username": "demo_user"
      }
    }
  }'
```

Send a `/connect` test update:

```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/telegram-bot" \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: $TELEGRAM_WEBHOOK_SECRET" \
  -d '{
    "update_id": 1000002,
    "message": {
      "message_id": 2,
      "text": "/connect",
      "chat": { "id": 123456789, "type": "private" },
      "from": {
        "id": 123456789,
        "is_bot": false,
        "first_name": "Demo",
        "last_name": "User",
        "username": "demo_user"
      }
    }
  }'
```

## Verify Database Row

In SQL editor or `psql`:

```sql
select chat_id, username, first_name, last_name, active, created_at, updated_at
from public.telegram_subscribers
where chat_id = '123456789';
```

## Reminder Worker Integration

This function stores the Telegram chat identity in `telegram_subscribers` and
returns the `chat_id` to the user. Planner events already support
`metadata.telegram.chat_id`; when a planner event is saved with that chat ID and
`reminder_minutes_before`, the existing queue trigger creates `reminder_queue`
rows. The existing `telegram-reminder-worker` then claims those rows and sends
the reminder through the same Telegram Bot API token.
