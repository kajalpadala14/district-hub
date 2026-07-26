import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { r as cn, t as Button } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { i as useProfiles, n as useDepartments, r as usePlannerEvents, t as Badge } from "./useData-DHwf5NYf.mjs";
import { n as dateKeyForTask, r as isPlannerMeetingTask } from "./taskClassification-DlB8HnWP.mjs";
import { C as MessageCircle, R as ChevronRight, U as CalendarDays, _ as Plus, c as Trash2, g as RefreshCw, k as Link2, m as Settings, z as ChevronLeft } from "../_libs/lucide-react.mjs";
import { a as format, l as startOfWeek, s as isSameDay, u as addDays } from "../_libs/date-fns.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DamjaduW.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-uzm9g8Y7.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, s as Label, t as Dialog } from "./label-ymT1GZwO.mjs";
import { t as Textarea } from "./textarea-DjqHhWkA.mjs";
import { t as useAuth } from "./useAuth-CDGY2Qbc.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/planner-DYIOdmHS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var defaultPlannerSettings = {
	dayStart: "10:00",
	dayEnd: "18:00",
	slotMin: "30",
	gapMin: "15",
	lunchStart: "13:30",
	lunchEnd: "14:30",
	appleIcsUrl: "",
	token: ""
};
var eventColors = [
	"bg-primary",
	"bg-success",
	"bg-warning",
	"bg-destructive",
	"bg-info",
	"bg-violet-500",
	"bg-cyan-500",
	"bg-orange-400"
];
function PlannerPage() {
	const { user } = useAuth();
	const { tasks, refresh: refreshTasks } = usePlannerEvents();
	const { profiles } = useProfiles();
	const { departments } = useDepartments([...tasks.map((task) => task.department), ...profiles.map((profile) => profile.department)]);
	const [weekStart, setWeekStart] = (0, import_react.useState)(() => startOfWeek(/* @__PURE__ */ new Date(), { weekStartsOn: 1 }));
	const [dialogOpen, setDialogOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [dialogMode, setDialogMode] = (0, import_react.useState)("create");
	const [defaultDate, setDefaultDate] = (0, import_react.useState)(null);
	const [defaultTime, setDefaultTime] = (0, import_react.useState)("10:00 AM");
	const [showSettings, setShowSettings] = (0, import_react.useState)(false);
	const [plannerSettings, setPlannerSettings] = (0, import_react.useState)(defaultPlannerSettings);
	const [settingsSaving, setSettingsSaving] = (0, import_react.useState)(false);
	const [deletingEventId, setDeletingEventId] = (0, import_react.useState)(null);
	const days = (0, import_react.useMemo)(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
	const meetings = (0, import_react.useMemo)(() => tasks.filter(isPlannerMeetingTask), [tasks]);
	const slots = (0, import_react.useMemo)(() => buildPlannerSlots(plannerSettings, meetings, days), [
		plannerSettings,
		meetings,
		days
	]);
	const icsHttpsUrl = (0, import_react.useMemo)(() => buildPlannerIcsUrl(plannerSettings.token, "https"), [plannerSettings.token]);
	const icsWebcalUrl = (0, import_react.useMemo)(() => buildPlannerIcsUrl(plannerSettings.token, "webcal"), [plannerSettings.token]);
	const subscriptionUrlWarning = (0, import_react.useMemo)(() => plannerSubscriptionWarning(icsHttpsUrl), [icsHttpsUrl]);
	(0, import_react.useEffect)(() => {
		if (!user?.id) return;
		let cancelled = false;
		const loadSettings = async () => {
			const { data, error } = await supabase.from("planner_settings").select("*").eq("user_id", user.id).maybeSingle();
			if (error) {
				toast.error(error.message);
				return;
			}
			if (data) {
				if (!cancelled) setPlannerSettings(plannerSettingsFromRow(data));
				return;
			}
			const { data: created, error: createError } = await supabase.from("planner_settings").insert({ user_id: user.id }).select("*").single();
			if (createError) {
				toast.error(createError.message);
				return;
			}
			if (!cancelled) setPlannerSettings(plannerSettingsFromRow(created));
		};
		loadSettings();
		return () => {
			cancelled = true;
		};
	}, [user?.id]);
	const tasksByDay = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const day of days) map.set(format(day, "yyyy-MM-dd"), []);
		for (const task of meetings) {
			const anchor = dateKeyForTask(task);
			if (anchor && map.has(anchor)) map.get(anchor).push(task);
		}
		for (const dayTasks of map.values()) dayTasks.sort(comparePlannerTasks);
		return map;
	}, [meetings, days]);
	const openNew = (dateKey, time = "10:00 AM") => {
		setEditing(null);
		setDialogMode("create");
		setDefaultDate(dateKey);
		setDefaultTime(time);
		setDialogOpen(true);
	};
	const openExisting = (task, dateKey, time) => {
		setEditing(task);
		setDialogMode(task.id.startsWith("ics-") ? "create" : "edit");
		setDefaultDate(dateKey);
		setDefaultTime(time);
		setDialogOpen(true);
	};
	const handleDialogOpenChange = (open) => {
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
			const { data, error } = await supabase.from("planner_settings").upsert(plannerSettingsToRow(user.id, plannerSettings), { onConflict: "user_id" }).select("*").single();
			if (error) throw error;
			const savedSettings = plannerSettingsFromRow(data);
			setPlannerSettings(savedSettings);
			toast.success(savedSettings.appleIcsUrl.trim() ? "Apple Calendar URL saved. Use the WEBCAL link for live subscription updates." : "Planner settings saved. Copy the WEBCAL link to subscribe in Apple Calendar.");
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
		if (!window.confirm("Rotate the Planner subscription token? Existing Google and Apple Calendar subscriptions using the current URL will stop working and must be subscribed again.")) return;
		setSettingsSaving(true);
		try {
			const rpcResult = await supabase.rpc("rotate_planner_subscription_token", { p_user_id: user.id }).single();
			if (rpcResult.error) throw rpcResult.error;
			setPlannerSettings(plannerSettingsFromRow(rpcResult.data));
			toast.success("Planner token rotated. Subscribe calendars with the new URL.");
		} catch (error) {
			try {
				const fallbackSettings = await rotatePlannerTokenFallback(user.id, plannerSettings);
				setPlannerSettings(fallbackSettings);
				toast.success("Planner token rotated. Subscribe calendars with the new URL.");
			} catch (fallbackError) {
				toast.error(fallbackError instanceof Error ? fallbackError.message : "Planner token update failed");
			}
		} finally {
			setSettingsSaving(false);
		}
	};
	const copyText = async (label, value) => {
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
		const todayKey = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
		const todaysTasks = meetings.filter((task) => dateKeyForTask(task) === todayKey);
		const message = [
			`Governance Planner - ${format(/* @__PURE__ */ new Date(), "dd MMM yyyy")}`,
			"",
			...todaysTasks.length ? todaysTasks.map((task, index) => `${index + 1}. ${task.title}${task.due_time ? ` at ${toDisplayTime(task.due_time)}` : ""}`) : ["No planner events scheduled today."]
		].join("\n");
		await copyText("Day message", message);
	};
	const deletePlannerMeeting = async (task) => {
		if (task.id.startsWith("ics-")) {
			toast.error("Imported calendar events cannot be deleted from this app.");
			return;
		}
		if (!window.confirm(`Delete meeting "${task.title}"?`)) return;
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
					"content-type": "application/json"
				},
				body: JSON.stringify({ id: task.id })
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-semibold tracking-tight",
					children: "Weekly Planner"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [
						format(weekStart, "d MMM"),
						" - ",
						format(addDays(weekStart, 6), "d MMM yyyy"),
						" · 30 min slots · 15 min breaks"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => setWeekStart(startOfWeek(/* @__PURE__ */ new Date(), { weekStartsOn: 1 })),
							children: "Today"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "Previous week",
							onClick: () => setWeekStart(addDays(weekStart, -7)),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "Next week",
							onClick: () => setWeekStart(addDays(weekStart, 7)),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							className: "bg-info/10 text-info hover:bg-info/15 hover:text-info",
							onClick: exportIcs,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { className: "h-4 w-4" }), "Download ICS"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							className: "bg-success/10 text-success hover:bg-success/15 hover:text-success",
							onClick: copyDayMessage,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4" }), "Day Message"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "Refresh planner",
							onClick: () => {
								refreshTasks();
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							className: "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
							onClick: () => setShowSettings((value) => !value),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" }), "Settings"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							onClick: () => openNew(format(/* @__PURE__ */ new Date(), "yyyy-MM-dd")),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "Add Meeting"]
						})
					]
				})]
			}),
			showSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingsPanel, {
				settings: plannerSettings,
				httpsUrl: icsHttpsUrl,
				webcalUrl: icsWebcalUrl,
				subscriptionUrlWarning,
				onChange: setPlannerSettings,
				onSave: savePlannerSettings,
				onCopy: copyText,
				onRotate: rotateToken,
				saving: settingsSaving
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "overflow-hidden rounded-2xl border bg-card shadow-elevated",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid min-w-[1100px] grid-cols-7 overflow-x-auto",
					children: [days.map((day) => {
						const today = isSameDay(day, /* @__PURE__ */ new Date());
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("border-r border-border/70 px-4 py-3 text-center last:border-r-0", today && "bg-primary/10"),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
								children: format(day, "EEE")
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("mt-1 text-xl font-semibold", today && "text-primary"),
								children: format(day, "d")
							})]
						}, day.toISOString());
					}), days.map((day) => {
						const key = format(day, "yyyy-MM-dd");
						const dayTasks = tasksByDay.get(key) ?? [];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border-r border-border/70 last:border-r-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2 p-2",
								children: slots.map((slot, slotIndex) => {
									const task = taskForPlannerSlot(dayTasks, slot, slotIndex);
									const showTask = !!task;
									const openSlot = () => {
										if (showTask && task) openExisting(task, key, slot.range.split(" - ")[0]);
										else openNew(key, slot.range.split(" - ")[0]);
									};
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										role: "button",
										tabIndex: 0,
										className: cn("w-full cursor-pointer rounded-lg border bg-background/80 p-2 text-left shadow-card transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30", slot.tall ? "min-h-[72px]" : "min-h-[46px]", showTask && "border-primary/30 bg-primary/15"),
										onClick: openSlot,
										onKeyDown: (event) => {
											if (event.key === "Enter" || event.key === " ") {
												event.preventDefault();
												openSlot();
											}
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: slot.range }), !showTask && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground/45",
												children: "Draft Slot"
											})]
										}), showTask && task ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "relative mt-2 rounded-md bg-primary/20 p-2 pr-9 text-primary",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
													type: "button",
													variant: "ghost",
													size: "icon",
													className: "absolute right-1.5 top-1.5 h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive",
													"aria-label": `Delete meeting ${task.title}`,
													title: "Delete meeting",
													disabled: deletingEventId === task.id,
													onClick: (event) => {
														event.preventDefault();
														event.stopPropagation();
														deletePlannerMeeting(task);
													},
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "mt-0.5 h-3.5 w-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "truncate text-xs font-semibold",
																children: task.title
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "mt-1 text-[11px] text-primary/80",
																children: task.status === "blocked" ? "Meeting - Cancelled" : "Meeting - Confirmed"
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "text-[11px] text-primary/80",
																children: ["Time: ", task.due_time ? toDisplayTime(task.due_time) : "All day"]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "truncate text-[11px] text-primary/80",
																children: task.department || "Governance Department"
															})
														]
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-2 flex flex-wrap gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														className: "h-5 bg-primary text-primary-foreground hover:bg-primary",
														children: "WhatsApp"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
														variant: "destructive",
														className: "h-5",
														children: "!"
													})]
												})
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-[11px] font-medium text-foreground",
											children: slot.label
										})]
									}, `${key}-${slot.range}`);
								})
							})
						}, key);
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EventDialog, {
				open: dialogOpen,
				onOpenChange: handleDialogOpenChange,
				event: editing,
				mode: dialogMode,
				defaultDate,
				defaultTime,
				departments: departments.map((department) => department.name),
				onSaved: refreshTasks
			})
		]
	});
}
function PlannerSettingsPanel({ settings, httpsUrl, webcalUrl, subscriptionUrlWarning, onChange, onSave, onCopy, onRotate, saving }) {
	const update = (key, value) => onChange({
		...settings,
		[key]: value
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "min-w-0 rounded-lg border bg-card p-4 shadow-elevated sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[repeat(6,minmax(110px,1fr))_minmax(240px,2fr)]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
						label: "Day Start",
						type: "time",
						value: settings.dayStart,
						onChange: (value) => update("dayStart", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
						label: "Day End",
						type: "time",
						value: settings.dayEnd,
						onChange: (value) => update("dayEnd", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
						label: "Slot (Min)",
						type: "number",
						value: settings.slotMin,
						onChange: (value) => update("slotMin", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
						label: "Gap (Min)",
						type: "number",
						value: settings.gapMin,
						onChange: (value) => update("gapMin", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
						label: "Lunch Start",
						type: "time",
						value: settings.lunchStart,
						onChange: (value) => update("lunchStart", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
						label: "Lunch End",
						type: "time",
						value: settings.lunchEnd,
						onChange: (value) => update("lunchEnd", value)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "min-w-0 sm:col-span-2 lg:col-span-3 2xl:col-span-1",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlannerSettingInput, {
							label: "Apple ICS URL",
							value: settings.appleIcsUrl,
							onChange: (value) => update("appleIcsUrl", value)
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					className: "w-full sm:w-auto",
					onClick: onSave,
					disabled: saving,
					children: saving ? "Saving..." : "Save Settings"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-w-0 text-sm text-muted-foreground",
					children: "Default: 10:00-18:00, 30 min slots, 15 min break, lunch 13:30-14:30."
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid min-w-0 gap-4 lg:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 rounded-lg border border-success/30 bg-success/5 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-bold uppercase tracking-wide text-success",
							children: "Dashboard to Apple (HTTPS)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							className: "mt-2 min-w-0 bg-background text-xs sm:text-sm",
							value: httpsUrl,
							readOnly: true
						}),
						subscriptionUrlWarning && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs font-medium text-destructive",
							children: subscriptionUrlWarning
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 grid gap-2 sm:flex sm:flex-wrap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								className: "w-full bg-success text-success-foreground hover:bg-success/90 sm:w-auto",
								disabled: !httpsUrl,
								onClick: () => onCopy("HTTPS ICS URL", httpsUrl),
								children: "Copy HTTPS"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "outline",
								className: "w-full sm:w-auto",
								disabled: saving,
								onClick: onRotate,
								children: "Rotate Token"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-xs text-muted-foreground",
							children: "Rotate only for security. It invalidates existing subscribed calendar URLs."
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 rounded-lg border border-primary/25 bg-primary/5 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-bold uppercase tracking-wide text-primary",
							children: "Apple Subscription (WEBCAL)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							className: "mt-2 min-w-0 bg-background text-xs sm:text-sm",
							value: webcalUrl,
							readOnly: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 grid gap-2 sm:flex sm:flex-wrap",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								className: "w-full sm:w-auto",
								disabled: !webcalUrl,
								onClick: () => onCopy("WEBCAL URL", webcalUrl),
								children: "Copy WEBCAL"
							})
						})
					]
				})]
			})
		]
	});
}
function PlannerSettingInput({ label, value, type = "text", onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0 space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			type,
			value,
			onChange: (event) => onChange(event.target.value),
			className: "min-w-0 bg-background"
		})]
	});
}
function EventDialog({ open, onOpenChange, event, mode, defaultDate, defaultTime, departments, onSaved }) {
	const isEditMode = mode === "edit" && !!event && !event.id.startsWith("ics-");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)({
		title: "",
		date: "",
		time: "10:00 AM",
		duration: "30m",
		status: "Confirmed",
		color: eventColors[0],
		department: "None",
		venue: "",
		attendees: "",
		notes: ""
	});
	(0, import_react.useEffect)(() => {
		setForm({
			title: event?.title ?? "",
			date: event?.scheduled_date ?? defaultDate ?? format(/* @__PURE__ */ new Date(), "yyyy-MM-dd"),
			time: toTimeInput(getEventTime(event?.due_time, defaultTime)),
			duration: "30m",
			status: event?.status === "done" ? "Confirmed" : "Confirmed",
			color: eventColors[0],
			department: event?.department ?? "None",
			venue: "",
			attendees: "",
			notes: event?.description ?? ""
		});
	}, [
		event,
		defaultDate,
		defaultTime,
		open,
		isEditMode
	]);
	const submit = async (submitEvent) => {
		submitEvent.preventDefault();
		const title = form.title.trim();
		if (!title) {
			toast.error("Event title required");
			return;
		}
		const scheduledDate = fromDisplayDate(form.date);
		const dueTime = toTimeInput(form.time);
		const payload = {
			title,
			description: [
				"Type: Meeting",
				form.notes.trim(),
				dueTime ? `Time: ${toDisplayTime(dueTime)}` : "",
				form.duration ? `Duration: ${form.duration}` : "",
				form.status ? `Status: ${form.status}` : "",
				form.venue ? `Venue: ${form.venue}` : "",
				form.attendees ? `Attendees: ${form.attendees}` : "",
				form.color ? `Color: ${form.color.replace("bg-", "")}` : ""
			].filter(Boolean).join("\n") || null,
			scheduled_date: scheduledDate,
			due_date: scheduledDate,
			due_time: dueTime || null,
			department: form.department === "None" ? null : form.department,
			status: form.status === "Cancelled" ? "blocked" : form.status === "Confirmed" ? "in_progress" : "todo",
			priority: "medium"
		};
		console.info("[Planner Booking Debug] selected slot", {
			selectedSlot: form.time,
			normalizedSlot: dueTime
		});
		console.info("[Planner Booking Debug] API payload", payload);
		setSaving(true);
		try {
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
			if (sessionError) throw sessionError;
			if (!sessionData.session?.user.id) throw new Error("Please sign in before saving planner events.");
			await savePlannerTask(isEditMode ? event.id : null, payload, sessionData.session.access_token, sessionData.session.user.id);
			await onSaved();
			toast.success(isEditMode ? "Event updated" : "Event created");
			onOpenChange(false);
		} catch (error) {
			console.error("[Planner Event Save] failed", error);
			toast.error(error instanceof Error ? error.message : "Event save failed");
		} finally {
			setSaving(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-2xl overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-h-[calc(100dvh-3rem)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, {
				className: "px-4 pt-4 sm:px-5 sm:pt-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-xl",
					children: isEditMode ? "Edit Meeting" : "New Meeting"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
					className: "sr-only",
					children: "Create or edit planner meeting details."
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "max-h-[calc(100dvh-7rem)] space-y-4 overflow-y-auto px-4 pb-4 sm:max-h-[calc(100dvh-9rem)] sm:px-5 sm:pb-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
							htmlFor: "event-title",
							children: "Title *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "event-title",
							value: form.title,
							onChange: (e) => setForm({
								...form,
								title: e.target.value
							}),
							placeholder: "Event title",
							className: "min-w-0 bg-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
									htmlFor: "event-date",
									children: "Date"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "event-date",
									type: "date",
									value: form.date,
									onChange: (e) => setForm({
										...form,
										date: e.target.value
									}),
									className: "min-w-0 bg-background"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
									htmlFor: "event-time",
									children: "Time"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "event-time",
									type: "time",
									value: form.time,
									onChange: (e) => setForm({
										...form,
										time: e.target.value
									}),
									className: "min-w-0 bg-background"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Duration" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.duration,
									onValueChange: (value) => setForm({
										...form,
										duration: value
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "min-w-0 bg-background",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "15m",
											children: "15m"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "30m",
											children: "30m"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "45m",
											children: "45m"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "1h",
											children: "1h"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "2h",
											children: "2h"
										})
									] })]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.status,
								onValueChange: (value) => setForm({
									...form,
									status: value
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "min-w-0 bg-background",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "Confirmed",
										children: "Confirmed"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "Tentative",
										children: "Tentative"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "Cancelled",
										children: "Cancelled"
									})
								] })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Color" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex min-h-10 flex-wrap items-center gap-1.5 rounded-md bg-background px-2 py-1.5",
								children: eventColors.map((color) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-label": color,
									onClick: () => setForm({
										...form,
										color
									}),
									className: cn("h-6 w-4 rounded-full ring-offset-2", color, form.color === color && "ring-2 ring-primary")
								}, color))
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Department (Optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.department,
								onValueChange: (value) => setForm({
									...form,
									department: value
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
									className: "min-w-0 bg-background",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "None",
									children: "None"
								}), departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: department,
									children: department
								}, department))] })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
								htmlFor: "event-venue",
								children: "Venue"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "event-venue",
								value: form.venue,
								onChange: (e) => setForm({
									...form,
									venue: e.target.value
								}),
								placeholder: "Meeting room",
								className: "min-w-0 bg-background"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
							htmlFor: "event-attendees",
							children: "Attendees"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "event-attendees",
							value: form.attendees,
							onChange: (e) => setForm({
								...form,
								attendees: e.target.value
							}),
							placeholder: "Comma separated names",
							className: "min-w-0 bg-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
							htmlFor: "event-notes",
							children: "Description / Notes"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							id: "event-notes",
							value: form.notes,
							onChange: (e) => setForm({
								...form,
								notes: e.target.value
							}),
							placeholder: "Notes, agenda, comments...",
							rows: 4,
							className: "min-w-0 resize-none bg-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
						className: "grid grid-cols-1 gap-2 sm:grid-cols-2 sm:space-x-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "secondary",
							onClick: () => onOpenChange(false),
							className: "w-full",
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: saving,
							className: "w-full",
							children: saving ? "Saving..." : "Save Meeting"
						})]
					})
				]
			})]
		})
	});
}
function FieldLabel({ children, htmlFor }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		htmlFor,
		className: "text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
		children
	});
}
function plannerSettingsFromRow(row) {
	return {
		dayStart: timeInputValue(row.day_start),
		dayEnd: timeInputValue(row.day_end),
		slotMin: String(row.slot_min),
		gapMin: String(row.gap_min),
		lunchStart: timeInputValue(row.lunch_start),
		lunchEnd: timeInputValue(row.lunch_end),
		appleIcsUrl: row.apple_calendar_url ?? row.apple_ics_url ?? "",
		token: row.ics_token ?? row.subscription_token
	};
}
function plannerSettingsToRow(userId, settings) {
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
		ics_token: token
	};
}
function plannerSettingsToLegacyTokenRow(userId, settings) {
	const { ics_token, ...legacyRow } = plannerSettingsToRow(userId, settings);
	return legacyRow;
}
async function rotatePlannerTokenFallback(userId, settings) {
	const token = createPlannerToken();
	const next = {
		...settings,
		token
	};
	const modernResult = await supabase.from("planner_settings").upsert(plannerSettingsToRow(userId, next), { onConflict: "user_id" }).select("*").single();
	if (!modernResult.error) return plannerSettingsFromRow(modernResult.data);
	if (!isPlannerSettingsAliasUnavailable(modernResult.error)) throw modernResult.error;
	const legacyResult = await supabase.from("planner_settings").upsert(plannerSettingsToLegacyTokenRow(userId, next), { onConflict: "user_id" }).select("*").single();
	if (legacyResult.error) throw legacyResult.error;
	return plannerSettingsFromRow(legacyResult.data);
}
function isPlannerSettingsAliasUnavailable(error) {
	const message = error?.message ?? "";
	return /ics_token/i.test(message) || /schema cache/i.test(message);
}
function timeInputValue(value) {
	return value.slice(0, 5);
}
function createPlannerToken() {
	const bytes = /* @__PURE__ */ new Uint8Array(18);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
	else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function buildPlannerSlots(settings, tasks = [], days = []) {
	const slots = [];
	const slotMin = Math.max(5, Number(settings.slotMin) || 30);
	const gapMin = Math.max(0, Number(settings.gapMin) || 0);
	const dayKeys = new Set(days.map((day) => format(day, "yyyy-MM-dd")));
	const taskTimes = tasks.filter((task) => {
		const date = dateKeyForTask(task);
		return !dayKeys.size || (date ? dayKeys.has(date) : false);
	}).map((task) => normalizeTaskTimeMinutes(task.due_time)).filter((time) => time !== null);
	const configuredStart = minutesFromTime(settings.dayStart);
	const configuredEnd = minutesFromTime(settings.dayEnd);
	const earliestTask = taskTimes.length ? Math.min(...taskTimes) : configuredStart;
	const latestTask = taskTimes.length ? Math.max(...taskTimes) + slotMin : configuredEnd;
	let cursor = Math.max(0, Math.min(configuredStart, roundDownMinutes(earliestTask, slotMin)));
	const end = Math.min(1440, Math.max(configuredEnd, roundUpMinutes(latestTask, slotMin)));
	const lunchStart = minutesFromTime(settings.lunchStart);
	const lunchEnd = minutesFromTime(settings.lunchEnd);
	while (cursor < end) {
		if (cursor === lunchStart && lunchEnd > lunchStart) {
			slots.push({
				range: `${timeFromMinutes(lunchStart)} - ${timeFromMinutes(lunchEnd)}`,
				label: "Lunch Break",
				tall: true
			});
			cursor = lunchEnd;
			continue;
		}
		if (cursor < lunchStart && cursor + slotMin > lunchStart) {
			cursor = lunchStart;
			continue;
		}
		const slotEnd = Math.min(cursor + slotMin, end);
		if (slotEnd > cursor) slots.push({
			range: `${timeFromMinutes(cursor)} - ${timeFromMinutes(slotEnd)}`,
			label: null
		});
		cursor = slotEnd;
		if (gapMin > 0 && cursor < end && !(cursor >= lunchStart && cursor < lunchEnd)) {
			const breakEnd = Math.min(cursor + gapMin, end);
			slots.push({
				range: `${timeFromMinutes(cursor)} - ${timeFromMinutes(breakEnd)}`,
				label: `${gapMin}M BREAK`
			});
			cursor = breakEnd;
		}
	}
	return slots;
}
function buildPlannerIcsUrl(token, scheme) {
	if (!token) return "";
	const origin = plannerPublicOrigin();
	if (!origin) return `/api/planner/export.ics?token=${encodeURIComponent(token)}`;
	const url = new URL(`/api/planner/export.ics?token=${encodeURIComponent(token)}`, origin);
	if (scheme === "https" && url.protocol === "http:" && !isPrivatePlannerHost(url.hostname)) url.protocol = "https:";
	if (scheme === "webcal") url.protocol = "webcal:";
	return url.toString();
}
function plannerPublicOrigin() {
	if (typeof window === "undefined") return "";
	return window.location.origin;
}
function plannerSubscriptionWarning(urlText) {
	if (!urlText) return "";
	try {
		const url = new URL(urlText);
		if (url.protocol !== "https:" && url.protocol !== "webcal:") return "Calendar subscription needs a public HTTPS app URL.";
		if (isPrivatePlannerHost(url.hostname)) return "This is a local/private URL. Set VITE_PLANNER_PUBLIC_BASE_URL to your deployed HTTPS app URL before using Apple Calendar or WEBCAL subscription.";
	} catch {
		return "Calendar subscription URL is invalid.";
	}
	return "";
}
function validateAppleCalendarUrl(value) {
	const trimmed = value.trim();
	if (!trimmed) return;
	try {
		const url = new URL(trimmed.replace(/^webcal:/i, "https:"));
		if (!["https:", "http:"].includes(url.protocol)) throw new Error("Apple Calendar URL must be an HTTPS or WEBCAL URL.");
	} catch {
		throw new Error("Apple Calendar URL is invalid. Leave it blank or paste a valid HTTPS/WEBCAL URL.");
	}
}
function isPrivatePlannerHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
}
function taskForPlannerSlot(dayTasks, slot, slotIndex) {
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
			matches: taskTime !== null && taskTime >= slotStart && taskTime < slotEnd
		});
		return taskTime !== null && taskTime >= slotStart && taskTime < slotEnd;
	});
	if (timedTask) return timedTask;
	return dayTasks.filter((task) => normalizeTaskTimeMinutes(task.due_time) === null)[slotIndex] ?? null;
}
function comparePlannerTasks(a, b) {
	const aTime = normalizeTaskTimeMinutes(a.due_time) ?? Number.MAX_SAFE_INTEGER;
	const bTime = normalizeTaskTimeMinutes(b.due_time) ?? Number.MAX_SAFE_INTEGER;
	if (aTime !== bTime) return aTime - bTime;
	return a.title.localeCompare(b.title);
}
function normalizeTaskTimeMinutes(value) {
	if (!value) return null;
	const normalized = parseTimeInput(value);
	if (!normalized) return null;
	return minutesFromTime(normalized);
}
function roundDownMinutes(value, step) {
	return Math.floor(value / step) * step;
}
function roundUpMinutes(value, step) {
	return Math.ceil(value / step) * step;
}
async function savePlannerTask(id, payload, accessToken, currentUserId) {
	try {
		const response = await fetch("/api/planner/tasks", {
			method: id ? "PUT" : "POST",
			headers: {
				authorization: `Bearer ${accessToken}`,
				"content-type": "application/json"
			},
			body: JSON.stringify({
				id,
				...payload
			})
		});
		if (!response.ok) {
			const message = await response.text();
			if (![404, 405].includes(response.status)) throw new Error(message);
			console.warn("[Planner Event Save] server API unavailable, using Supabase direct save", message);
		} else {
			const result = await response.json();
			if (!result.task?.id) throw new Error("Event save did not return an id.");
			return result.task;
		}
	} catch (error) {
		if (error instanceof Error && !/Failed to fetch|Load failed|NetworkError/i.test(error.message)) throw error;
		console.warn("[Planner Event Save] server API request failed, using Supabase direct save", error);
	}
	const result = id ? await savePlannerEventFallback(id, payload, currentUserId) : await savePlannerEventFallback(null, payload, currentUserId);
	if (result.error) throw result.error;
	if (!result.data?.id) throw new Error("Event save did not return an id.");
	return result.data;
}
async function savePlannerEventFallback(id, payload, currentUserId) {
	return id ? await supabase.from("planner_events").update(plannerEventPayload(payload)).eq("id", id).select("id").single() : await supabase.from("planner_events").insert({
		...plannerEventPayload(payload),
		user_id: currentUserId
	}).select("id").single();
}
function plannerEventPayload(payload) {
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
		color: extractDescriptionField(payload.description, "Color")
	};
	console.info("[Planner Booking Debug] planner_events payload", {
		selectedSlot: payload.due_time,
		databaseStartTime: eventPayload.start_time,
		databaseEndTime: eventPayload.end_time
	});
	return eventPayload;
}
function plannerEventStatus(status, description) {
	const formStatus = extractDescriptionField(description, "Status")?.toLowerCase();
	if (status === "blocked" || formStatus === "cancelled") return "cancelled";
	if (status === "done") return "completed";
	if (status === "todo" || formStatus === "tentative") return "tentative";
	return "confirmed";
}
function minutesFromTime(value) {
	const [hour = "0", minute = "0"] = value.split(":");
	return Number(hour) * 60 + Number(minute);
}
function timeFromMinutes(value) {
	const minuteOfDay = (value % 1440 + 1440) % 1440;
	const hour = Math.floor(minuteOfDay / 60);
	const minute = minuteOfDay % 60;
	return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function extractDurationMinutes(description) {
	const duration = extractDescriptionField(description, "Duration");
	if (!duration) return null;
	const match = duration.match(/^(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i);
	if (!match) return null;
	const amount = Number(match[1]);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return match[2].toLowerCase().startsWith("h") ? amount * 60 : amount;
}
function extractDescriptionField(description, field) {
	const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return (description?.match(new RegExp(`^${escapedField}:\\s*(.+)$`, "im")))?.[1]?.trim() || null;
}
function fromDisplayDate(value) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
	const [day, month, year] = value.split("-");
	if (day && month && year) return `${year}-${month}-${day}`;
	return format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
}
function getEventTime(dueTime, fallback) {
	return dueTime || fallback || "10:00";
}
function toTimeInput(value) {
	return parseTimeInput(value) ?? "10:00";
}
function parseTimeInput(value) {
	const trimmed = value?.trim();
	if (!trimmed) return null;
	const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
	if (timeMatch) {
		const hour = Number(timeMatch[1]);
		const minute = Number(timeMatch[2]);
		if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
function toDisplayTime(value) {
	const [hourText, minute] = value.split(":");
	const hour24 = Number(hourText);
	if (!Number.isFinite(hour24)) return value;
	const period = hour24 >= 12 ? "PM" : "AM";
	return `${hour24 % 12 || 12}:${minute} ${period}`;
}
//#endregion
export { PlannerPage as component };
