import { env } from "../config/env.js";

let activeGroupChatId = null;

/**
 * Sets or updates the dynamically detected active Telegram Chat ID.
 * @param {string|number} chatId
 */
export function setActiveGroupChatId(chatId) {
  if (chatId) {
    activeGroupChatId = String(chatId);
    console.log(`[TelegramService] Active Telegram Chat ID set to: ${activeGroupChatId}`);
  }
}

/**
 * Gets the current target Telegram Chat ID (explicit -> detected active -> env test -> env group).
 * @returns {string|null}
 */
export function getTargetChatId() {
  return activeGroupChatId || env.testGroupChatId || env.telegramGroupChatId || null;
}

/**
 * Sends a message to Telegram group or target Chat ID with exponential backoff retries.
 * Logs specific categories: Digest Sent, Reminder Sent, Cancellation Sent, Update Sent, Retry Attempt, Telegram API Errors.
 *
 * @param {string} text - HTML formatted message body
 * @param {Object} [options]
 * @param {string|number} [options.chatId]
 * @param {string} [options.type] - Log label: 'digest' | 'reminder' | 'cancellation' | 'update' | 'test'
 * @param {Object} [options.reply_markup]
 * @param {boolean} [options.disable_web_page_preview=false]
 * @param {number} [options.maxRetries=3]
 * @returns {Promise<boolean>}
 */
export async function sendTelegramMessage(text, options = {}) {
  const { telegramBotToken } = env;
  const targetChatId = options.chatId || getTargetChatId();
  const messageType = options.type ?? "message";

  if (!telegramBotToken) {
    console.warn(`[TelegramService] TELEGRAM_BOT_TOKEN is missing in .env. Message delivery skipped.`);
    return false;
  }

  if (!targetChatId) {
    console.warn(`[TelegramService] Target Chat ID is missing. Please send /today or add bot to group to set target chat.`);
    return false;
  }

  console.log(`[TelegramService] [OUTGOING MESSAGE] Type: ${messageType.toUpperCase()} | Target Chat: ${targetChatId}\n--- Content ---\n${text}\n----------------`);

  const endpoint = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
  const payload = {
    chat_id: targetChatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: options.disable_web_page_preview ?? false,
  };

  if (options.reply_markup) {
    payload.reply_markup = options.reply_markup;
  }

  const maxRetries = options.maxRetries ?? 3;
  let attempt = 0;
  let delay = 1000;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        logSuccessCategory(messageType, targetChatId, data.result?.message_id);
        // Cache successful chat ID as active target
        setActiveGroupChatId(targetChatId);
        return true;
      }

      if (data.error_code === 400 && data.description?.includes("chat not found")) {
        console.error(`[TelegramService] [Telegram API Errors] Chat ID ${targetChatId} not found. Please ensure bot is added to your Telegram group or send /today in group.`);
        return false;
      }

      console.error(`[TelegramService] [Telegram API Errors] Error on attempt ${attempt}/${maxRetries}:`, data);

      if (data.parameters?.retry_after) {
        delay = data.parameters.retry_after * 1000;
      }
    } catch (err) {
      console.error(`[TelegramService] [Telegram API Errors] Network exception on attempt ${attempt}/${maxRetries}:`, err.message);
    }

    if (attempt < maxRetries) {
      console.log(`[TelegramService] [Retry Attempt] Retrying send (${messageType}) in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  console.error(`[TelegramService] [Telegram API Errors] Delivery failed after ${maxRetries} attempts for message type '${messageType}'.`);
  return false;
}

function logSuccessCategory(type, chatId, messageId) {
  switch (type) {
    case "digest":
      console.log(`[TelegramService] [Digest Sent] Successfully delivered to group ${chatId} (Msg ID: ${messageId})`);
      break;
    case "reminder":
      console.log(`[TelegramService] [Reminder Sent] Successfully delivered to group ${chatId} (Msg ID: ${messageId})`);
      break;
    case "cancellation":
      console.log(`[TelegramService] [Cancellation Sent] Successfully delivered to group ${chatId} (Msg ID: ${messageId})`);
      break;
    case "update":
      console.log(`[TelegramService] [Update Sent] Successfully delivered to group ${chatId} (Msg ID: ${messageId})`);
      break;
    default:
      console.log(`[TelegramService] [Message Sent] Successfully delivered to chat ${chatId} (Msg ID: ${messageId})`);
      break;
  }
}

export async function sendTelegramGroupMessage(text, options = {}) {
  return sendTelegramMessage(text, options);
}
