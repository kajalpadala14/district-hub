import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useDepartments, usePlannerEvents, useProfiles, type Task } from "@/hooks/useData";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { requestGoogleCalendarConnection, syncTaskCalendar } from "@/lib/googleCalendar";
import {
  dateKeyForTask,
  isPlannerMeetingTask,
  PLANNER_MEETING_TYPE_LINE,
} from "@/lib/taskClassification";

export const Route = createFileRoute("/_authenticated/planner")({
  component: PlannerPage,
});

type PlannerSlot = { range: string; label: string | null; tall?: boolean };
type PlannerDialogMode = "create" | "edit";
type PlannerSettings = {
  dayStart: string;
  dayEnd: string;
  slotMin: string;
  gapMin: string;
  lunchStart: string;
  lunchEnd: string;
  appleIcsUrl: string;
  token: string;
};

const defaultPlannerSettings: PlannerSettings = {
  dayStart: "10:00",
  dayEnd: "18:00",
  slotMin: "30",
  gapMin: "15",
  lunchStart: "13:30",
  lunchEnd: "14:30",
  appleIcsUrl: "",
  token: "",
};

const eventColors = [
  "bg-primary",
  "bg-success",
  "bg-warning",
  "bg-destructive",
  "bg-info",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-400",
] as const;

const pendingPlannerGoogleSyncKey = "district-hub:pending-planner-google-sync";

