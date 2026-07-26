import { supabaseAdmin } from "../config/supabase.js";

/**
 * Service to interact with Supabase database for planner_events/meetings
 * and handle reminder logging to prevent duplicates across server restarts.
 * Includes in-memory fallback cache if telegram_reminder_logs table hasn't been created yet.
 */

const inMemoryReminderLogs = new Set();
let isTableMissingWarningLogged = false;

/**
 * Fetches meetings scheduled for a specific date (YYYY-MM-DD).
 * Single source of truth is planner_events table.
 *
 * @param {string} dateStr - Date string in format YYYY-MM-DD
 * @returns {Promise<Array<Object>>}
 */
export async function getTodayMeetings(dateStr) {
  try {
    const { data, error } = await supabaseAdmin
      .from("planner_events")
      .select("id, user_id, title, description, location, date, start_time, end_time, is_all_day, status, priority, color, created_at, updated_at")
      .eq("date", dateStr)
      .neq("status", "cancelled")
      .order("start_time", { ascending: true, nullsFirst: false });

    if (error) {
      console.error(`[MeetingService] Error fetching meetings for date ${dateStr}:`, error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("[MeetingService] Exception in getTodayMeetings:", err);
    return [];
  }
}

/**
 * Counts remaining/pending meetings scheduled for today.
 * @param {string} dateStr
 * @returns {Promise<number>}
 */
export async function countPendingMeetingsToday(dateStr) {
  try {
    const { count, error } = await supabaseAdmin
      .from("planner_events")
      .select("id", { count: "exact", head: true })
      .eq("date", dateStr)
      .neq("status", "cancelled")
      .neq("status", "completed");

    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Fetches active upcoming meetings for today and future dates.
 *
 * @param {string} startDateStr - Start date in format YYYY-MM-DD
 * @returns {Promise<Array<Object>>}
 */
export async function getUpcomingMeetings(startDateStr) {
  try {
    const { data, error } = await supabaseAdmin
      .from("planner_events")
      .select("id, user_id, title, description, location, date, start_time, end_time, is_all_day, status, priority, color, created_at, updated_at")
      .gte("date", startDateStr)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("[MeetingService] Error fetching upcoming meetings:", error.message);
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error("[MeetingService] Exception in getUpcomingMeetings:", err);
    return [];
  }
}

/**
 * Checks if a specific reminder has already been logged in telegram_reminder_logs.
 * Fallbacks to in-memory cache if database table is missing.
 *
 * @param {string} meetingId
 * @param {string} reminderType
 * @param {string} scheduledTime
 * @returns {Promise<boolean>}
 */
export async function hasReminderBeenSent(meetingId, reminderType, scheduledTime) {
  const cacheKey = `${meetingId}_${reminderType}_${scheduledTime}`;

  if (inMemoryReminderLogs.has(cacheKey)) {
    return true;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("telegram_reminder_logs")
      .select("id")
      .eq("meeting_id", String(meetingId))
      .eq("reminder_type", reminderType)
      .eq("scheduled_time", String(scheduledTime))
      .maybeSingle();

    if (error) {
      if (error.code === "PGRST205") {
        logTableMissingNoticeOnce();
      }
      return inMemoryReminderLogs.has(cacheKey);
    }

    if (data) {
      inMemoryReminderLogs.add(cacheKey);
      return true;
    }

    return false;
  } catch {
    return inMemoryReminderLogs.has(cacheKey);
  }
}

/**
 * Persists sent reminder details into telegram_reminder_logs table.
 * Fallbacks to in-memory cache if table is missing.
 *
 * @param {string} meetingId
 * @param {string} reminderType
 * @param {string} scheduledTime
 * @param {Object} [payload={}]
 * @returns {Promise<boolean>}
 */
export async function logReminderSent(meetingId, reminderType, scheduledTime, payload = {}) {
  const cacheKey = `${meetingId}_${reminderType}_${scheduledTime}`;
  inMemoryReminderLogs.add(cacheKey);

  try {
    const { error } = await supabaseAdmin
      .from("telegram_reminder_logs")
      .insert({
        meeting_id: String(meetingId),
        reminder_type: reminderType,
        scheduled_time: String(scheduledTime),
        sent_at: new Date().toISOString(),
        payload,
      });

    if (error) {
      if (error.code === "PGRST205") {
        logTableMissingNoticeOnce();
        return true;
      }
      if (error.code === "23505" || error.code === "P2002") {
        return true;
      }
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Fetches the last logged payload for a reminder type.
 *
 * @param {string} meetingId
 * @param {string} reminderType
 * @returns {Promise<Object|null>}
 */
export async function getLastReminderLog(meetingId, reminderType) {
  try {
    const { data, error } = await supabaseAdmin
      .from("telegram_reminder_logs")
      .select("payload, sent_at")
      .eq("meeting_id", String(meetingId))
      .eq("reminder_type", reminderType)
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

function logTableMissingNoticeOnce() {
  if (!isTableMissingWarningLogged) {
    console.warn(
      "[MeetingService] Notice: Table 'public.telegram_reminder_logs' does not exist in Supabase database yet. Using in-memory tracking fallback. Run migration '20260726100000_telegram_reminder_system.sql' in Supabase SQL Editor to enable database persistence."
    );
    isTableMissingWarningLogged = true;
  }
}
