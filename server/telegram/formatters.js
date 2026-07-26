/**
 * Telegram Message Formatting Utilities
 * Handles HTML escaping, 12h time ranges, date formatting (DD MMM YYYY),
 * clock emoji mapping, inline keyboard generation, and standardized templates.
 */

/**
 * Escapes HTML special characters to prevent Telegram API formatting errors or injection.
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Converts a 24-hour time string ("13:30" or "13:30:00") to 12-hour AM/PM format ("1:30 PM").
 * @param {string|null} timeStr
 * @returns {string}
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return "All Day";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, "0");
  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Formats a time range ("1:30 PM – 2:30 PM") or single time ("10:00 AM") if end_time is missing.
 * @param {string|null} startTime
 * @param {string|null} endTime
 * @returns {string}
 */
export function formatTimeRange(startTime, endTime) {
  if (!startTime) return "All Day";
  const startFormatted = formatTime12h(startTime);
  if (!endTime) return startFormatted;
  const endFormatted = formatTime12h(endTime);
  return `${startFormatted} – ${endFormatted}`;
}

/**
 * Formats a date string (YYYY-MM-DD or Date) into "DD MMM YYYY" format (e.g. "27 Jul 2026").
 * @param {string|Date} dateVal
 * @param {string} [timeZone="Asia/Kolkata"]
 * @returns {string}
 */
export function formatDateDisplay(dateVal, timeZone = "Asia/Kolkata") {
  if (!dateVal) return "";
  try {
    let dateObj;
    if (typeof dateVal === "string" && dateVal.includes("-")) {
      const [y, m, d] = dateVal.split("-").map(Number);
      dateObj = new Date(Date.UTC(y, m - 1, d));
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(dateObj);
    } else {
      dateObj = new Date(dateVal);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone,
      }).format(dateObj);
    }
  } catch {
    return String(dateVal);
  }
}

/**
 * Returns a clock emoji based on the time of day.
 * @param {string|null} timeStr
 * @returns {string}
 */
export function getClockEmoji(timeStr) {
  if (!timeStr) return "📅";
  const parts = timeStr.split(":");
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return "🕙";

  const hour12 = hour % 12 || 12;
  const clockMap = {
    1: "🕐",
    2: "🕑",
    3: "🕒",
    4: "🕓",
    5: "🕔",
    6: "🕕",
    7: "🕖",
    8: "🕗",
    9: "🕘",
    10: "🕙",
    11: "🕚",
    12: "🕛",
  };
  return clockMap[hour12] || "🕙";
}

/**
 * Extracts a join URL from explicit join_link, location, description, or title text.
 * @param {Object} meeting
 * @returns {string|null}
 */
