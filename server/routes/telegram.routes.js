import { Router } from "express";
import { env } from "../config/env.js";
import { getSchedulerHealth, triggerMorningDigestNow, triggerReminderJobNow } from "../scheduler/scheduler.js";
import { countPendingMeetingsToday } from "../services/meetingService.js";
import { sendTelegramMessage } from "../telegram/telegramService.js";
import { getTodayDateString } from "../jobs/morningDigest.js";
import { processTelegramCommandUpdate } from "../telegram/bot.js";

export const telegramRouter = Router();

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * GET /telegram/health
 * Returns status of bot, scheduler, timezone, last execution timestamps, and pending meetings count.
 */
telegramRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    const health = getSchedulerHealth();
    const todayStr = getTodayDateString(env.timezone);
    const pendingMeetingsToday = await countPendingMeetingsToday(todayStr);

    res.json({
      ...health,
      pendingMeetingsToday,
    });
  })
);

/**
 * POST /telegram/webhook
 * Handles incoming Telegram updates & commands (/today, /date, /help).
 */
telegramRouter.post(
  "/webhook",
  asyncHandler(async (req, res) => {
    res.status(200).send("OK");
    if (req.body) {
      await processTelegramCommandUpdate(req.body);
    }
  })
);

/**
 * POST /telegram/trigger-digest
 * On-demand manual trigger for Morning Digest.
 */
telegramRouter.post(
  "/trigger-digest",
  asyncHandler(async (_req, res) => {
    const targetChatId = env.testGroupChatId || env.telegramGroupChatId;
    if (!targetChatId) {
      res.status(400).json({
        ok: false,
        error: "TELEGRAM_GROUP_CHAT_ID is missing in .env. Skipping morning digest.",
      });
      return;
    }

    await triggerMorningDigestNow();
    res.json({ ok: true, message: "Morning digest job triggered successfully" });
  })
);

/**
 * POST /telegram/trigger-reminders
 * On-demand manual trigger for Reminder Check.
 */
telegramRouter.post(
  "/trigger-reminders",
  asyncHandler(async (_req, res) => {
    const targetChatId = env.testGroupChatId || env.telegramGroupChatId;
    if (!targetChatId) {
      res.status(400).json({
        ok: false,
        error: "TELEGRAM_GROUP_CHAT_ID is missing in .env. Skipping reminder check.",
      });
      return;
    }

    await triggerReminderJobNow();
    res.json({ ok: true, message: "Reminder check job triggered successfully" });
  })
);

/**
 * POST /telegram/send
 * On-demand manual message sending endpoint.
 */
telegramRouter.post(
  "/send",
  asyncHandler(async (req, res) => {
    const { text, chatId, type } = req.body ?? {};
    if (!text) {
      res.status(400).json({ error: "Missing message text" });
      return;
    }

    const targetChatId = chatId || env.testGroupChatId || env.telegramGroupChatId;
    if (!targetChatId) {
      res.status(400).json({
        ok: false,
        error: "TELEGRAM_GROUP_CHAT_ID is missing in .env and no chatId parameter was provided.",
      });
      return;
    }

    const success = await sendTelegramMessage(text, { chatId: targetChatId, type: type || "test" });
    if (!success) {
      res.status(500).json({ ok: false, error: "Failed to send Telegram message. Check server logs." });
      return;
    }

    res.json({ ok: true, message: "Telegram message sent successfully" });
  })
);
