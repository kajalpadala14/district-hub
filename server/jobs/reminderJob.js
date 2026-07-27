import { env } from "../config/env.js";
import {
  getLastReminderLog,
  getUpcomingMeetings,
  hasReminderBeenSent,
  logReminderSent,
} from "../services/meetingService.js";
import {
  formatMeetingCancelled,
  formatMeetingUpdated,
  formatOneHourReminder,
  formatTenMinReminder,
  formatFiveMinReminder,
  formatTimeRange,
} from "../telegram/formatters.js";
import { sendTelegramMessage } from "../telegram/telegramService.js";
import { setLastReminderCheckTimestamp } from "../scheduler/scheduler.js";

/**
 * Reminder Job
 * Runs every minute to process:
 * 1. 1-Hour before meeting reminders.
 * 2. 10-Minute before meeting reminders.
 * 3. 5-Minute before meeting reminders.
 * 4. Rescheduled/Updated meeting notifications.
 * 5. Cancelled meeting notifications.
 */
export async function runReminderJob() {
  const timeZone = env.timezone || "Asia/Kolkata";
  const todayStr = getTodayDateString(timeZone);

  try {
    setLastReminderCheckTimestamp(new Date().toISOString());

    // Fetch upcoming meetings from planner_events table
    const meetings = await getUpcomingMeetings(todayStr);

    for (const meeting of meetings) {
      if (meeting.status === "cancelled") {
        await handleCancelledMeeting(meeting);
        continue;
      }

      if (!meeting.start_time || meeting.is_all_day) {
        await trackMeetingState(meeting);
        continue;
      }

      const meetingStartMs = parseMeetingStartToMs(meeting.date, meeting.start_time, timeZone);
      const nowMs = Date.now();
      const diffMinutes = (meetingStartMs - nowMs) / (1000 * 60);

      // Check if meeting time or date was updated
      await handleRescheduledMeeting(meeting);

      // 1-Hour Reminder Window (15 to 65 minutes before start)
      if (diffMinutes > 15 && diffMinutes <= 65) {
        await handleOneHourReminder(meeting);
      }

      // 10-Minute Reminder Window (5 to 15 minutes before start)
      if (diffMinutes > 5 && diffMinutes <= 15) {
        await handleTenMinReminder(meeting);
      }

      // 5-Minute Reminder Window (0 to 5 minutes before start)
      if (diffMinutes > 0 && diffMinutes <= 5) {
        await handleFiveMinReminder(meeting);
      }

      await trackMeetingState(meeting);
    }
  } catch (error) {
    console.error("[ReminderJob] [Telegram API Errors] Error during reminder job run:", error);
  }
}

async function handleOneHourReminder(meeting) {
  const slotKey = `${meeting.date}_${meeting.start_time}`;
  const alreadySent = await hasReminderBeenSent(meeting.id, "1_hour", slotKey);

  if (alreadySent) return;

  const { text, reply_markup } = formatOneHourReminder(meeting);
  const sent = await sendTelegramMessage(text, { type: "reminder", reply_markup });

  if (sent) {
    await logReminderSent(meeting.id, "1_hour", slotKey, {
      title: meeting.title,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      date: meeting.date,
    });
    console.log(`[ReminderJob] [Reminder Sent] 1-hour reminder delivered for "${meeting.title}" (${meeting.id})`);
  }
}

async function handleTenMinReminder(meeting) {
  const slotKey = `${meeting.date}_${meeting.start_time}`;
  const alreadySent = await hasReminderBeenSent(meeting.id, "10_min", slotKey);

  if (alreadySent) return;

  const { text, reply_markup } = formatTenMinReminder(meeting);
  const sent = await sendTelegramMessage(text, { type: "reminder", reply_markup });

  if (sent) {
    await logReminderSent(meeting.id, "10_min", slotKey, {
      title: meeting.title,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      date: meeting.date,
    });
    console.log(`[ReminderJob] [Reminder Sent] 10-minute reminder delivered for "${meeting.title}" (${meeting.id})`);
  }
}

