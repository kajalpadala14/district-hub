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
import { sendTelegramMessageDetailed } from "../telegram/telegramService.js";
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
  const now = new Date();
  const timestampIso = now.toISOString();
  const timestampLocal = formatLocalTimestamp(now, timeZone);

  let meetingsChecked = 0;
  let remindersSent = 0;
  let remindersSkipped = 0;
  const skipReasons = [];
  const telegramResponses = [];

  try {
    setLastReminderCheckTimestamp(timestampIso);

    // Fetch upcoming meetings from planner_events table
    const meetings = await getUpcomingMeetings(todayStr);
    meetingsChecked = meetings.length;

    if (meetingsChecked === 0) {
      skipReasons.push({
        type: "no_meetings",
        details: `No upcoming meetings found in database for today (${todayStr})`,
      });
    }

    for (const meeting of meetings) {
      const meetingId = meeting.id;
      const title = meeting.title || "Untitled Meeting";

      // 1. Cancelled meetings
      if (meeting.status === "cancelled") {
        const cancelKey = `cancelled_${meeting.updated_at}`;
        const alreadySent = await hasReminderBeenSent(meetingId, "cancelled", cancelKey);

        if (alreadySent) {
          remindersSkipped++;
          skipReasons.push({
            meetingId,
            title,
            reason: "cancelled_already_notified",
            details: `Cancellation notice already delivered previously (key: ${cancelKey})`,
          });
        } else {
          const text = formatMeetingCancelled(meeting);
          const apiResult = await sendTelegramMessageDetailed(text, { type: "cancellation" });
          telegramResponses.push({
            meetingId,
            title,
            action: "cancellation_notice",
            result: apiResult,
          });

          if (apiResult.success) {
            await logReminderSent(meetingId, "cancelled", cancelKey, {
              title: meeting.title,
              cancelled_at: meeting.updated_at,
            });
            remindersSent++;
            console.log(`[ReminderJob] [Cancellation Sent] Delivered cancelled meeting for "${meeting.title}" (${meetingId})`);
          } else {
            remindersSkipped++;
            skipReasons.push({
              meetingId,
              title,
              reason: "telegram_api_failed",
              details: `Telegram delivery failed: ${apiResult.reason || "Unknown error"}`,
            });
          }
        }
        continue;
      }

      // 2. All day or missing start time
      if (!meeting.start_time || meeting.is_all_day) {
        await trackMeetingState(meeting);
        remindersSkipped++;
        skipReasons.push({
          meetingId,
          title,
          reason: meeting.is_all_day ? "all_day_meeting" : "no_start_time",
          details: meeting.is_all_day ? "All-day event (no specific start time)" : "Meeting start_time is missing",
        });
        continue;
      }

      // 3. Active meeting with start time
      const meetingStartMs = parseMeetingStartToMs(meeting.date, meeting.start_time, timeZone);
      const nowMs = Date.now();
      const diffMinutes = (meetingStartMs - nowMs) / (1000 * 60);

      // Check if meeting time or date was updated
      let rescheduledAttempted = false;
      const lastStateLog = await getLastReminderLog(meetingId, "state_snapshot");
      if (lastStateLog && lastStateLog.payload) {
        const prev = lastStateLog.payload;
        const dateChanged = prev.date && prev.date !== meeting.date;
        const timeChanged = prev.start_time && prev.start_time !== meeting.start_time;

        if (dateChanged || timeChanged) {
          const updateKey = `update_${meeting.updated_at}`;
          const alreadySent = await hasReminderBeenSent(meetingId, "updated", updateKey);

          if (!alreadySent) {
            rescheduledAttempted = true;
            const oldTimeRange = formatTimeRange(prev.start_time, prev.end_time);
            const newTimeRange = formatTimeRange(meeting.start_time, meeting.end_time);
            const text = formatMeetingUpdated(meeting, oldTimeRange, newTimeRange);
            const apiResult = await sendTelegramMessageDetailed(text, { type: "update" });

            telegramResponses.push({
              meetingId,
              title,
              action: "reschedule_notice",
              result: apiResult,
            });

            if (apiResult.success) {
              await logReminderSent(meetingId, "updated", updateKey, {
                old_time: prev.start_time,
                new_time: meeting.start_time,
                old_date: prev.date,
                new_date: meeting.date,
                updated_at: meeting.updated_at,
              });
              remindersSent++;
              console.log(`[ReminderJob] [Update Sent] Delivered meeting reschedule for "${meeting.title}" (${meetingId})`);
            } else {
              remindersSkipped++;
              skipReasons.push({
                meetingId,
                title,
                reason: "telegram_api_failed",
                details: `Telegram delivery failed: ${apiResult.reason || "Unknown error"}`,
              });
            }
          }
        }
      }

      let reminderAttempted = false;

      // 1-Hour Reminder Window (15 to 65 minutes before start)
      if (diffMinutes > 15 && diffMinutes <= 65) {
        reminderAttempted = true;
        const slotKey = `${meeting.date}_${meeting.start_time}`;
        const alreadySent = await hasReminderBeenSent(meetingId, "1_hour", slotKey);

        if (alreadySent) {
          remindersSkipped++;
          skipReasons.push({
            meetingId,
            title,
            reason: "already_sent",
            details: `1-hour reminder already sent for slot ${slotKey}`,
          });
        } else {
          const { text, reply_markup } = formatOneHourReminder(meeting);
          const apiResult = await sendTelegramMessageDetailed(text, { type: "reminder", reply_markup });

          telegramResponses.push({
            meetingId,
            title,
            action: "1_hour_reminder",
            result: apiResult,
          });

          if (apiResult.success) {
            await logReminderSent(meetingId, "1_hour", slotKey, {
              title: meeting.title,
              start_time: meeting.start_time,
              end_time: meeting.end_time,
              date: meeting.date,
            });
            remindersSent++;
            console.log(`[ReminderJob] [Reminder Sent] 1-hour reminder delivered for "${meeting.title}" (${meetingId})`);
          } else {
            remindersSkipped++;
            skipReasons.push({
              meetingId,
              title,
              reason: "telegram_api_failed",
              details: `Telegram delivery failed: ${apiResult.reason || "Unknown error"}`,
            });
          }
        }
      }

      // 10-Minute Reminder Window (5 to 15 minutes before start)
      else if (diffMinutes > 5 && diffMinutes <= 15) {
        reminderAttempted = true;
        const slotKey = `${meeting.date}_${meeting.start_time}`;
        const alreadySent = await hasReminderBeenSent(meetingId, "10_min", slotKey);

        if (alreadySent) {
          remindersSkipped++;
          skipReasons.push({
            meetingId,
            title,
            reason: "already_sent",
            details: `10-minute reminder already sent for slot ${slotKey}`,
          });
        } else {
          const { text, reply_markup } = formatTenMinReminder(meeting);
          const apiResult = await sendTelegramMessageDetailed(text, { type: "reminder", reply_markup });

          telegramResponses.push({
            meetingId,
            title,
            action: "10_min_reminder",
            result: apiResult,
          });

          if (apiResult.success) {
            await logReminderSent(meetingId, "10_min", slotKey, {
              title: meeting.title,
              start_time: meeting.start_time,
              end_time: meeting.end_time,
              date: meeting.date,
            });
            remindersSent++;
            console.log(`[ReminderJob] [Reminder Sent] 10-minute reminder delivered for "${meeting.title}" (${meetingId})`);
          } else {
            remindersSkipped++;
            skipReasons.push({
              meetingId,
              title,
              reason: "telegram_api_failed",
              details: `Telegram delivery failed: ${apiResult.reason || "Unknown error"}`,
            });
          }
        }
      }

      // 5-Minute Reminder Window (0 to 5 minutes before start)
      else if (diffMinutes > 0 && diffMinutes <= 5) {
        reminderAttempted = true;
        const slotKey = `${meeting.date}_${meeting.start_time}`;
        const alreadySent = await hasReminderBeenSent(meetingId, "5_min", slotKey);

        if (alreadySent) {
          remindersSkipped++;
          skipReasons.push({
            meetingId,
            title,
            reason: "already_sent",
            details: `5-minute reminder already sent for slot ${slotKey}`,
          });
        } else {
          const { text, reply_markup } = formatFiveMinReminder(meeting);
          const apiResult = await sendTelegramMessageDetailed(text, { type: "reminder", reply_markup });

          telegramResponses.push({
            meetingId,
            title,
            action: "5_min_reminder",
            result: apiResult,
          });

          if (apiResult.success) {
            await logReminderSent(meetingId, "5_min", slotKey, {
              title: meeting.title,
              start_time: meeting.start_time,
              end_time: meeting.end_time,
              date: meeting.date,
            });
            remindersSent++;
            console.log(`[ReminderJob] [Reminder Sent] 5-minute reminder delivered for "${meeting.title}" (${meetingId})`);
          } else {
            remindersSkipped++;
            skipReasons.push({
              meetingId,
              title,
              reason: "telegram_api_failed",
              details: `Telegram delivery failed: ${apiResult.reason || "Unknown error"}`,
            });
          }
        }
      }

      // If not in any reminder window and no reschedule action taken
      if (!reminderAttempted && !rescheduledAttempted) {
        remindersSkipped++;
        const roundedDiff = Math.round(diffMinutes);
        const details = diffMinutes > 0
          ? `Starts in ${roundedDiff} mins (${meeting.start_time} ${timeZone}) - Outside reminder windows (1h: 15-65m, 10m: 5-15m, 5m: 0-5m)`
          : `Meeting start time passed ${Math.abs(roundedDiff)} mins ago (${meeting.start_time} ${timeZone})`;

        skipReasons.push({
          meetingId,
          title,
          reason: "not_in_time_window",
          details,
        });
      }

      await trackMeetingState(meeting);
    }
  } catch (error) {
    console.error("[ReminderJob] [Telegram API Errors] Error during reminder job run:", error);
    skipReasons.push({
      type: "execution_error",
      details: error.message || String(error),
    });
  }

  // Output detailed execution summary log
  printExecutionSummary({
    timestampIso,
    timestampLocal,
    meetingsChecked,
    remindersSent,
    remindersSkipped,
    skipReasons,
    telegramResponses,
  });
}

