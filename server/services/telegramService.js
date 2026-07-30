import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";

// Helper to check if a task is classified as a planner meeting
function isPlannerMeeting(task) {
  if (!task.description) return false;
  return task.description
    .split(/\r?\n/)
    .some((line) => line.trim().toLowerCase() === "type: meeting");
}

// Format 24h time to 12h AM/PM
function formatTime(timeStr) {
  if (!timeStr) return "N/A";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Format date to human readable format
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// Send an HTML message via Telegram Bot API
export async function sendTelegramMessage(chatId, htmlText) {
  if (!env.telegramBotToken) {
    console.warn("[Telegram] Token not configured. Cannot send message.");
    return false;
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: htmlText,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      console.error("[Telegram] Send message failed:", result);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[Telegram] Error sending message:", error);
    return false;
  }
}

// Subscribe a chat to daily notifications
async function subscribeChat(chatId, from) {
  try {
    const { error } = await supabaseAdmin
      .from("telegram_subscribers")
      .upsert({
        chat_id: String(chatId),
        username: from.username || null,
        first_name: from.first_name || null,
        last_name: from.last_name || null,
        active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "chat_id" });
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Telegram] Subscribe error:", error);
    return false;
  }
}

// Unsubscribe a chat from daily notifications
async function unsubscribeChat(chatId) {
  try {
    const { error } = await supabaseAdmin
      .from("telegram_subscribers")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("chat_id", String(chatId));
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[Telegram] Unsubscribe error:", error);
    return false;
  }
}

// Fetch meetings in a date range
async function getMeetingsForRange(startDateStr, endDateStr) {
  try {
    const { data: tasks, error } = await supabaseAdmin
      .from("tasks")
      .select("id, task_number, title, description, priority, status, due_date, due_time, scheduled_date, department, agency")
      .or(`scheduled_date.gte.${startDateStr},due_date.gte.${startDateStr}`)
      .or(`scheduled_date.lte.${endDateStr},due_date.lte.${endDateStr}`);

    if (error) throw error;

    // Filter and sort meetings
    return (tasks ?? [])
      .filter((task) => {
        const date = task.scheduled_date ?? task.due_date;
        if (!date) return false;
        if (date < startDateStr || date > endDateStr) return false;
        return isPlannerMeeting(task);
      })
      .sort((a, b) => {
        const dateA = a.scheduled_date ?? a.due_date ?? "";
        const dateB = b.scheduled_date ?? b.due_date ?? "";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        const timeA = a.due_time ?? "";
        const timeB = b.due_time ?? "";
        return timeA.localeCompare(timeB);
      });
  } catch (error) {
    console.error("[Telegram] Fetch meetings error:", error);
    return [];
  }
}

