import { sendDailySummaries } from "../services/telegramService.js";

let lastSentDate = "";

/**
 * Starts a simple loop checking the clock every minute.
 * Triggers the daily meeting summary notifications at 8:00 AM local time.
 */
export function startDailyScheduler() {
  console.log("[Telegram Scheduler] Starting daily notification scheduler (Target: 08:00 AM local time)...");

  // Run immediately on startup to register, then check every minute
  setInterval(() => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentDateStr = now.toISOString().slice(0, 10);

      // Check if it is exactly 8:00 AM and we haven't sent it today
      if (currentHour === 8 && currentMinute === 0 && lastSentDate !== currentDateStr) {
        lastSentDate = currentDateStr;
        console.log(`[Telegram Scheduler] Clock hit 08:00 AM on ${currentDateStr}. Triggering notifications.`);
        sendDailySummaries().catch((err) => {
          console.error("[Telegram Scheduler] Failed to send daily summaries in cron:", err);
        });
      }
    } catch (error) {
      console.error("[Telegram Scheduler] Error in check interval:", error);
    }
  }, 60 * 1000); // check every 60 seconds
}
