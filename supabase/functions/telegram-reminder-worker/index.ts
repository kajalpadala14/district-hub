import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type ReminderStatus = "pending" | "processing" | "sent" | "failed" | "cancelled";
type RecipientType = "user" | "group" | "channel";

type ClaimedReminder = {
  id: string;
  planner_event_id: string;
  user_id: string;
  telegram_chat_id: string;
  recipient_type: RecipientType;
  reminder_minutes_before: number;
  event_sequence: number;
  remind_at: string;
  retry_count: number;
  max_attempts: number;
  payload: Record<string, unknown>;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  result?: {
    message_id?: number;
  };
  error_code?: number;
  description?: string;
  parameters?: {
    retry_after?: number;
  };
};

const supabaseUrl = requiredEnv("SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const telegramBotToken = requiredEnv("TELEGRAM_BOT_TOKEN");
const cronSecret = requiredEnv("TELEGRAM_REMINDER_CRON_SECRET");

const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    assertCronAuthorized(req);

    const body = await readJsonBody(req);
    const workerId = String(body.workerId ?? `telegram-reminder-worker-${crypto.randomUUID()}`);
    const batchSize = normalizeBatchSize(body.batchSize);

    const { data, error } = await serviceClient.rpc("claim_due_telegram_reminders", {
      p_worker_id: workerId,
      p_batch_size: batchSize,
    });
    if (error) throw error;

    const reminders = (data ?? []) as ClaimedReminder[];
    const results = [];

    for (const reminder of reminders) {
      try {
        const telegram = await sendTelegramReminder(reminder);
        await markReminderSent(reminder, telegram);
        results.push({ id: reminder.id, status: "sent" satisfies ReminderStatus });
      } catch (error) {
        const deliveryError = normalizeDeliveryError(error);
        const status = await markReminderFailed(reminder, deliveryError, workerId);
        results.push({
          id: reminder.id,
          status,
          error: deliveryError.message,
        });
      }
    }

    return jsonResponse({
      ok: true,
      claimed: reminders.length,
      sent: results.filter((result) => result.status === "sent").length,
      failed: results.filter((result) => result.status === "failed").length,
      retrying: results.filter((result) => result.status === "pending").length,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram reminder worker failed";
    console.error("[Telegram Reminder Worker] failed", { error: message });
    return jsonResponse({ error: message }, error instanceof HttpError ? error.status : 500);
  }
});

function assertCronAuthorized(req: Request) {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const headerSecret = req.headers.get("x-cron-secret");
  if (bearer === cronSecret || headerSecret === cronSecret) return;
  throw new HttpError("Unauthorized", 401);
}

async function readJsonBody(req: Request) {
  const text = await req.text();
  if (!text.trim()) return {} as Record<string, unknown>;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function normalizeBatchSize(value: unknown) {
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 1), 500);
}

async function sendTelegramReminder(reminder: ClaimedReminder) {
  const text = buildReminderMessage(reminder);
  const response = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: reminder.telegram_chat_id,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as TelegramSendMessageResponse;
  if (!response.ok || payload.ok !== true) {
    const message =
      payload.description ?? `Telegram sendMessage failed with HTTP ${response.status}`;
    throw new TelegramDeliveryError(message, {
      status: response.status,
      retryAfterSeconds: payload.parameters?.retry_after,
      final: isFinalTelegramFailure(response.status, payload.error_code),
    });
  }

  return payload;
}

function buildReminderMessage(reminder: ClaimedReminder) {
  const payload = reminder.payload ?? {};
  const explicitText = typeof payload.text === "string" ? payload.text.trim() : "";
  if (explicitText) return explicitText;

  const title = stringValue(payload.title, "Planner meeting");
  const date = stringValue(payload.date, "");
  const startTime = stringValue(payload.start_time, "");
  const location = stringValue(payload.location, "");
  const leadTime = reminder.reminder_minutes_before;

  return [
    `Reminder: ${title}`,
    leadTime > 0 ? `Starts in ${formatMinutes(leadTime)}` : "Starts now",
    [date, startTime].filter(Boolean).join(" "),
    location ? `Location: ${location}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

async function markReminderSent(
  reminder: ClaimedReminder,
  telegram: TelegramSendMessageResponse,
) {
  const { error } = await serviceClient
    .from("reminder_queue")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      telegram_message_id:
        typeof telegram.result?.message_id === "number"
          ? String(telegram.result.message_id)
          : null,
      locked_at: null,
      locked_by: null,
      last_error: null,
    })
    .eq("id", reminder.id)
    .eq("status", "processing");

  if (error) throw error;
}

async function markReminderFailed(
  reminder: ClaimedReminder,
  error: NormalizedDeliveryError,
  workerId: string,
) {
  const nextRetryCount = reminder.retry_count + 1;
  const final = error.final || nextRetryCount >= reminder.max_attempts;
  const nextAttemptAt = final
    ? new Date().toISOString()
    : nextRetryTime(nextRetryCount, error.retryAfterSeconds);
  const status: ReminderStatus = final ? "failed" : "pending";

  console.error("[Telegram Reminder Worker] delivery failed", {
    reminderId: reminder.id,
    plannerEventId: reminder.planner_event_id,
    userId: reminder.user_id,
    recipientType: reminder.recipient_type,
    retryCount: nextRetryCount,
    maxAttempts: reminder.max_attempts,
    status,
    workerId,
    error: error.message,
  });

  const { error: updateError } = await serviceClient
    .from("reminder_queue")
    .update({
      status,
      next_retry_at: nextAttemptAt,
      retry_count: nextRetryCount,
      locked_at: null,
      locked_by: null,
      last_error: error.message,
    })
    .eq("id", reminder.id)
    .eq("status", "processing");

  if (updateError) throw updateError;
  return status;
}

function nextRetryTime(attempts: number, retryAfterSeconds?: number) {
  const backoffSeconds =
    retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds
      : Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1));
  return new Date(Date.now() + backoffSeconds * 1000).toISOString();
}

function normalizeDeliveryError(error: unknown): NormalizedDeliveryError {
  if (error instanceof TelegramDeliveryError) {
    return {
      message: error.message,
      final: error.final,
      retryAfterSeconds: error.retryAfterSeconds,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Telegram delivery failed",
    final: false,
  };
}

function isFinalTelegramFailure(status: number, errorCode?: number) {
  if (status === 400 || status === 401 || status === 403 || status === 404) return true;
  if (errorCode === 400 || errorCode === 401 || errorCode === 403 || errorCode === 404) {
    return true;
  }
  return false;
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(`${name} is not configured`, 500);
  return value;
}

type NormalizedDeliveryError = {
  message: string;
  final: boolean;
  retryAfterSeconds?: number;
};

class TelegramDeliveryError extends Error {
  status: number;
  retryAfterSeconds?: number;
  final: boolean;

  constructor(
    message: string,
    options: { status: number; retryAfterSeconds?: number; final: boolean },
  ) {
    super(message);
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.final = options.final;
  }
}

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}
