import { supabase } from "@/integrations/supabase/client";
import type { Task } from "@/hooks/useData";

export type CalendarSyncStatus = Task["calendar_sync_status"];

export async function requestGoogleCalendarConnection(returnTo = window.location.href) {
  await ensureCalendarAuthSession();

  const { data, error } = await supabase.functions.invoke<{ authUrl: string }>("google-calendar-auth-url", {
    body: { returnTo },
  });
  if (error) {
    throw new Error(
      [
        "Google Calendar connection could not start.",
        error.message,
        "Check that Supabase Edge Functions are deployed and GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI are configured.",
      ].join(" "),
    );
  }
  if (!data?.authUrl) throw new Error("Google authorization URL was not returned.");
  window.location.assign(data.authUrl);
}

async function ensureCalendarAuthSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (sessionData.session?.user) return;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      [
        "Please enable Supabase anonymous sign-in or add a login screen before connecting Google Calendar.",
        error.message,
      ].join(" "),
    );
  }
  if (!data.user) throw new Error("Could not create a local app session for Google Calendar.");
}

export async function syncTaskCalendar(taskId: string, retry = false) {
  const { error } = await supabase.functions.invoke("google-calendar-sync", {
    body: { taskId, retry },
  });
  if (error) throw new Error(error.message);
}

export async function deleteTaskCalendarEvent(taskId: string) {
  const { error } = await supabase.functions.invoke("google-calendar-delete", {
    body: { taskId },
  });
  if (error) throw new Error(error.message);
}

export function googleCalendarUrl(task: Task) {
  if (task.calendar_event_html_link) return task.calendar_event_html_link;
  if (!task.google_calendar_event_id) return null;
  return `https://calendar.google.com/calendar/event?eid=${encodeURIComponent(task.google_calendar_event_id)}`;
}

export function canOpenGoogleCalendar(task: Task) {
  return task.calendar_sync_status === "synced" && !!googleCalendarUrl(task);
}
