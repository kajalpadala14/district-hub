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
 * Sends a message to Telegram group or target Chat ID returning detailed execution and API response object.
 *
 * @param {string} text - HTML formatted message body
 * @param {Object} [options]
 * @param {string|number} [options.chatId]
 * @param {string} [options.type] - Log label: 'digest' | 'reminder' | 'cancellation' | 'update' | 'test'
 * @param {Object} [options.reply_markup]
 * @param {boolean} [options.disable_web_page_preview=false]
 * @param {number} [options.maxRetries=3]
 * @returns {Promise<{success: boolean, ok: boolean, chatId: string|null, messageId?: number|string, reason?: string, response: any}>}
 */
export async function sendTelegramMessageDetailed(text, options = {}) {
  const { telegramBotToken } = env;
  const targetChatId = options.chatId || getTargetChatId();
  const messageType = options.type ?? "message";

  if (!telegramBotToken) {
    console.warn(`[TelegramService] TELEGRAM_BOT_TOKEN is missing in .env. Message delivery skipped.`);
    return {
      success: false,
      ok: false,
      chatId: targetChatId || null,
      reason: "TELEGRAM_BOT_TOKEN is missing in .env",
      response: { error: "TELEGRAM_BOT_TOKEN_MISSING" },
    };
  }

  if (!targetChatId) {
    console.warn(`[TelegramService] Target Chat ID is missing. Please send /today or add bot to group to set target chat.`);
    return {
      success: false,
      ok: false,
      chatId: null,
      reason: "Target Chat ID is missing. Send /today in Telegram group to configure.",
      response: { error: "TARGET_CHAT_ID_MISSING" },
    };
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
  let lastData = null;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      lastData = data;

      if (response.ok && data.ok) {
        logSuccessCategory(messageType, targetChatId, data.result?.message_id);
        // Cache successful chat ID as active target
        setActiveGroupChatId(targetChatId);
        return {
          success: true,
          ok: true,
          chatId: targetChatId,
          messageId: data.result?.message_id,
          response: data,
        };
      }

      if (data.error_code === 400 && data.description?.includes("chat not found")) {
        console.error(`[TelegramService] [Telegram API Errors] Chat ID ${targetChatId} not found. Please ensure bot is added to your Telegram group or send /today in group.`);
        return {
          success: false,
          ok: false,
          chatId: targetChatId,
          reason: `Chat ID ${targetChatId} not found`,
          response: data,
        };
      }

      console.error(`[TelegramService] [Telegram API Errors] Error on attempt ${attempt}/${maxRetries}:`, data);

      if (data.parameters?.retry_after) {
        delay = data.parameters.retry_after * 1000;
      }
    } catch (err) {
      lastError = err.message;
      console.error(`[TelegramService] [Telegram API Errors] Network exception on attempt ${attempt}/${maxRetries}:`, err.message);
    }

    if (attempt < maxRetries) {
      console.log(`[TelegramService] [Retry Attempt] Retrying send (${messageType}) in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  console.error(`[TelegramService] [Telegram API Errors] Delivery failed after ${maxRetries} attempts for message type '${messageType}'.`);
  return {
    success: false,
    ok: false,
    chatId: targetChatId,
    reason: lastError || (lastData ? lastData.description : `Delivery failed after ${maxRetries} attempts`),
    response: lastData || { error: lastError },
  };
}

/**
 * Sends a message to Telegram group or target Chat ID returning boolean.
 *
 * @param {string} text - HTML formatted message body
 * @param {Object} [options]
 * @returns {Promise<boolean>}
 */
export async function sendTelegramMessage(text, options = {}) {
  const result = await sendTelegramMessageDetailed(text, options);
  return result.success;
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
