import { env } from "../config/env.js";
import { getTodayMeetings, hasReminderBeenSent, logReminderSent } from "../services/meetingService.js";
import { formatMorningDigest } from "../telegram/formatters.js";
import { sendTelegramMessage } from "../telegram/telegramService.js";
import { setLastDigestTimestamp } from "../scheduler/scheduler.js";

/**
 * Morning Digest Job
 * Runs daily at 8:00 AM in the configured TIMEZONE from .env.
 * Summarizes all scheduled meetings for the day and sends to Telegram group.
 */
export async function runMorningDigestJob() {
  console.log(`[MorningDigest] Starting morning digest job run (Timezone: ${env.timezone})...`);

  try {
    const dateStr = getTodayDateString(env.timezone);

    // Check if digest was already sent for today
    const alreadySent = await hasReminderBeenSent("DAILY_DIGEST", "digest_8am", dateStr);
    if (alreadySent) {
      console.log(`[MorningDigest] Daily digest already sent for ${dateStr}. Skipping.`);
      setLastDigestTimestamp(new Date().toISOString());
      return;
    }

    // Fetch today's meetings from database
    const meetings = await getTodayMeetings(dateStr);
    console.log(`[MorningDigest] Found ${meetings.length} meetings scheduled for ${dateStr}.`);

    // Format message using centralized formatters
    const { text, reply_markup } = formatMorningDigest(meetings, dateStr);

    // Send Telegram message with categorised logging
    const sent = await sendTelegramMessage(text, { type: "digest", reply_markup });

    if (sent) {
      setLastDigestTimestamp(new Date().toISOString());
      await logReminderSent("DAILY_DIGEST", "digest_8am", dateStr, {
        meetingCount: meetings.length,
        date: dateStr,
      });
      console.log(`[MorningDigest] [Digest Sent] Morning digest logged for ${dateStr}.`);
    } else {
      console.error(`[MorningDigest] [Telegram API Errors] Failed to send morning digest for ${dateStr}.`);
    }
  } catch (error) {
    console.error("[MorningDigest] Unhandled error during morning digest job:", error);
  }
}

export function getTodayDateString(timeZone = "Asia/Kolkata") {
  const options = { timeZone, year: "numeric", month: "2-digit", day: "2-digit" };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(new Date());
}