async function handleFiveMinReminder(meeting) {
  const slotKey = `${meeting.date}_${meeting.start_time}`;
  const alreadySent = await hasReminderBeenSent(meeting.id, "5_min", slotKey);

  if (alreadySent) return;

  const { text, reply_markup } = formatFiveMinReminder(meeting);
  const sent = await sendTelegramMessage(text, { type: "reminder", reply_markup });

  if (sent) {
    await logReminderSent(meeting.id, "5_min", slotKey, {
      title: meeting.title,
      start_time: meeting.start_time,
      end_time: meeting.end_time,
      date: meeting.date,
    });
    console.log(`[ReminderJob] [Reminder Sent] 5-minute reminder delivered for "${meeting.title}" (${meeting.id})`);
  }
}

async function handleRescheduledMeeting(meeting) {
  const lastStateLog = await getLastReminderLog(meeting.id, "state_snapshot");

  if (!lastStateLog || !lastStateLog.payload) return;

  const prev = lastStateLog.payload;

  const dateChanged = prev.date && prev.date !== meeting.date;
  const timeChanged = prev.start_time && prev.start_time !== meeting.start_time;

  if (dateChanged || timeChanged) {
    const updateKey = `update_${meeting.updated_at}`;
    const alreadySent = await hasReminderBeenSent(meeting.id, "updated", updateKey);

    if (!alreadySent) {
      const oldTimeRange = formatTimeRange(prev.start_time, prev.end_time);
      const newTimeRange = formatTimeRange(meeting.start_time, meeting.end_time);

      const text = formatMeetingUpdated(meeting, oldTimeRange, newTimeRange);
      const sent = await sendTelegramMessage(text, { type: "update" });

      if (sent) {
        await logReminderSent(meeting.id, "updated", updateKey, {
          old_time: prev.start_time,
          new_time: meeting.start_time,
          old_date: prev.date,
          new_date: meeting.date,
          updated_at: meeting.updated_at,
        });
        console.log(`[ReminderJob] [Update Sent] Delivered meeting reschedule for "${meeting.title}" (${meeting.id})`);
      }
    }
  }
}

async function handleCancelledMeeting(meeting) {
  const cancelKey = `cancelled_${meeting.updated_at}`;
  const alreadySent = await hasReminderBeenSent(meeting.id, "cancelled", cancelKey);

  if (alreadySent) return;

  const text = formatMeetingCancelled(meeting);
  const sent = await sendTelegramMessage(text, { type: "cancellation" });

  if (sent) {
    await logReminderSent(meeting.id, "cancelled", cancelKey, {
      title: meeting.title,
      cancelled_at: meeting.updated_at,
    });
    console.log(`[ReminderJob] [Cancellation Sent] Delivered cancelled meeting for "${meeting.title}" (${meeting.id})`);
  }
}

async function trackMeetingState(meeting) {
  const slotKey = `snapshot_${meeting.updated_at}`;
  await logReminderSent(meeting.id, "state_snapshot", slotKey, {
    title: meeting.title,
    date: meeting.date,
    start_time: meeting.start_time,
    end_time: meeting.end_time,
    status: meeting.status,
    updated_at: meeting.updated_at,
  });
}

function parseMeetingStartToMs(dateStr, timeStr, timeZone = "Asia/Kolkata") {
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const timeParts = timeStr.split(":").map(Number);
    const hours = timeParts[0] || 0;
    const minutes = timeParts[1] || 0;
    const seconds = timeParts[2] || 0;

    const offsetStr = getTimeZoneOffsetString(new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds)), timeZone);
    const isoString = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${offsetStr}`;

    return new Date(isoString).getTime();
  } catch {
    return Date.now();
  }
}

function getTimeZoneOffsetString(date, timeZone) {
  try {
    const format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
    });
    const parts = format.formatToParts(date);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    if (offsetPart && offsetPart.value) {
      const match = offsetPart.value.match(/GMT([+-]\d{2}:\d{2})/);
      if (match) return match[1];
      if (offsetPart.value === "GMT" || offsetPart.value === "UTC") return "Z";
    }
    return "+05:30";
  } catch {
    return "+05:30";
  }
}

function getTodayDateString(timeZone = "Asia/Kolkata") {
  const options = { timeZone, year: "numeric", month: "2-digit", day: "2-digit" };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(new Date());
}
