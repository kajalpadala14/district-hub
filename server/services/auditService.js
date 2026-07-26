import { supabaseAdmin } from "../config/supabase.js";

export async function audit(req, action, taskId = null, metadata = {}) {
  await supabaseAdmin.from("task_activity_logs").insert({
    task_id: taskId,
    actor_id: req.user?.id ?? null,
    action,
    metadata,
    ip_address: req.ip ?? null,
    user_agent: req.headers["user-agent"] ?? null,
  });
}
