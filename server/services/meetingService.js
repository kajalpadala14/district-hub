import { supabaseAdmin } from "../config/supabase.js";

/**
 * Service to interact with Supabase database for planner_events/meetings
 * and handle reminder logging to prevent duplicates across server restarts.
 */

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
      console.error(`[MeetingService] Error fetching meetings for date ${dateStr}:`, error);
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
      console.error("[MeetingService] Error fetching upcoming meetings:", error);
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
 * Prevents duplicate sends even after server restarts.
 *
 * @param {string} meetingId
 * @param {string} reminderType - 'digest_8am' | '1_hour' | '10_min' | 'cancelled' | 'updated'
 * @param {string} scheduledTime - Meeting date / time identifier
 * @returns {Promise<boolean>}
 */
export async function hasReminderBeenSent(meetingId, reminderType, scheduledTime) {
  try {
    const { data, error } = await supabaseAdmin
      .from("telegram_reminder_logs")
      .select("id")
      .eq("meeting_id", String(meetingId))
      .eq("reminder_type", reminderType)
      .eq("scheduled_time", String(scheduledTime))
      .maybeSingle();

    if (error) {
      console.error("[MeetingService] Error checking telegram_reminder_logs:", error);
      return false;
    }

    return !!data;
  } catch (err) {
    console.error("[MeetingService] Exception in hasReminderBeenSent:", err);
    return false;
  }
}

/**
 * Persists sent reminder details into telegram_reminder_logs table.
 *
 * @param {string} meetingId
 * @param {string} reminderType
 * @param {string} scheduledTime
 * @param {Object} [payload={}]
 * @returns {Promise<boolean>}
 */
export async function logReminderSent(meetingId, reminderType, scheduledTime, payload = {}) {
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
      if (error.code === "23505" || error.code === "P2002") {
        return true;
      }
      console.error("[MeetingService] Error logging reminder to database:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[MeetingService] Exception in logReminderSent:", err);
    return false;
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