function printExecutionSummary({
  timestampIso,
  timestampLocal,
  meetingsChecked,
  remindersSent,
  remindersSkipped,
  skipReasons,
  telegramResponses,
}) {
  console.log(`\n[ReminderJob] [${timestampIso}] --- Cron Execution Run ---`);
  console.log(`  - Timestamp: ${timestampIso} (Local: ${timestampLocal})`);
  console.log(`  - Meetings Checked: ${meetingsChecked}`);
  console.log(`  - Reminders Sent: ${remindersSent}`);
  console.log(`  - Reminders Skipped: ${remindersSkipped}`);

  if (skipReasons.length > 0) {
    console.log(`  - Skip Reasons:`);
    skipReasons.forEach((sr, idx) => {
      if (sr.title) {
        console.log(`     ${idx + 1}. "${sr.title}" (ID: ${sr.meetingId}) -> Reason: [${sr.reason}] | ${sr.details}`);
      } else {
        console.log(`     ${idx + 1}. [${sr.type || "info"}] ${sr.details}`);
      }
    });
  } else {
    console.log(`  - Skip Reasons: None`);
  }

  if (telegramResponses.length > 0) {
    console.log(`  - Telegram API Responses:`);
    telegramResponses.forEach((tr, idx) => {
      const res = tr.result;
      const statusStr = res.success ? `SUCCESS (Msg ID: ${res.messageId})` : `FAILED (Reason: ${res.reason})`;
      const jsonSnippet = res.response ? JSON.stringify(res.response) : "N/A";
      console.log(`     ${idx + 1}. [${tr.action}] "${tr.title}" (ID: ${tr.meetingId}) -> Status: ${statusStr} | Chat ID: ${res.chatId || "N/A"} | Response: ${jsonSnippet}`);
    });
  } else {
    console.log(`  - Telegram API Response: N/A (No messages attempted)`);
  }
  console.log(`---------------------------------------------------------\n`);
}

async function handleCancelledMeeting(meeting) {
  const cancelKey = `cancelled_${meeting.updated_at}`;
  const alreadySent = await hasReminderBeenSent(meeting.id, "cancelled", cancelKey);

  if (alreadySent) return;

  const text = formatMeetingCancelled(meeting);
  const sent = await sendTelegramMessageDetailed(text, { type: "cancellation" });

  if (sent.success) {
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

function formatLocalTimestamp(dateObj, timeZone = "Asia/Kolkata") {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleString();
  }
}
