import { env } from "../config/env.js";
import { getTodayMeetings } from "../services/meetingService.js";
import { formatMorningDigest } from "./formatters.js";
import { sendTelegramMessage, setActiveGroupChatId } from "./telegramService.js";

let lastUpdateId = 0;
let isPollingActive = false;

/**
 * Initializes and verifies Telegram bot configuration.
 * Registers bot slash commands (/today, /date, /help).
 * Starts update listener for commands.
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

  // Register commands on Telegram
  registerTelegramBotCommands(telegramBotToken);

  // Start polling listener for /today and /date slash commands
  startTelegramCommandPolling(telegramBotToken);

  return { configured: true };
}

/**
 * Registers bot menu commands (/today, /date, /help) with Telegram API.
 * @param {string} token
 */
export async function registerTelegramBotCommands(token) {
  try {
    const endpoint = `https://api.telegram.org/bot${token}/setMyCommands`;
    const commands = [
      { command: "today", description: "Get today's meeting schedule" },
      { command: "date", description: "Get schedule for a specific date (e.g. /date 2026-07-28)" },
      { command: "help", description: "Show available bot commands" },
    ];

    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands }),
    });
    console.log("[TelegramBot] Registered slash commands (/today, /date, /help) with Telegram API.");
  } catch (err) {
    console.error("[TelegramBot] Error registering slash commands:", err.message);
  }
}

/**
 * Starts a background long-polling loop to process slash commands (/today, /date, /help).
 * @param {string} token
 */
export function startTelegramCommandPolling(token) {
  if (isPollingActive) return;
  isPollingActive = true;

  const pollIntervalMs = 3000; // Check every 3 seconds for fast command response

  async function pollLoop() {
    if (!isPollingActive) return;

    try {
      const endpoint = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=2`;
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateId = Math.max(lastUpdateId, update.update_id);
            await processTelegramCommandUpdate(update);
          }
        }
      }
    } catch {
      // Ignore network failures during command poll loop
    } finally {
      setTimeout(pollLoop, pollIntervalMs);
    }
  }

  pollLoop();
}

/**
 * Processes incoming Telegram updates for slash commands: /today, /date, /help
 * @param {Object} update
 */
export async function processTelegramCommandUpdate(update) {
  if (!update || !update.message) return;

  const msg = update.message;
  let text = msg.text ? msg.text.trim() : "";
  const chatId = msg.chat?.id;

  if (!chatId) return;
  setActiveGroupChatId(chatId);

  if (!text) return;

  // Remove bot handle suffix if user types /today@district_hub_bot
  text = text.replace(/@\w+_bot/i, "");

  if (text === "/today" || text === "/schedule") {
    await handleTodayCommand(chatId);
  } else if (text.startsWith("/date")) {
    const dateArg = text.replace("/date", "").trim();
    await handleDateCommand(chatId, dateArg);
  } else if (text === "/start" || text === "/help") {
    await handleHelpCommand(chatId);
  }
}

export async function handleTodayCommand(chatId) {
  const timeZone = env.timezone || "Asia/Kolkata";
  const todayStr = getTodayDateString(timeZone);
  const meetings = await getTodayMeetings(todayStr);

  console.log(`[TelegramBot] Processing /today command for chat ${chatId}`);
  const { text } = formatMorningDigest(meetings, todayStr);
  await sendTelegramMessage(text, { chatId, type: "digest" });
}

export async function handleDateCommand(chatId, dateArg) {
  const timeZone = env.timezone || "Asia/Kolkata";

  if (!dateArg) {
    const todayStr = getTodayDateString(timeZone);
    const meetings = await getTodayMeetings(todayStr);
    const { text } = formatMorningDigest(meetings, todayStr);
    await sendTelegramMessage(text, { chatId, type: "digest" });
    return;
  }

  const targetDateStr = parseUserDateArg(dateArg, timeZone);

  if (!targetDateStr) {
    await sendTelegramMessage(
      `⚠️ <b>Invalid Date Format</b>\n\nPlease use: <code>/date YYYY-MM-DD</code> or <code>/date DD-MM-YYYY</code>\nExample: <code>/date 2026-07-28</code>`,
      { chatId, type: "message" }
    );
    return;
  }

  console.log(`[TelegramBot] Processing /date command for date ${targetDateStr} in chat ${chatId}`);
  const meetings = await getTodayMeetings(targetDateStr);
  const { text } = formatMorningDigest(meetings, targetDateStr);
  await sendTelegramMessage(text, { chatId, type: "digest" });
}

export async function handleHelpCommand(chatId) {
  const text = `🤖 <b>District Hub Telegram Bot Commands</b>\n\n• <code>/today</code> - Get today's full meeting schedule\n• <code>/date YYYY-MM-DD</code> - Get schedule for a specific date (e.g. <code>/date 2026-07-28</code> or <code>/date 28-07-2026</code>)\n• <code>/help</code> - Show this help message`;
  await sendTelegramMessage(text, { chatId, type: "message" });
}

function parseUserDateArg(dateArg, timeZone) {
  if (!dateArg) return getTodayDateString(timeZone);
  const trimmed = dateArg.trim();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmMatch) {
    const day = dmMatch[1].padStart(2, "0");
    const month = dmMatch[2].padStart(2, "0");
    const year = dmMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

function getTodayDateString(timeZone = "Asia/Kolkata") {
  const options = { timeZone, year: "numeric", month: "2-digit", day: "2-digit" };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(new Date());
}
