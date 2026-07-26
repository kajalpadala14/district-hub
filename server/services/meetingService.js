import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * Service to interact with Supabase database for planner_events/meetings
 * and handle reminder logging to prevent duplicates across server restarts.
 * Persists fallback logs to local disk file (server/data/telegram_logs.json) if Supabase table is missing.
 */

const LOCAL_STORAGE_PATH = resolve(process.cwd(), "server/data/telegram_logs.json");
const inMemoryReminderLogs = new Set();
let isTableMissingWarningLogged = false;

// Load local fallback cache on startup
loadLocalFallbackCache();

function loadLocalFallbackCache() {
  try {
    if (existsSync(LOCAL_STORAGE_PATH)) {
      const data = readFileSync(LOCAL_STORAGE_PATH, "utf8");
      const items = JSON.parse(data);
      if (Array.isArray(items)) {
        for (const item of items) {
          inMemoryReminderLogs.add(item);
        }
      }
    }
  } catch (err) {
    console.error("[MeetingService] Error loading local fallback cache:", err.message);
  }
}

function saveLocalFallbackCache() {
  try {
    const dir = dirname(LOCAL_STORAGE_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const items = Array.from(inMemoryReminderLogs);
    writeFileSync(LOCAL_STORAGE_PATH, JSON.stringify(items, null, 2), "utf8");
  } catch (err) {
    console.error("[MeetingService] Error saving local fallback cache:", err.message);
  }
}

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
 * Fallbacks to disk file cache if database table is missing.
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
      saveLocalFallbackCache();
      return true;
    }

    return false;
  } catch {
    return inMemoryReminderLogs.has(cacheKey);
  }
}

/**
 * Persists sent reminder details into telegram_reminder_logs table and disk file.
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
  saveLocalFallbackCache();

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
      "[MeetingService] Notice: Table 'public.telegram_reminder_logs' does not exist in Supabase yet. Persisting logs to server/data/telegram_logs.json fallback file across server restarts."
    );
    isTableMissingWarningLogged = true;
  }
}
