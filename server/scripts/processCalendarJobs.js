import { supabaseAdmin } from "../config/supabase.js";
import { disableSourceCalendarEvents, syncSource } from "../services/calendarService.js";

const limit = Number(process.env.CALENDAR_JOB_LIMIT ?? 25);

async function main() {
  const { data: jobs, error } = await supabaseAdmin
    .from("calendar_sync_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  for (const job of jobs ?? []) {
    await processJob(job);
  }
  console.log(`Processed ${jobs?.length ?? 0} calendar job(s)`);
}

async function processJob(job) {
  await supabaseAdmin.from("calendar_sync_jobs").update({ status: "running", attempts: job.attempts + 1 }).eq("id", job.id);
  try {
    if (job.action === "delete") {
      await disableSourceCalendarEvents({ sourceType: job.source_type, sourceId: job.source_id });
    } else {
      await syncSource({
        userId: job.user_id,
        sourceType: job.source_type,
        sourceId: job.source_id,
        provider: job.provider,
      });
    }
    await supabaseAdmin.from("calendar_sync_jobs").update({ status: "succeeded", last_error: null }).eq("id", job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar job failed";
    const retry = job.attempts + 1 < 3;
    await supabaseAdmin
      .from("calendar_sync_jobs")
      .update({
        status: retry ? "pending" : "failed",
        last_error: message,
        run_after: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      })
      .eq("id", job.id);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