// Format a list of meetings into an HTML message
function formatMeetingList(meetings, title) {
  if (meetings.length === 0) {
    return `<b>📅 ${title}</b>\n\n🟢 No scheduled meetings found for this period.`;
  }

  let text = `<b>📅 ${title}</b>\n`;
  text += `<i>Total Scheduled Meetings: ${meetings.length}</i>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  meetings.forEach((meeting, index) => {
    const priorityEmoji = 
      meeting.priority === "high" ? "🔴" : 
      meeting.priority === "medium" ? "🟡" : "🟢";
    const date = meeting.scheduled_date ?? meeting.due_date;

    text += `${index + 1}. <b>${meeting.title}</b>\n`;
    text += `   📅 Date: ${formatDate(date)}\n`;
    if (meeting.due_time) {
      text += `   ⏰ Time: ${formatTime(meeting.due_time)}\n`;
    }
    if (meeting.department) {
      text += `   🏢 Dept: <code>${meeting.department}</code>\n`;
    }
    if (meeting.agency) {
      text += `   🏷️ Agency: <code>${meeting.agency}</code>\n`;
    }
    text += `   ⚠️ Priority: ${priorityEmoji} ${meeting.priority.toUpperCase()}\n`;
    text += `   🔗 <a href="${env.appBaseUrl}/planner">Open Dashboard</a>\n\n`;
  });

  return text.trim();
}

// Send daily summaries to all subscribers
export async function sendDailySummaries() {
  console.log("[Telegram] Triggering daily summary send...");
  try {
    const { data: subscribers, error } = await supabaseAdmin
      .from("telegram_subscribers")
      .select("chat_id")
      .eq("active", true);

    if (error) throw error;
    if (!subscribers || subscribers.length === 0) {
      console.log("[Telegram] No active subscribers found.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const meetings = await getMeetingsForRange(todayStr, todayStr);
    const text = formatMeetingList(meetings, `Daily Schedule (${formatDate(todayStr)})`);

    let count = 0;
    for (const sub of subscribers) {
      const ok = await sendTelegramMessage(sub.chat_id, text);
      if (ok) count++;
    }
    console.log(`[Telegram] Daily summary sent to ${count}/${subscribers.length} subscribers.`);
  } catch (error) {
    console.error("[Telegram] Error running daily summaries:", error);
  }
}

// Handle updates from Telegram Bot (polling/webhook)
export async function handleIncomingUpdate(update) {
  if (!update || !update.message) return;
  const message = update.message;
  const chatId = message.chat.id;
  const text = message.text ? message.text.trim() : "";

  if (!text.startsWith("/")) return;

  const command = text.split(" ")[0].toLowerCase();

  switch (command) {
    case "/start": {
      const ok = await subscribeChat(chatId, message.from);
      if (ok) {
        await sendTelegramMessage(
          chatId,
          `<b>👋 Welcome to the District Hub Notifications Bot!</b>\n\n` +
            `You have successfully subscribed to receive <b>daily meeting schedules</b>. Alerts will be sent to this chat every morning.\n\n` +
            `<b>Available Commands:</b>\n` +
            `🔹 /today - Today's scheduled meetings\n` +
            `🔹 /week - Meetings scheduled for this week\n` +
            `🔹 /previous - Meetings from the previous week\n` +
            `🔹 /status - Check subscription status\n` +
            `🔹 /stop - Unsubscribe from daily summaries\n` +
            `🔹 /help - View list of commands`
        );
      } else {
        await sendTelegramMessage(chatId, "⚠️ Failed to register subscription. Please try again later.");
      }
      break;
    }

    case "/stop": {
      const ok = await unsubscribeChat(chatId);
      if (ok) {
        await sendTelegramMessage(
          chatId,
          `📴 <b>Unsubscribed successfully.</b>\n\nYou will no longer receive daily notifications. You can re-subscribe anytime by sending /start.`
        );
      } else {
        await sendTelegramMessage(chatId, "⚠️ Failed to unsubscribe. Please try again later.");
      }
      break;
    }

    case "/today": {
      const todayStr = new Date().toISOString().slice(0, 10);
      const meetings = await getMeetingsForRange(todayStr, todayStr);
      const text = formatMeetingList(meetings, `Meetings Today (${formatDate(todayStr)})`);
      await sendTelegramMessage(chatId, text);
      break;
    }

    case "/week": {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 6);
      
      const startStr = today.toISOString().slice(0, 10);
      const endStr = nextWeek.toISOString().slice(0, 10);
      
      const meetings = await getMeetingsForRange(startStr, endStr);
      const text = formatMeetingList(meetings, `Weekly Schedule (${formatDate(startStr)} - ${formatDate(endStr)})`);
      await sendTelegramMessage(chatId, text);
      break;
    }

    case "/previous":
    case "/last_week": {
      const today = new Date();
      const lastWeekStart = new Date();
      lastWeekStart.setDate(today.getDate() - 7);
      const lastWeekEnd = new Date();
      lastWeekEnd.setDate(today.getDate() - 1);
      
      const startStr = lastWeekStart.toISOString().slice(0, 10);
      const endStr = lastWeekEnd.toISOString().slice(0, 10);
      
      const meetings = await getMeetingsForRange(startStr, endStr);
      const text = formatMeetingList(meetings, `Previous Week's Meetings (${formatDate(startStr)} - ${formatDate(endStr)})`);
      await sendTelegramMessage(chatId, text);
      break;
    }

    case "/status": {
      try {
        const { data, error } = await supabaseAdmin
          .from("telegram_subscribers")
          .select("active")
          .eq("chat_id", String(chatId))
          .maybeSingle();

        if (error) throw error;
        const isSubscribed = data ? data.active : false;

        await sendTelegramMessage(
          chatId,
          `📊 <b>System Status</b>\n\n` +
            `🔔 Subscription status: ${isSubscribed ? "🟢 Active (Receiving Daily Alert)" : "🔴 Inactive"}\n` +
            `🤖 Connection to webapp: 🟢 Online`
        );
      } catch (error) {
        await sendTelegramMessage(chatId, "⚠️ Failed to fetch subscription status.");
      }
      break;
    }

    case "/help": {
      await sendTelegramMessage(
        chatId,
        `🤖 <b>District Hub Bot Commands:</b>\n\n` +
          `🔹 /today - Today's scheduled meetings\n` +
          `🔹 /week - Meetings scheduled for this week\n` +
          `🔹 /previous - Meetings from the previous week\n` +
          `🔹 /status - Check subscription status\n` +
          `🔹 /stop - Unsubscribe from daily summaries\n` +
          `🔹 /start - Subscribe / Restart bot`
      );
      break;
    }

    default:
      await sendTelegramMessage(chatId, "❓ Unknown command. Send /help to see all available commands.");
      break;
  }
}

// Start Telegram Bot Service
export async function startTelegramBot() {
  if (!env.telegramBotToken) {
    console.log("[Telegram] TELEGRAM_BOT_TOKEN is not defined in env. Bot is disabled.");
    return;
  }

  // Setup Webhook if configured, otherwise do Long Polling
  if (env.telegramWebhookUrl) {
    const webhookEndpoint = `${env.telegramWebhookUrl}/calendar/telegram-webhook`;
    console.log(`[Telegram] Webhook mode configured. Registering endpoint: ${webhookEndpoint}`);
    try {
      const response = await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookEndpoint }),
      });
      const res = await response.json();
      if (res.ok) {
        console.log(`[Telegram] Webhook registered successfully!`);
      } else {
        console.error(`[Telegram] Webhook registration failed:`, res);
      }
    } catch (error) {
      console.error("[Telegram] Error configuring webhook:", error);
    }
  } else {
    console.log("[Telegram] Webhook url is empty. Initializing long polling...");
    try {
      // Clear webhook first in case one was active
      await fetch(`https://api.telegram.org/bot${env.telegramBotToken}/deleteWebhook`);
    } catch (e) {
      // ignore
    }

    let offset = 0;
    async function poll() {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${env.telegramBotToken}/getUpdates?offset=${offset}&timeout=30`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.ok && data.result) {
            for (const update of data.result) {
              offset = update.update_id + 1;
              await handleIncomingUpdate(update).catch((err) => {
                console.error("[Telegram] Error handling update:", err);
              });
            }
          }
        } else {
          console.warn("[Telegram] Polling request returned non-OK:", response.status);
        }
      } catch (error) {
        console.error("[Telegram] Error in long polling loop:", error);
      }
      // Wait 1.5 seconds before next polling request to avoid hitting limits
      setTimeout(poll, 1500);
    }
    poll();
  }
}
