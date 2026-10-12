import cron from "node-cron";
import { env } from "../config/env.js";
import { runMorningDigestJob } from "../jobs/morningDigest.js";
import { runReminderJob } from "../jobs/reminderJob.js";
import { initTelegramBot } from "../telegram/bot.js";

let isSchedulerRunning = false;
let lastDigestTimestamp = "Never";
let lastReminderCheckTimestamp = "Never";

export function setLastDigestTimestamp(ts) {
  lastDigestTimestamp = ts;
}

export function setLastReminderCheckTimestamp(ts) {
  lastReminderCheckTimestamp = ts;
}

/**
 * Returns current health status of scheduler and bot.
 */
export function getSchedulerHealth() {
  const { telegramBotToken, telegramGroupChatId, testGroupChatId, timezone } = env;
  const targetGroup = testGroupChatId || telegramGroupChatId || "Not configured";

  return {
    bot: telegramBotToken ? "connected" : "disconnected",
    scheduler: isSchedulerRunning ? "running" : "stopped",
    timezone: timezone || "Asia/Kolkata",
    lastDigest: lastDigestTimestamp,
    lastReminderCheck: lastReminderCheckTimestamp,
    telegramGroup: targetGroup,
  };
}

/**
 * Initializes and starts the background job scheduler using node-cron.
 * Schedules:
 * 1. Morning Digest: Every day at 8:00 AM in env.timezone (Asia/Kolkata).
 * 2. Reminder & Event Monitor Job: Every minute (* * * * *).
 */
export function initScheduler() {
  if (isSchedulerRunning) {
    console.log("[Scheduler] Scheduler is already initialized and running.");
    return;
  }

  console.log(`[Scheduler] Initializing node-cron scheduler (Timezone: ${env.timezone})...`);

  initTelegramBot();

  // 1. Daily Morning Digest at 8:00 AM
  const morningDigestSchedule = "0 8 * * *";
  if (cron.validate(morningDigestSchedule)) {
    cron.schedule(
      morningDigestSchedule,
      async () => {
        console.log(`[Scheduler] [${new Date().toISOString()}] Running 8:00 AM Morning Digest Cron Job...`);
        await runMorningDigestJob();
      },
      {
        scheduled: true,
        timezone: env.timezone,
      }
    );
    console.log(`[Scheduler] Registered Morning Digest job for "0 8 * * *" in timezone ${env.timezone}.`);
  } else {
    console.error("[Scheduler] Invalid cron expression for Morning Digest job.");
  }

  // 2. Minute-by-Minute Meeting Reminders & Change Monitor
  const reminderJobSchedule = "* * * * *";
  if (cron.validate(reminderJobSchedule)) {
    cron.schedule(
      reminderJobSchedule,
      async () => {
        console.log(`[Scheduler] [${new Date().toISOString()}] Minute-by-minute reminder cron triggered.`);
        await runReminderJob();
      },
      {
        scheduled: true,
        timezone: env.timezone,
      }
    );
    console.log(`[Scheduler] Registered Meeting Reminder & Monitor job for "* * * * *".`);
  } else {
    console.error("[Scheduler] Invalid cron expression for Reminder job.");
  }

  isSchedulerRunning = true;
  console.log("[Scheduler] All scheduled jobs started successfully.");
}

export async function triggerMorningDigestNow() {
  console.log("[Scheduler] Manual trigger for Morning Digest...");
  await runMorningDigestJob();
}

export async function triggerReminderJobNow() {
  console.log("[Scheduler] Manual trigger for Reminder Job...");
  await runReminderJob();
}
