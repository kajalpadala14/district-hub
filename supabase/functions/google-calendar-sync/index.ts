import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  assertTaskAccess,
  getAuthenticatedUser,
  loadCalendarSource,
  loadConnection,
  logAudit,
  refreshAccessToken,
  saveCalendarFailure,
  saveCalendarSuccess,
  serviceClient,
  upsertCalendarEvent,
} from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let requestedTaskId: string | null = null;
  let actorId: string | null = null;
  try {
    const user = await getAuthenticatedUser(req);
    actorId = user.id;
    const { taskId, retry } = await req.json();
    requestedTaskId = typeof taskId === "string" ? taskId : null;
    if (!taskId) return jsonResponse({ error: "taskId is required" }, 400);

    console.info("[Planner Google Calendar Sync] Edge Function received", {
      taskId,
      retry: retry === true,
      actorId: user.id,
    });

    const task = await loadCalendarSource(taskId);
    console.info("[Planner Google Calendar Sync] calendar source loaded", {
      sourceType: task.source_type ?? "task",
      sourceId: task.id,
      ownerUserId: task.created_by,
      selectedSlot: task.due_time,
    });
    await assertTaskAccess(user.id, task);

    if (task.source_type === "task") {
      const { error: pendingError } = await serviceClient
        .from("tasks")
        .update({ calendar_sync_status: "pending" })
        .eq("id", task.id);
      if (pendingError) throw pendingError;
    } else {
      const { error: pendingError } = await serviceClient.from("calendar_events").upsert(
        {
          source_type: "planner_event",
          source_id: task.id,
          provider: "google",
          user_id: task.created_by,
          sync_status: "pending",
          sync_error: null,
        },
        { onConflict: "source_type,source_id,provider,user_id" },
      );
      if (pendingError) throw pendingError;
    }

    const owners = Array.from(
      new Set([task.created_by, task.assignee_id].filter(Boolean)),
    ) as string[];
    const connectedOwners = [];
    const skippedOwners = [];

    for (const ownerUserId of owners) {
      const connection = await loadConnection(ownerUserId);
      if (!connection) {
        console.warn("[Planner Google Calendar Sync] no Google connection for owner", {
          sourceId: task.id,
          ownerUserId,
        });
        skippedOwners.push(ownerUserId);
        continue;
      }
      connectedOwners.push(ownerUserId);
      console.info("[Planner Google Calendar Sync] Google connection found", {
        sourceId: task.id,
        ownerUserId,
        expiresAt: connection.expires_at,
      });
      const accessToken = await refreshAccessToken(connection);
      const event = await upsertCalendarEvent(task, ownerUserId, accessToken);
      await saveCalendarSuccess(task, ownerUserId, event);
      console.info("[Planner Google Calendar Sync] calendar_events sync recorded", {
        sourceType: task.source_type ?? "task",
        sourceId: task.id,
        ownerUserId,
        googleEventId: event.id,
      });
    }

    if (connectedOwners.length === 0) {
      throw new Error(
        "No connected Google Calendar account found for this task owner or assignee.",
      );
    }

    await logAudit(task.id, user.id, "calendar_synced", {
      retry: retry === true,
      source_type: task.source_type ?? "task",
      selected_slot: task.due_time,
      connected_owners: connectedOwners,
      skipped_owners: skippedOwners,
    });

    return jsonResponse({ ok: true, connectedOwners, skippedOwners });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar sync failed";
    if (requestedTaskId) {
      const task = await loadCalendarSource(requestedTaskId).catch(() => null);
      if (task) {
        try {
          await saveCalendarFailure(task, message);
          if (actorId) await logAudit(task.id, actorId, "calendar_sync_failed", { error: message });
        } catch (statusError) {
          console.warn("[Planner Google Calendar Sync] failed to record sync failure", {
            sourceId: task.id,
            error: statusError instanceof Error ? statusError.message : statusError,
          });
        }
      }
    }
    return jsonResponse(
      { error: message },
      error instanceof Error && "status" in error ? Number(error.status) : 500,
    );
  }
});
