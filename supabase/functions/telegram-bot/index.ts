import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type TelegramUser = {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type TelegramChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
};

type TelegramMessage = {
  message_id: number;
  text?: string;
  chat: TelegramChat;
  from?: TelegramUser;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

type TelegramSendMessageResponse = {
  ok: boolean;
  description?: string;
  error_code?: number;
};

type TelegramSubscriber = {
  chat_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

const supabaseUrl = requiredEnv("SUPABASE_URL");
const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const telegramBotToken = requiredEnv("TELEGRAM_BOT_TOKEN");
const telegramWebhookSecret = requiredEnv("TELEGRAM_WEBHOOK_SECRET");
const plannerPublicBaseUrl = Deno.env.get("PLANNER_PUBLIC_BASE_URL")?.replace(/\/+$/, "") ?? "";

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
    assertTelegramAuthorized(req);

    const update = await readTelegramUpdate(req);
    const message = update.message;
    if (!message?.chat?.id) {
      return jsonResponse({ ok: true, ignored: true, reason: "No message chat to process" });
    }

    const command = parseTelegramCommand(message.text);
    if (!command) {
      return jsonResponse({ ok: true, ignored: true, reason: "No supported command" });
    }

    const subscriber = await saveTelegramSubscriber(message);
    const replyText = buildCommandReply(command.name, subscriber);
    await sendTelegramMessage(subscriber.chat_id, replyText);

    return jsonResponse({
      ok: true,
      command: command.name,
      chat_id: subscriber.chat_id,
      subscriber_saved: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telegram bot webhook failed";
    console.error("[Telegram Bot] failed", { error: message });
    return jsonResponse({ error: message }, error instanceof HttpError ? error.status : 500);
  }
});

function assertTelegramAuthorized(req: Request) {
  const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (receivedSecret && receivedSecret === telegramWebhookSecret) return;
  throw new HttpError("Unauthorized", 401);
}

async function readTelegramUpdate(req: Request): Promise<TelegramUpdate> {
  const text = await req.text();
  if (!text.trim()) throw new HttpError("Invalid JSON body", 400);

  try {
    return JSON.parse(text) as TelegramUpdate;
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
}

function parseTelegramCommand(text: string | undefined) {
  const trimmed = text?.trim();
  if (!trimmed?.startsWith("/")) return null;

  const [rawCommand, ...args] = trimmed.split(/\s+/);
  const name = rawCommand.split("@")[0].toLowerCase();
  if (!["/start", "/connect", "/help"].includes(name)) return null;

  return {
    name: name as "/start" | "/connect" | "/help",
    args,
  };
}

async function saveTelegramSubscriber(message: TelegramMessage): Promise<TelegramSubscriber> {
  const now = new Date().toISOString();
  const chatId = String(message.chat.id);
  const subscriberPayload = {
    username: normalizeNullableText(message.from?.username),
    first_name: normalizeNullableText(message.from?.first_name),
    last_name: normalizeNullableText(message.from?.last_name),
    active: true,
    updated_at: now,
  };

  const updated = await serviceClient
    .from("telegram_subscribers")
    .update(subscriberPayload)
    .eq("chat_id", chatId)
    .select("chat_id, username, first_name, last_name, active, created_at, updated_at");
  if (updated.error) throw updated.error;
  if (updated.data && updated.data.length > 0) return updated.data[0] as TelegramSubscriber;

  const inserted = await serviceClient
    .from("telegram_subscribers")
    .insert({
      chat_id: chatId,
      ...subscriberPayload,
      created_at: now,
    })
    .select("chat_id, username, first_name, last_name, active, created_at, updated_at")
    .single();

  if (!inserted.error) return inserted.data as TelegramSubscriber;
  if (!isDuplicateInsertError(inserted.error)) throw inserted.error;

  const retried = await serviceClient
    .from("telegram_subscribers")
    .update(subscriberPayload)
    .eq("chat_id", chatId)
    .select("chat_id, username, first_name, last_name, active, created_at, updated_at")
    .single();
  if (retried.error) throw retried.error;
  return retried.data as TelegramSubscriber;
}

function buildCommandReply(command: "/start" | "/connect" | "/help", subscriber: TelegramSubscriber) {
  if (command === "/start") {
    return [
      "District Hub Planner reminders are now active for this Telegram chat.",
      "",
      `Chat ID: ${subscriber.chat_id}`,
      "",
      "Use /connect whenever you need your chat ID for planner reminder setup.",
      "Use /help to see available commands.",
    ].join("\n");
  }

  if (command === "/connect") {
    return [
      "Telegram is connected for planner reminders.",
      "",
      `Chat ID: ${subscriber.chat_id}`,
      plannerPublicBaseUrl ? `Planner: ${plannerPublicBaseUrl}/planner` : "",
      "",
      "Add this chat ID to a planner event's Telegram reminder settings to queue notifications.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    "District Hub Planner Telegram commands:",
    "/start - activate reminders for this chat",
    "/connect - show the chat ID used for planner reminder setup",
    "/help - show this help message",
  ].join("\n");
}

async function sendTelegramMessage(chatId: string, text: string) {
  const response = await fetch(
    `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as TelegramSendMessageResponse;
  if (!response.ok || payload.ok !== true) {
    throw new HttpError(
      payload.description ?? `Telegram sendMessage failed with HTTP ${response.status}`,
      502,
    );
  }
}

function normalizeNullableText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isDuplicateInsertError(error: { code?: string; message?: string }) {
  return error.code === "23505" || /duplicate key/i.test(error.message ?? "");
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(`${name} is not configured`, 500);
  return value;
}

class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}