export function extractJoinLink(meeting) {
  if (!meeting) return null;

  if (meeting.join_link && isValidUrl(meeting.join_link)) {
    return meeting.join_link.trim();
  }
  if (meeting.location && isValidUrl(meeting.location)) {
    return meeting.location.trim();
  }

  const fieldsToSearch = [meeting.location, meeting.description, meeting.title].filter(Boolean);

  for (const text of fieldsToSearch) {
    const linkLabelMatch = text.match(/(?:Link|Join|URL|Meeting Link|Venue|Meet):\s*(https?:\/\/[^\s<"']+)/i);
    if (linkLabelMatch && isValidUrl(linkLabelMatch[1])) {
      return linkLabelMatch[1].trim();
    }

    const videoConfMatch = text.match(/(https?:\/\/(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|meet\.jit\.si|webex\.com)[^\s<"']+)/i);
    if (videoConfMatch && isValidUrl(videoConfMatch[1])) {
      return videoConfMatch[1].trim();
    }

    const rawMatch = text.match(/(https?:\/\/[^\s<"']+)/i);
    if (rawMatch && isValidUrl(rawMatch[1])) {
      return rawMatch[1].trim();
    }
  }

  return null;
}

function isValidUrl(str) {
  if (!str) return false;
  try {
    const url = new URL(str.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Builds Telegram inline keyboard reply_markup for join links.
 * @param {string|null} joinUrl
 * @returns {Object|null}
 */
export function buildJoinInlineKeyboard(joinUrl) {
  if (!joinUrl) return null;
  return {
    inline_keyboard: [
      [
        {
          text: "🔗 Join Meeting",
          url: joinUrl,
        },
      ],
    ],
  };
}

/**
 * Formats "Today's Schedule" morning digest message.
 * @param {Array<Object>} meetings
 * @param {string} dateStr
 * @returns {{ text: string, reply_markup: Object|null }}
 */
export function formatMorningDigest(meetings, dateStr) {
  const formattedDate = formatDateDisplay(dateStr);
  const totalMeetings = meetings ? meetings.length : 0;

  let message = `🌅 <b>Good Morning Team!</b>\n\n📅 <b>Today's Schedule (${formattedDate})</b>\n\n`;

  if (totalMeetings === 0) {
    message += "No meetings scheduled for today.\n\n";
  } else {
    for (const m of meetings) {
      const emoji = getClockEmoji(m.start_time);
      const timeRange = formatTimeRange(m.start_time, m.end_time);
      const titleStr = escapeHtml(m.title);
      const joinUrl = extractJoinLink(m);

      message += `${emoji} ${timeRange}\n📌 ${titleStr}\n`;
      if (joinUrl) {
        message += `🔗 <b>Join Link:</b> ${escapeHtml(joinUrl)}\n`;
      }
      message += `\n`;
    }
  }

  message += `━━━━━━━━━━━━━━\n📊 <b>Total Meetings: ${totalMeetings}</b>\n\nHave a productive day! 🚀`;

  return {
    text: message,
    reply_markup: null,
  };
}

/**
 * Formats 1-hour before meeting reminder.
 * @param {Object} meeting
 * @returns {{ text: string, reply_markup: Object|null }}
 */
export function formatOneHourReminder(meeting) {
  const title = escapeHtml(meeting.title);
  const clockEmoji = getClockEmoji(meeting.start_time);
  const timeRange = formatTimeRange(meeting.start_time, meeting.end_time);
  const joinUrl = extractJoinLink(meeting);

  let text = `⏰ <b>Reminder</b>\n\n📌 <b>${title}</b>\n\n${clockEmoji} <b>Time:</b>\n${timeRange}`;

  if (joinUrl) {
    text += `\n\n🔗 <b>Join Meeting:</b>\n${escapeHtml(joinUrl)}`;
  }

  text += `\n\nStarts in 1 hour.`;

  return {
    text,
    reply_markup: buildJoinInlineKeyboard(joinUrl),
  };
}

/**
 * Formats 10-minutes before meeting reminder.
 * @param {Object} meeting
 * @returns {{ text: string, reply_markup: Object|null }}
 */
export function formatTenMinReminder(meeting) {
  const title = escapeHtml(meeting.title);
  const clockEmoji = getClockEmoji(meeting.start_time);
  const timeRange = formatTimeRange(meeting.start_time, meeting.end_time);
  const joinUrl = extractJoinLink(meeting);

  let text = `🚨 <b>Meeting starts in 10 minutes!</b>\n\n📌 <b>${title}</b>\n\n${clockEmoji} <b>Time:</b>\n${timeRange}`;

  if (joinUrl) {
    text += `\n\n🔗 <b>Join Meeting:</b>\n${escapeHtml(joinUrl)}`;
  }

  text += `\n\nPlease join on time.`;

  return {
    text,
    reply_markup: buildJoinInlineKeyboard(joinUrl),
  };
}

/**
 * Formats 5-minutes before meeting reminder.
 * @param {Object} meeting
 * @returns {{ text: string, reply_markup: Object|null }}
 */
export function formatFiveMinReminder(meeting) {
  const title = escapeHtml(meeting.title);
  const clockEmoji = getClockEmoji(meeting.start_time);
  const timeRange = formatTimeRange(meeting.start_time, meeting.end_time);
  const joinUrl = extractJoinLink(meeting);

  let text = `🚨 <b>Meeting starts in 5 minutes!</b>\n\n📌 <b>${title}</b>\n\n${clockEmoji} <b>Time:</b>\n${timeRange}`;

  if (joinUrl) {
    text += `\n\n🔗 <b>Join Meeting:</b>\n${escapeHtml(joinUrl)}`;
  }

  text += `\n\nPlease join immediately.`;

  return {
    text,
    reply_markup: buildJoinInlineKeyboard(joinUrl),
  };
}

/**
 * Formats meeting cancellation notice.
 * @param {Object} meeting
 * @returns {string}
 */
export function formatMeetingCancelled(meeting) {
  const title = escapeHtml(meeting.title);
  const clockEmoji = getClockEmoji(meeting.start_time);
  const timeRange = formatTimeRange(meeting.start_time, meeting.end_time);

  return `❌ <b>Meeting Cancelled</b>\n\n<b>${title}</b>\n\n${clockEmoji} <b>Scheduled Time:</b>\n${timeRange}\n\nThis meeting has been cancelled.`;
}

/**
 * Formats meeting reschedule/update notice.
 * @param {Object} meeting
 * @param {string} oldTimeRange
 * @param {string} newTimeRange
 * @returns {string}
 */
export function formatMeetingUpdated(meeting, oldTimeRange, newTimeRange) {
  const title = escapeHtml(meeting.title);

  return `🔄 <b>Meeting Updated</b>\n\n<b>${title}</b>\n\n<b>Old Time:</b>\n${oldTimeRange}\n\n<b>New Time:</b>\n${newTimeRange}\n\nPlease attend at the new time.`;
}