function PlannerPage() {
  const { user } = useAuth();
  const { tasks, refresh: refreshTasks } = usePlannerEvents();
  const { profiles } = useProfiles();
  const { departments } = useDepartments([
    ...tasks.map((task) => task.department),
    ...profiles.map((profile) => profile.department),
  ]);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [dialogMode, setDialogMode] = useState<PlannerDialogMode>("create");
  const [defaultDate, setDefaultDate] = useState<string | null>(null);
  const [defaultTime, setDefaultTime] = useState("10:00 AM");
  const [showSettings, setShowSettings] = useState(false);
  const [plannerSettings, setPlannerSettings] = useState<PlannerSettings>(defaultPlannerSettings);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const meetings = useMemo(() => tasks.filter(isPlannerMeetingTask), [tasks]);
  const slots = useMemo(
    () => buildPlannerSlots(plannerSettings, meetings, days),
    [plannerSettings, meetings, days],
  );
  const icsHttpsUrl = useMemo(
    () => buildPlannerIcsUrl(plannerSettings.token, "https"),
    [plannerSettings.token],
  );
  const icsWebcalUrl = useMemo(
    () => buildPlannerIcsUrl(plannerSettings.token, "webcal"),
    [plannerSettings.token],
  );
  const subscriptionUrlWarning = useMemo(
    () => plannerSubscriptionWarning(icsHttpsUrl),
    [icsHttpsUrl],
  );

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("planner_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data) {
        if (!cancelled) setPlannerSettings(plannerSettingsFromRow(data));
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("planner_settings")
        .insert({ user_id: user.id })
        .select("*")
        .single();

      if (createError) {
        toast.error(createError.message);
        return;
      }
      if (!cancelled) setPlannerSettings(plannerSettingsFromRow(created));
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("googleCalendar") !== "connected") return;

    const pendingTaskId = window.localStorage.getItem(pendingPlannerGoogleSyncKey);
    if (!pendingTaskId) return;

    window.localStorage.removeItem(pendingPlannerGoogleSyncKey);
    void syncTaskCalendar(pendingTaskId)
      .then(async () => {
        await refreshTasks();
        toast.success("Google Calendar connected and event synced");
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Google Calendar sync failed");
      });
  }, [user?.id, refreshTasks]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const day of days) map.set(format(day, "yyyy-MM-dd"), []);
    for (const task of meetings) {
      const anchor = dateKeyForTask(task);
      if (anchor && map.has(anchor)) map.get(anchor)!.push(task);
    }
    for (const dayTasks of map.values()) dayTasks.sort(comparePlannerTasks);
    return map;
  }, [meetings, days]);

  const openNew = (dateKey: string, time = "10:00 AM") => {
    setEditing(null);
    setDialogMode("create");
    setDefaultDate(dateKey);
    setDefaultTime(time);
    setDialogOpen(true);
  };

  const openExisting = (task: Task, dateKey: string, time: string) => {
    setEditing(task);
    setDialogMode(task.id.startsWith("ics-") ? "create" : "edit");
    setDefaultDate(dateKey);
    setDefaultTime(time);
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditing(null);
      setDialogMode("create");
    }
  };

  const savePlannerSettings = async () => {
    if (!user?.id) {
      toast.error("Sign in required to save planner settings");
      return;
    }

    setSettingsSaving(true);
    try {
      validateAppleCalendarUrl(plannerSettings.appleIcsUrl);
      const { data, error } = await supabase
        .from("planner_settings")
        .upsert(plannerSettingsToRow(user.id, plannerSettings), { onConflict: "user_id" })
        .select("*")
        .single();

      if (error) throw error;
      const savedSettings = plannerSettingsFromRow(data);
      setPlannerSettings(savedSettings);
      toast.success(
        savedSettings.appleIcsUrl.trim()
          ? "Apple Calendar URL saved. Use the WEBCAL link for live subscription updates."
          : "Planner settings saved. Copy the WEBCAL link to subscribe in Apple Calendar.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Planner settings save failed");
    } finally {
      setSettingsSaving(false);
    }
  };

  const rotateToken = async () => {
    if (!user?.id) {
      toast.error("Sign in required to rotate planner token");
      return;
    }

    const token = createPlannerToken();
    const next = { ...plannerSettings, token };
    setSettingsSaving(true);
    try {
      const { data, error } = await supabase
        .from("planner_settings")
        .upsert(plannerSettingsToRow(user.id, next), { onConflict: "user_id" })
        .select("*")
        .single();

      if (error) throw error;
      setPlannerSettings(plannerSettingsFromRow(data));
      toast.success("Planner token rotated in Supabase");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Planner token update failed");
    } finally {
      setSettingsSaving(false);
    }
  };

  const copyText = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const exportIcs = () => {
    if (!icsHttpsUrl) {
      toast.error("Planner subscription token is not ready");
      return;
    }
    const link = document.createElement("a");
    link.href = icsHttpsUrl;
    link.download = "planner.ics";
    link.click();
    toast.success("Live ICS feed downloaded");
  };

  const copyDayMessage = async () => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const todaysTasks = meetings.filter((task) => dateKeyForTask(task) === todayKey);
    const message = [
      `Governance Planner - ${format(new Date(), "dd MMM yyyy")}`,
      "",
      ...(todaysTasks.length
        ? todaysTasks.map(
            (task, index) =>
              `${index + 1}. ${task.title}${task.due_time ? ` at ${toDisplayTime(task.due_time)}` : ""}`,
          )
        : ["No planner events scheduled today."]),
    ].join("\n");
    await copyText("Day message", message);
  };

  const deletePlannerMeeting = async (task: Task) => {
    if (task.id.startsWith("ics-")) {
      toast.error("Imported calendar events cannot be deleted from this app.");
      return;
    }

    const confirmed = window.confirm(`Delete meeting "${task.title}"?`);
    if (!confirmed) return;

    setDeletingEventId(task.id);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Please sign in before deleting planner meetings.");

      const response = await fetch("/api/planner/tasks", {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ id: task.id }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Meeting delete failed");
      }

      await refreshTasks();
      toast.success("Meeting deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Meeting delete failed");
    } finally {
      setDeletingEventId(null);
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Weekly Planner</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(weekStart, "d MMM")} - {format(addDays(weekStart, 6), "d MMM yyyy")} · 30 min
            slots · 15 min breaks
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous week"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next week"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-info/10 text-info hover:bg-info/15 hover:text-info"
            onClick={exportIcs}
          >
            <Link2 className="h-4 w-4" />
            Download ICS
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-success/10 text-success hover:bg-success/15 hover:text-success"
            onClick={copyDayMessage}
          >
            <MessageCircle className="h-4 w-4" />
            Day Message
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Refresh planner"
            onClick={() => {
              void refreshTasks();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            onClick={() => setShowSettings((value) => !value)}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button size="sm" onClick={() => openNew(format(new Date(), "yyyy-MM-dd"))}>
            <Plus className="h-4 w-4" />
            Add Meeting
          </Button>
        </div>
      </section>

      {showSettings && (
        <PlannerSettingsPanel
          settings={plannerSettings}
          httpsUrl={icsHttpsUrl}
          webcalUrl={icsWebcalUrl}
          subscriptionUrlWarning={subscriptionUrlWarning}
          onChange={setPlannerSettings}
          onSave={savePlannerSettings}
          onCopy={copyText}
          onRotate={rotateToken}
          saving={settingsSaving}
        />
      )}

      <section className="overflow-hidden rounded-2xl border bg-card shadow-elevated">
        <div className="grid min-w-[1100px] grid-cols-7 overflow-x-auto">
          {days.map((day) => {
            const today = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-r border-border/70 px-4 py-3 text-center last:border-r-0",
                  today && "bg-primary/10",
                )}
              >
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div className={cn("mt-1 text-xl font-semibold", today && "text-primary")}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(key) ?? [];
            return (
              <div key={key} className="border-r border-border/70 last:border-r-0">
                <div className="space-y-2 p-2">
                  {slots.map((slot, slotIndex) => {
                    const task = taskForPlannerSlot(dayTasks, slot, slotIndex);
                    const showTask = !!task;
                    const openSlot = () => {
                      if (showTask && task) {
                        openExisting(task, key, slot.range.split(" - ")[0]);
                      } else {
                        openNew(key, slot.range.split(" - ")[0]);
                      }
                    };

                    return (
                      <div
                        key={`${key}-${slot.range}`}
                        role="button"
                        tabIndex={0}
                        className={cn(
                          "w-full cursor-pointer rounded-lg border bg-background/80 p-2 text-left shadow-card transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30",
                          slot.tall ? "min-h-[72px]" : "min-h-[46px]",
                          showTask && "border-primary/30 bg-primary/15",
                        )}
                        onClick={openSlot}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openSlot();
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
                          <span>{slot.range}</span>
                          {!showTask && (
                            <span className="text-muted-foreground/45">Draft Slot</span>
                          )}
                        </div>
                        {showTask && task ? (
                          <div className="relative mt-2 rounded-md bg-primary/20 p-2 pr-9 text-primary">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1.5 top-1.5 h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Delete meeting ${task.title}`}
                              title="Delete meeting"
                              disabled={deletingEventId === task.id}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                void deletePlannerMeeting(task);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <div className="flex items-start gap-1.5">
                              <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-semibold">{task.title}</p>
                                <p className="mt-1 text-[11px] text-primary/80">
                                  {task.status === "blocked"
                                    ? "Meeting - Cancelled"
                                    : "Meeting - Confirmed"}
                                </p>
                                <p className="text-[11px] text-primary/80">
                                  Time: {task.due_time ? toDisplayTime(task.due_time) : "All day"}
                                </p>
                                <p className="truncate text-[11px] text-primary/80">
                                  {task.department || "Governance Department"}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge className="h-5 bg-primary text-primary-foreground hover:bg-primary">
                                WhatsApp
                              </Badge>
                              <Badge variant="destructive" className="h-5">
                                !
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <p className="mt-1 text-[11px] font-medium text-foreground">
                            {slot.label}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <EventDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        event={editing}
        mode={dialogMode}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        departments={departments.map((department) => department.name)}
        onSaved={refreshTasks}
      />
    </div>
  );
}

function PlannerSettingsPanel({
  settings,
  httpsUrl,
  webcalUrl,
  subscriptionUrlWarning,
  onChange,
  onSave,
  onCopy,
  onRotate,
  saving,
}: {
  settings: PlannerSettings;
  httpsUrl: string;
  webcalUrl: string;
  subscriptionUrlWarning: string;
  onChange: (settings: PlannerSettings) => void;
  onSave: () => void | Promise<void>;
  onCopy: (label: string, value: string) => Promise<void>;
  onRotate: () => void | Promise<void>;
  saving: boolean;
}) {
  const update = (key: keyof PlannerSettings, value: string) =>
    onChange({ ...settings, [key]: value });

  return (
    <section className="min-w-0 rounded-lg border bg-card p-4 shadow-elevated sm:p-5">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[repeat(6,minmax(110px,1fr))_minmax(240px,2fr)]">
        <PlannerSettingInput
          label="Day Start"
          type="time"
          value={settings.dayStart}
          onChange={(value) => update("dayStart", value)}
        />
        <PlannerSettingInput
          label="Day End"
          type="time"
          value={settings.dayEnd}
          onChange={(value) => update("dayEnd", value)}
        />
        <PlannerSettingInput
          label="Slot (Min)"
          type="number"
          value={settings.slotMin}
          onChange={(value) => update("slotMin", value)}
        />
        <PlannerSettingInput
          label="Gap (Min)"
          type="number"
          value={settings.gapMin}
          onChange={(value) => update("gapMin", value)}
        />
        <PlannerSettingInput
          label="Lunch Start"
          type="time"
          value={settings.lunchStart}
          onChange={(value) => update("lunchStart", value)}
        />
        <PlannerSettingInput
          label="Lunch End"
          type="time"
          value={settings.lunchEnd}
          onChange={(value) => update("lunchEnd", value)}
        />
        <div className="min-w-0 sm:col-span-2 lg:col-span-3 2xl:col-span-1">
          <PlannerSettingInput
            label="Apple ICS URL"
            value={settings.appleIcsUrl}
            onChange={(value) => update("appleIcsUrl", value)}
          />
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button className="w-full sm:w-auto" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        <p className="min-w-0 text-sm text-muted-foreground">
          Default: 10:00-18:00, 30 min slots, 15 min break, lunch 13:30-14:30.
        </p>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-success">
            Dashboard to Apple (HTTPS)
          </p>
          <Input
            className="mt-2 min-w-0 bg-background text-xs sm:text-sm"
            value={httpsUrl}
            readOnly
          />
          {subscriptionUrlWarning && (
            <p className="mt-2 text-xs font-medium text-destructive">{subscriptionUrlWarning}</p>
          )}
          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <Button
              size="sm"
              className="w-full bg-success text-success-foreground hover:bg-success/90 sm:w-auto"
              disabled={!httpsUrl}
              onClick={() => onCopy("HTTPS ICS URL", httpsUrl)}
            >
              Copy HTTPS
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={onRotate}
            >
              Rotate Token
            </Button>
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">
            Apple Subscription (WEBCAL)
          </p>
          <Input
            className="mt-2 min-w-0 bg-background text-xs sm:text-sm"
            value={webcalUrl}
            readOnly
          />
          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            <Button
              size="sm"
              className="w-full sm:w-auto"
              disabled={!webcalUrl}
              onClick={() => onCopy("WEBCAL URL", webcalUrl)}
            >
              Copy WEBCAL
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlannerSettingInput({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 bg-background"
      />
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  event,
  mode,
  defaultDate,
  defaultTime,
  departments,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Task | null;
  mode: PlannerDialogMode;
  defaultDate: string | null;
  defaultTime: string;
  departments: string[];
  onSaved: () => void | Promise<void>;
}) {
  const isEditMode = mode === "edit" && !!event && !event.id.startsWith("ics-");
  const [saving, setSaving] = useState(false);
  const [, setGoogleCalendarConnected] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    time: "10:00 AM",
    duration: "30m",
    status: "Confirmed",
    color: eventColors[0],
    department: "None",
    venue: "",
    attendees: "",
    notes: "",
    calendar_sync_enabled: false,
  });

  useEffect(() => {
    setForm({
      title: event?.title ?? "",
      date: event?.scheduled_date ?? defaultDate ?? format(new Date(), "yyyy-MM-dd"),
      time: toTimeInput(getEventTime(event?.due_time, defaultTime)),
      duration: "30m",
      status: event?.status === "done" ? "Confirmed" : "Confirmed",
      color: eventColors[0],
      department: event?.department ?? "None",
      venue: "",
      attendees: "",
      notes: event?.description ?? "",
      calendar_sync_enabled: isEditMode ? (event?.calendar_sync_enabled ?? false) : false,
    });
  }, [event, defaultDate, defaultTime, open, isEditMode]);

  useEffect(() => {
    if (!open || isEditMode) return;
    let cancelled = false;

    const loadGoogleCalendarStatus = async () => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.user.id) {
        if (!cancelled) setGoogleCalendarConnected(false);
        return;
      }

      const connected = await isGoogleCalendarConnected(sessionData.session.user.id);
      if (cancelled) return;
      setGoogleCalendarConnected(connected);
      setForm((current) => ({
        ...current,
        calendar_sync_enabled: connected,
      }));
      console.info("[Planner Google Calendar Sync] connection status loaded", {
        userId: sessionData.session.user.id,
        connected,
        defaultSyncEnabled: connected,
      });
    };

    void loadGoogleCalendarStatus();
    return () => {
      cancelled = true;
    };
  }, [open, isEditMode]);

  const submit = async (submitEvent: React.FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const title = form.title.trim();
    if (!title) {
      toast.error("Event title required");
      return;
    }
    const scheduledDate = fromDisplayDate(form.date);
    const dueTime = toTimeInput(form.time);
    const description = [
      PLANNER_MEETING_TYPE_LINE,
      form.notes.trim(),
      dueTime ? `Time: ${toDisplayTime(dueTime)}` : "",
      form.duration ? `Duration: ${form.duration}` : "",
      form.status ? `Status: ${form.status}` : "",
      form.venue ? `Venue: ${form.venue}` : "",
      form.attendees ? `Attendees: ${form.attendees}` : "",
      form.color ? `Color: ${form.color.replace("bg-", "")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const payload = {
      title,
      description: description || null,
      scheduled_date: scheduledDate,
      due_date: scheduledDate,
      due_time: dueTime || null,
      department: form.department === "None" ? null : form.department,
      status:
        form.status === "Cancelled"
          ? ("blocked" as const)
          : form.status === "Confirmed"
            ? ("in_progress" as const)
            : ("todo" as const),
      priority: "medium" as const,
      calendar_sync_enabled: form.calendar_sync_enabled,
    };

    console.info("[Planner Booking Debug] selected slot", {
      selectedSlot: form.time,
      normalizedSlot: dueTime,
    });
    console.info("[Planner Booking Debug] API payload", payload);

    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session?.user.id)
        throw new Error("Please sign in before saving planner events.");

      const savedTask = await savePlannerTask(
        isEditMode ? event.id : null,
        payload,
        sessionData.session.access_token,
        sessionData.session.user.id,
      );

      await onSaved();
      toast.success(isEditMode ? "Event updated" : "Event created");

      if (form.calendar_sync_enabled) {
        try {
          const connected = await isGoogleCalendarConnected(sessionData.session.user.id);
          if (!connected) {
            window.localStorage.setItem(pendingPlannerGoogleSyncKey, savedTask.id);
            toast.message("Event created. Connect Google Calendar to finish sync.");
            await requestGoogleCalendarConnection(window.location.href);
            return;
          }

          console.info("[Planner Google Calendar Sync] triggering Edge Function", {
            plannerEventId: savedTask.id,
            selectedSlot: payload.due_time,
          });
          const syncResult = await syncTaskCalendar(savedTask.id);
          console.info("[Planner Google Calendar Sync] Edge Function completed", syncResult);
          await onSaved();
          toast.success("Google Calendar synced");
        } catch (syncError) {
          console.error("[Planner Google Calendar Sync] failed", syncError);
          toast.error(
            syncError instanceof Error
              ? `Event saved, but Google Calendar sync failed: ${syncError.message}`
              : "Event saved, but Google Calendar sync failed",
          );
        }
      }

      onOpenChange(false);
    } catch (error) {
      console.error("[Planner Event Save] failed", error);
      toast.error(error instanceof Error ? error.message : "Event save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Meeting" : "New Meeting"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create or edit planner meeting details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 px-5 pb-5">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="event-title">Title *</FieldLabel>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Event title"
              className="bg-background"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="event-date">Date</FieldLabel>
              <Input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="event-time">Time</FieldLabel>
              <Input
                id="event-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Duration</FieldLabel>
              <Select
                value={form.duration}
                onValueChange={(value) => setForm({ ...form, duration: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15m</SelectItem>
                  <SelectItem value="30m">30m</SelectItem>
                  <SelectItem value="45m">45m</SelectItem>
                  <SelectItem value="1h">1h</SelectItem>
                  <SelectItem value="2h">2h</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Status</FieldLabel>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Tentative">Tentative</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Color</FieldLabel>
              <div className="flex h-10 items-center gap-1.5">
                {eventColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => setForm({ ...form, color })}
                    className={cn(
                      "h-6 w-4 rounded-full ring-offset-2",
                      color,
                      form.color === color && "ring-2 ring-primary",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>Department (Optional)</FieldLabel>
              <Select
                value={form.department}
                onValueChange={(value) => setForm({ ...form, department: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel htmlFor="event-venue">Venue</FieldLabel>
              <Input
                id="event-venue"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                placeholder="Meeting room"
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="event-attendees">Attendees</FieldLabel>
            <Input
              id="event-attendees"
              value={form.attendees}
              onChange={(e) => setForm({ ...form, attendees: e.target.value })}
              placeholder="Comma separated names"
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <FieldLabel htmlFor="event-notes">Description / Notes</FieldLabel>
            <Textarea
              id="event-notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes, agenda, comments..."
              rows={4}
              className="resize-none bg-background"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-3 text-sm font-medium shadow-sm">
            <Checkbox
              checked={form.calendar_sync_enabled}
              onCheckedChange={(checked) =>
                setForm({ ...form, calendar_sync_enabled: checked === true })
              }
            />
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Sync with Google Calendar
            </span>
          </label>

          <DialogFooter className="grid grid-cols-2 gap-2 sm:space-x-0">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Meeting"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <Label
      htmlFor={htmlFor}
      className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground"
    >
      {children}
    </Label>
  );
}

type PlannerSettingsRow = {
  day_start: string;
  day_end: string;
  slot_min: number;
  gap_min: number;
  lunch_start: string;
  lunch_end: string;
  apple_ics_url: string;
  apple_calendar_url?: string | null;
  subscription_token: string;
  ics_token?: string | null;
};

function plannerSettingsFromRow(row: PlannerSettingsRow): PlannerSettings {
  return {
    dayStart: timeInputValue(row.day_start),
    dayEnd: timeInputValue(row.day_end),
    slotMin: String(row.slot_min),
    gapMin: String(row.gap_min),
    lunchStart: timeInputValue(row.lunch_start),
    lunchEnd: timeInputValue(row.lunch_end),
    appleIcsUrl: row.apple_calendar_url ?? row.apple_ics_url ?? "",
    token: row.ics_token ?? row.subscription_token,
  };
}

function plannerSettingsToRow(userId: string, settings: PlannerSettings) {
  const token = settings.token || createPlannerToken();
  return {
    user_id: userId,
    day_start: settings.dayStart || defaultPlannerSettings.dayStart,
    day_end: settings.dayEnd || defaultPlannerSettings.dayEnd,
    slot_min: Number(settings.slotMin) || Number(defaultPlannerSettings.slotMin),
    gap_min: Number(settings.gapMin) || Number(defaultPlannerSettings.gapMin),
    lunch_start: settings.lunchStart || defaultPlannerSettings.lunchStart,
    lunch_end: settings.lunchEnd || defaultPlannerSettings.lunchEnd,
    apple_ics_url: settings.appleIcsUrl,
    subscription_token: token,
  };
}

function timeInputValue(value: string) {
  return value.slice(0, 5);
}

function createPlannerToken() {
  const bytes = new Uint8Array(18);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1)
      bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function buildPlannerSlots(
  settings: PlannerSettings,
  tasks: Task[] = [],
  days: Date[] = [],
): PlannerSlot[] {
  const slots: PlannerSlot[] = [];
  const slotMin = Math.max(5, Number(settings.slotMin) || 30);
  const gapMin = Math.max(0, Number(settings.gapMin) || 0);
  const dayKeys = new Set(days.map((day) => format(day, "yyyy-MM-dd")));
  const taskTimes = tasks
    .filter((task) => {
      const date = dateKeyForTask(task);
      return !dayKeys.size || (date ? dayKeys.has(date) : false);
    })
    .map((task) => normalizeTaskTimeMinutes(task.due_time))
    .filter((time): time is number => time !== null);
  const configuredStart = minutesFromTime(settings.dayStart);
  const configuredEnd = minutesFromTime(settings.dayEnd);
  const earliestTask = taskTimes.length ? Math.min(...taskTimes) : configuredStart;
  const latestTask = taskTimes.length ? Math.max(...taskTimes) + slotMin : configuredEnd;
  let cursor = Math.max(0, Math.min(configuredStart, roundDownMinutes(earliestTask, slotMin)));
  const end = Math.min(24 * 60, Math.max(configuredEnd, roundUpMinutes(latestTask, slotMin)));
  const lunchStart = minutesFromTime(settings.lunchStart);
  const lunchEnd = minutesFromTime(settings.lunchEnd);

  while (cursor < end) {
    if (cursor === lunchStart && lunchEnd > lunchStart) {
      slots.push({
        range: `${timeFromMinutes(lunchStart)} - ${timeFromMinutes(lunchEnd)}`,
        label: "Lunch Break",
        tall: true,
      });
      cursor = lunchEnd;
      continue;
    }

    if (cursor < lunchStart && cursor + slotMin > lunchStart) {
      cursor = lunchStart;
      continue;
    }

    const slotEnd = Math.min(cursor + slotMin, end);
    if (slotEnd > cursor) {
      slots.push({
        range: `${timeFromMinutes(cursor)} - ${timeFromMinutes(slotEnd)}`,
        label: null,
      });
    }
    cursor = slotEnd;

    if (gapMin > 0 && cursor < end && !(cursor >= lunchStart && cursor < lunchEnd)) {
      const breakEnd = Math.min(cursor + gapMin, end);
      slots.push({
        range: `${timeFromMinutes(cursor)} - ${timeFromMinutes(breakEnd)}`,
        label: `${gapMin}M BREAK`,
      });
      cursor = breakEnd;
    }
  }

  return slots;
}

function buildPlannerIcsUrl(token: string, scheme: "https" | "webcal") {
  if (!token) return "";
  const origin = plannerPublicOrigin();
  if (!origin) return `/api/planner/export.ics?token=${encodeURIComponent(token)}`;
  const url = new URL(`/api/planner/export.ics?token=${encodeURIComponent(token)}`, origin);
  if (scheme === "https" && url.protocol === "http:" && !isPrivatePlannerHost(url.hostname)) {
    url.protocol = "https:";
  }
  if (scheme === "webcal") url.protocol = "webcal:";
  return url.toString();
}

function plannerPublicOrigin() {
  const configured = import.meta.env.VITE_PLANNER_PUBLIC_BASE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(/^https?:\/\//i.test(configured) ? configured : `https://${configured}`);
      return url.origin;
    } catch {
      return configured;
    }
  }
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function plannerSubscriptionWarning(urlText: string) {
  if (!urlText) return "";
  try {
    const url = new URL(urlText);
    if (url.protocol !== "https:" && url.protocol !== "webcal:") {
      return "Calendar subscription needs a public HTTPS app URL.";
    }
    if (isPrivatePlannerHost(url.hostname)) {
      return "This is a local/private URL. Set VITE_PLANNER_PUBLIC_BASE_URL to your deployed HTTPS app URL before using Google or Apple subscription.";
    }
  } catch {
    return "Calendar subscription URL is invalid.";
  }
  return "";
}

function validateAppleCalendarUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;

  try {
    const url = new URL(trimmed.replace(/^webcal:/i, "https:"));
    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Apple Calendar URL must be an HTTPS or WEBCAL URL.");
    }
  } catch {
    throw new Error(
      "Apple Calendar URL is invalid. Leave it blank or paste a valid HTTPS/WEBCAL URL.",
    );
  }
}

function isPrivatePlannerHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
}

function taskForPlannerSlot(dayTasks: Task[], slot: PlannerSlot, slotIndex: number) {
  const [slotStartText, slotEndText] = slot.range.split(" - ");
  const slotStart = minutesFromTime(slotStartText);
  const slotEnd = minutesFromTime(slotEndText ?? slotStartText);

  const timedTask = dayTasks.find((task) => {
    const taskTime = normalizeTaskTimeMinutes(task.due_time);
    console.info("[Planner Position Debug] slot match", {
      taskId: task.id,
      title: task.title,
      rawTime: task.due_time,
      normalizedMinutes: taskTime,
      slot: slot.range,
      slotStart,
      slotEnd,
      matches: taskTime !== null && taskTime >= slotStart && taskTime < slotEnd,
    });
    return taskTime !== null && taskTime >= slotStart && taskTime < slotEnd;
  });
  if (timedTask) return timedTask;

  const untimedTasks = dayTasks.filter((task) => normalizeTaskTimeMinutes(task.due_time) === null);
  return untimedTasks[slotIndex] ?? null;
}

function comparePlannerTasks(a: Task, b: Task) {
  const aTime = normalizeTaskTimeMinutes(a.due_time) ?? Number.MAX_SAFE_INTEGER;
  const bTime = normalizeTaskTimeMinutes(b.due_time) ?? Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return a.title.localeCompare(b.title);
}

function normalizeTaskTimeMinutes(value: string | null | undefined) {
  if (!value) return null;
  const normalized = parseTimeInput(value);
  if (!normalized) return null;
  return minutesFromTime(normalized);
}

function roundDownMinutes(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function roundUpMinutes(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

async function savePlannerTask(
  id: string | null,
  payload: {
    title: string;
    description: string | null;
    scheduled_date: string;
    due_date: string;
    due_time: string | null;
    department: string | null;
    status: Task["status"];
    priority: Task["priority"];
    calendar_sync_enabled: boolean;
  },
  accessToken: string,
  currentUserId: string,
) {
  try {
    const response = await fetch("/api/planner/tasks", {
      method: id ? "PUT" : "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ id, ...payload }),
    });

    if (!response.ok) {
      const message = await response.text();
      if (![404, 405].includes(response.status)) throw new Error(message);
      console.warn("[Planner Event Save] server API unavailable, using Supabase fallback", message);
    } else {
      const result = (await response.json()) as { task?: Pick<Task, "id"> };
      if (!result.task?.id) throw new Error("Event save did not return an id.");
      return result.task;
    }
  } catch (error) {
    if (
      error instanceof Error &&
      !/Failed to fetch|Load failed|NetworkError/i.test(error.message)
    ) {
      throw error;
    }
    console.warn("[Planner Event Save] server API request failed, using Supabase fallback", error);
  }

  const result = id
    ? await savePlannerEventFallback(id, payload, currentUserId)
    : await savePlannerEventFallback(null, payload, currentUserId);

  if (result.error) throw result.error;
  if (!result.data?.id) throw new Error("Event save did not return an id.");

  return result.data;
}

async function savePlannerEventFallback(
  id: string | null,
  payload: {
    title: string;
    description: string | null;
    scheduled_date: string;
    due_date: string;
    due_time: string | null;
    department: string | null;
    status: Task["status"];
    priority: Task["priority"];
    calendar_sync_enabled: boolean;
  },
  currentUserId: string,
) {
  const result = id
    ? await supabase
        .from("planner_events")
        .update(plannerEventPayload(payload))
        .eq("id", id)
        .select("id")
        .single()
    : await supabase
        .from("planner_events")
        .insert({ ...plannerEventPayload(payload), user_id: currentUserId })
        .select("id")
        .single();

  if (!result.error || !isPlannerEventsTableUnavailable(result.error)) return result;

  return id
    ? supabase.from("tasks").update(payload).eq("id", id).select("id").single()
    : supabase
        .from("tasks")
        .insert({ ...payload, created_by: currentUserId })
        .select("id")
        .single();
}

function isPlannerEventsTableUnavailable(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  return error.code === "42P01" || /planner_events/i.test(message) || /schema cache/i.test(message);
}

function plannerEventPayload(payload: {
  title: string;
  description: string | null;
  scheduled_date: string;
  due_time: string | null;
  department: string | null;
  status: Task["status"];
  priority: Task["priority"];
}) {
  const startTime = payload.due_time ? toTimeInput(payload.due_time) : null;
  const duration = extractDurationMinutes(payload.description) ?? 30;
  const eventPayload = {
    title: payload.title,
    description: payload.description,
    location: extractDescriptionField(payload.description, "Venue") ?? payload.department,
    date: payload.scheduled_date,
    start_time: startTime,
    end_time: startTime ? timeFromMinutes(minutesFromTime(startTime) + duration) : null,
    is_all_day: !startTime,
    status: plannerEventStatus(payload.status, payload.description),
    priority: payload.priority,
    color: extractDescriptionField(payload.description, "Color"),
  };
  console.info("[Planner Booking Debug] planner_events payload", {
    selectedSlot: payload.due_time,
    databaseStartTime: eventPayload.start_time,
    databaseEndTime: eventPayload.end_time,
  });
  return eventPayload;
}

function plannerEventStatus(status: Task["status"], description: string | null) {
  const formStatus = extractDescriptionField(description, "Status")?.toLowerCase();
  if (status === "blocked" || formStatus === "cancelled") return "cancelled";
  if (status === "done") return "completed";
  if (status === "todo" || formStatus === "tentative") return "tentative";
  return "confirmed";
}

async function isGoogleCalendarConnected(userId: string) {
  const { data, error } = await supabase
    .from("google_calendar_connection_status")
    .select("user_id, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[Planner Google Calendar Status] failed", error);
    return false;
  }

  return !!data;
}

function minutesFromTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

function timeFromMinutes(value: number) {
  const minuteOfDay = ((value % 1440) + 1440) % 1440;
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function extractDurationMinutes(description: string | null | undefined) {
  const duration = extractDescriptionField(description, "Duration");
  if (!duration) return null;
  const match = duration.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return match[2].toLowerCase().startsWith("h") ? amount * 60 : amount;
}

function extractDescriptionField(description: string | null | undefined, field: string) {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = description?.match(new RegExp(`^${escapedField}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || null;
}

function toDisplayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${day}-${month}-${year}`;
}

function fromDisplayDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [day, month, year] = value.split("-");
  if (day && month && year) return `${year}-${month}-${day}`;
  return format(new Date(), "yyyy-MM-dd");
}

function getEventTime(dueTime: string | null | undefined, fallback: string) {
  return dueTime || fallback || "10:00";
}

function toTimeInput(value: string) {
  return parseTimeInput(value) ?? "10:00";
}

function parseTimeInput(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
  if (timeMatch) {
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
    return null;
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  const [, hourText, minuteText, period] = match;
  let hour = Number(hourText);
  if (period.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return `${String(hour).padStart(2, "0")}:${minuteText}`;
}

function toDisplayTime(value: string) {
  const [hourText, minute] = value.split(":");
  const hour24 = Number(hourText);
  if (!Number.isFinite(hour24)) return value;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}
