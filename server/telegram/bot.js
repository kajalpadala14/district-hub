import { env } from "../config/env.js";

/**
 * Initializes and verifies Telegram bot configuration.
 * Logs status of Telegram integration on server startup.
 * Does not crash the server if TELEGRAM_GROUP_CHAT_ID or TELEGRAM_BOT_TOKEN is missing.
 */
export function initTelegramBot() {
  const { telegramBotToken, telegramGroupChatId, testGroupChatId } = env;
  const targetGroup = testGroupChatId || telegramGroupChatId;

  if (!telegramBotToken) {
    console.warn("[TelegramBot] TELEGRAM_BOT_TOKEN is missing. Telegram reminder jobs are disabled until configuration is complete.");
    return { configured: false, reason: "Missing TELEGRAM_BOT_TOKEN" };
  }

  if (!targetGroup) {
    console.warn("[TelegramBot] TELEGRAM_GROUP_CHAT_ID is missing. Telegram reminder jobs are disabled until configuration is complete.");
    return { configured: false, reason: "Missing TELEGRAM_GROUP_CHAT_ID" };
  }

  console.log(`[TelegramBot] Telegram bot system initialized successfully for Group Chat: ${targetGroup}`);
  return { configured: true };
}
