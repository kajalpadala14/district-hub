import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  assertTaskAccess,
  deleteCalendarEvent,
  getAuthenticatedUser,
  loadCalendarSource,
  loadConnection,
  logAudit,
  refreshAccessToken,
  serviceClient,
} from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const { taskId } = await req.json();
    if (!taskId) return jsonResponse({ error: "taskId is required" }, 400);

    console.info("[Planner Google Calendar Delete] Edge Function received", {
      taskId,
      actorId: user.id,
    });

    const task = await loadCalendarSource(taskId);
    await assertTaskAccess(user.id, task);

    console.info("[Planner Google Calendar Delete] calendar source loaded", {
      sourceType: task.source_type ?? "task",
      sourceId: task.id,
      ownerUserId: task.created_by,
    });

    if (task.source_type === "planner_event") {
      const { data: events, error } = await serviceClient
        .from("calendar_events")
        .select("user_id, external_event_id, sync_status")
        .eq("source_type", "planner_event")
        .eq("source_id", task.id)
        .eq("provider", "google");
      if (error) throw error;

      for (const event of events ?? []) {
        if (!event.external_event_id) continue;
        const connection = await loadConnection(event.user_id);
        if (!connection) {
          throw new Error(
            "Google Calendar is no longer connected. Reconnect Google Calendar before deleting this synced meeting.",
          );
        }
        const accessToken = await refreshAccessToken(connection);
        await deleteCalendarEvent(event.external_event_id, accessToken);
      }

      const deleteResult = await serviceClient
        .from("calendar_events")
        .delete()
        .eq("source_type", "planner_event")
        .eq("source_id", task.id)
        .eq("provider", "google");
      if (deleteResult.error) throw deleteResult.error;

      await logAudit(task.id, user.id, "task_deleted", {
        source_type: "planner_event",
        provider: "google",
        deleted_google_events: (events ?? []).filter((event) => event.external_event_id).length,
      });

      return jsonResponse({ ok: true });
    }

    const { data: events, error } = await serviceClient
      .from("task_calendar_events")
      .select("user_id, google_calendar_event_id")
      .eq("task_id", task.id);
    if (error) throw error;

    for (const event of events ?? []) {
      const connection = await loadConnection(event.user_id);
      if (!connection) {
        throw new Error(
          "Google Calendar is no longer connected. Reconnect Google Calendar before deleting this synced task.",
        );
      }
      const accessToken = await refreshAccessToken(connection);
      await deleteCalendarEvent(event.google_calendar_event_id, accessToken);
    }

    if (
      task.google_calendar_event_id &&
      !(events ?? []).some(
        (event) => event.google_calendar_event_id === task.google_calendar_event_id,
      )
    ) {
      const connection = await loadConnection(task.created_by);
      if (connection) {
        const accessToken = await refreshAccessToken(connection);
        await deleteCalendarEvent(task.google_calendar_event_id, accessToken);
      }
    }

    await serviceClient.from("task_calendar_events").delete().eq("task_id", task.id);
    await serviceClient
      .from("tasks")
      .update({
        google_calendar_event_id: null,
        calendar_event_html_link: null,
        calendar_sync_status: "not_synced",
        calendar_last_synced_at: null,
        calendar_sync_error: null,
        calendar_retry_count: 0,
        calendar_sync_enabled: false,
      })
      .eq("id", task.id);
    await logAudit(task.id, user.id, "task_deleted", {
      source_type: "task",
      provider: "google",
      deleted_google_events: (events ?? []).length,
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Google Calendar delete failed" },
      error instanceof Error && "status" in error ? Number(error.status) : 500,
    );
  }
});
