import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { r as cn, t as Button } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { a as useTasks, i as useProfiles, n as useDepartments, r as usePlannerEvents, t as Badge } from "./useData-DHwf5NYf.mjs";
import { n as CardContent, t as Card } from "./card-C5Nmk_bj.mjs";
import { i as isTaskItem, n as dateKeyForTask } from "./taskClassification-DlB8HnWP.mjs";
import { B as ChevronDown, F as ClipboardList, I as CircleCheck, K as ArrowRight, L as ChevronUp, P as Clock3, U as CalendarDays, c as Trash2, g as RefreshCw, s as TriangleAlert } from "../_libs/lucide-react.mjs";
import { a as format, l as startOfWeek, n as isWithinInterval, o as endOfWeek, t as parseISO, u as addDays } from "../_libs/date-fns.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DamjaduW.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-BgCtoNb-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GovernanceOverviewPage() {
	const { tasks, refresh: refreshTasks } = useTasks();
	const { tasks: plannerEvents, refresh: refreshPlannerEvents } = usePlannerEvents();
	const { profiles, refresh: refreshProfiles } = useProfiles();
	const { departments, refresh: refreshDepartments } = useDepartments([
		...tasks.map((task) => task.department),
		...plannerEvents.map((event) => event.department),
		...profiles.map((profile) => profile.department)
	]);
	const [meetingSort, setMeetingSort] = (0, import_react.useState)("next");
	const [meetingsCollapsed, setMeetingsCollapsed] = (0, import_react.useState)(false);
	const [deletingMeetingId, setDeletingMeetingId] = (0, import_react.useState)(null);
	const [now, setNow] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setNow(/* @__PURE__ */ new Date());
	}, []);
	const todayKey = now ? format(now, "yyyy-MM-dd") : "";
	const tomorrowKey = now ? format(addDays(now, 1), "yyyy-MM-dd") : "";
	const weekStart = (0, import_react.useMemo)(() => startOfWeek(now ?? /* @__PURE__ */ new Date(0), { weekStartsOn: 1 }), [now]);
	const weekEnd = (0, import_react.useMemo)(() => endOfWeek(now ?? /* @__PURE__ */ new Date(0), { weekStartsOn: 1 }), [now]);
	const taskItems = tasks.filter(isTaskItem);
	const totalTasks = taskItems.length;
	const completedTasks = taskItems.filter((task) => task.status === "done").length;
	const overdueTasks = taskItems.filter((task) => overdueTask(task, todayKey)).length;
	const pendingTasks = taskItems.filter((task) => task.status !== "done" && !overdueTask(task, todayKey)).length;
	const scheduledTasks = taskItems.filter((task) => task.scheduled_date || task.due_date);
	const plannerMeetingTasks = plannerEvents;
	const scheduledToday = scheduledTasks.filter((task) => dateKeyForTask(task) === todayKey);
	const scheduledTomorrow = scheduledTasks.filter((task) => dateKeyForTask(task) === tomorrowKey);
	const reviewTasks = scheduledTasks.filter((task) => taskMatchesText(task, "review"));
	const fieldVisitTasks = scheduledTasks.filter((task) => taskMatchesText(task, "field visit", "visit"));
	const weekTimeline = scheduledTasks.filter((task) => {
		const dateKey = dateKeyForTask(task);
		if (!dateKey) return false;
		return isWithinInterval(parseISO(dateKey), {
			start: weekStart,
			end: weekEnd
		});
	}).sort((a, b) => Date.parse(dateKeyForTask(a) ?? "") - Date.parse(dateKeyForTask(b) ?? "")).slice(0, 8);
	const todayTime = todayKey ? Date.parse(todayKey) : 0;
	const departmentSummaries = todayKey ? sortDepartmentSummaries(buildDepartmentSummaries(plannerMeetingTasks), meetingSort, todayTime) : [];
	const kpis = [
		{
			label: "Total Tasks",
			value: totalTasks,
			icon: ClipboardList,
			tone: "text-primary",
			bar: "bg-primary/20"
		},
		{
			label: "Completed",
			value: completedTasks,
			icon: CircleCheck,
			tone: "text-success",
			bar: "bg-success/20"
		},
		{
			label: "Pending",
			value: pendingTasks,
			icon: Clock3,
			tone: "text-warning-foreground",
			bar: "bg-warning/20"
		},
		{
			label: "Overdue",
			value: overdueTasks,
			icon: TriangleAlert,
			tone: "text-destructive",
			bar: "bg-destructive/15"
		}
	];
	const refreshOverview = async () => {
		await Promise.all([
			refreshTasks(),
			refreshPlannerEvents(),
			refreshProfiles(),
			refreshDepartments()
		]);
	};
	const deleteMeeting = async (task) => {
		if (task.id.startsWith("ics-")) {
			toast.error("Imported calendar events cannot be deleted from this app.");
			return;
		}
		if (!window.confirm(`Delete meeting "${task.title}"?`)) return;
		setDeletingMeetingId(task.id);
		try {
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
			if (sessionError) throw sessionError;
			const accessToken = sessionData.session?.access_token;
			if (!accessToken) throw new Error("Please sign in before deleting meetings.");
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
			await refreshOverview();
			toast.success("Meeting deleted");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Meeting delete failed");
		} finally {
			setDeletingMeetingId(null);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-semibold tracking-tight",
					children: "Overview"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [now ? format(now, "EEEE, d MMMM yyyy") : "Loading date", " - live task and department summary"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					"aria-label": "Refresh overview",
					onClick: () => void refreshOverview(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "grid gap-4 md:grid-cols-2 xl:grid-cols-4",
				children: kpis.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "overflow-hidden rounded-2xl shadow-elevated",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "relative p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("absolute inset-x-0 bottom-0 h-1.5", item.bar) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground",
								children: item.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-3xl font-semibold tabular-nums",
								children: item.value
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("flex h-11 w-11 items-center justify-center rounded-xl bg-background shadow-card", item.tone),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
									className: "h-5 w-5",
									"aria-hidden": "true"
								})
							})]
						})]
					})
				}, item.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "space-y-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-2xl font-extrabold tracking-tight",
							children: "Department Meetings"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: meetingSort,
									onValueChange: (value) => setMeetingSort(value),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "h-9 w-[196px] rounded-full border-border/80 bg-background px-5 text-sm font-bold text-slate-600 shadow-sm",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "next",
											children: "Next Upcoming"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "latest",
											children: "Latest Added"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "department",
											children: "Department A-Z"
										})
									] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "outline",
									className: "h-9 rounded-full px-4 text-sm font-bold text-slate-600 shadow-sm",
									onClick: () => setMeetingsCollapsed((value) => !value),
									children: [meetingsCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" }), meetingsCollapsed ? "Expand" : "Collapse"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									asChild: true,
									variant: "link",
									className: "h-9 px-1 text-base font-bold text-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/employees",
										search: { manage: "departments" },
										children: ["All Departments", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
									})
								})
							]
						})]
					}), meetingsCollapsed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "rounded-2xl border-0 bg-card shadow-elevated",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "px-6 py-7 text-base text-slate-600",
							children: "Department section collapsed. Expand to view all departments with recent meetings."
						})
					}) : departmentSummaries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "rounded-2xl border-0 bg-card shadow-elevated",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
							className: "px-6 py-10 text-center text-sm text-muted-foreground",
							children: "No planner meetings yet. Add a Meeting event in Planner to populate this overview."
						})
					}) : departmentSummaries.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepartmentMeetingCard, {
						department,
						deletingMeetingId,
						onDeleteMeeting: deleteMeeting
					}, department.name))]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "space-y-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "rounded-xl shadow-elevated",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-sm font-semibold",
									children: "Quick Stats"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 space-y-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickStat, {
											label: "Departments",
											value: departments.length
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickStat, {
											label: "Employees",
											value: profiles.length
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickStat, {
											label: "Scheduled Items",
											value: scheduledTasks.length,
											tone: "text-primary"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickStat, {
											label: "Scheduled Today",
											value: scheduledToday.length,
											tone: "text-primary"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickStat, {
											label: "Completed",
											value: completedTasks,
											tone: "text-success"
										})
									]
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "rounded-xl shadow-elevated",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, {
												className: "h-5 w-5 text-primary",
												"aria-hidden": "true"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "text-lg font-bold tracking-tight",
												children: "This Week Timeline"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-medium text-muted-foreground",
											children: [
												format(weekStart, "d MMM"),
												" - ",
												format(weekEnd, "d MMM")
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-5 flex flex-wrap gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineChip, {
												label: `Tasks (${scheduledToday.length ? "Today" : "This Week"})`,
												count: weekTimeline.length,
												tone: "primary"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineChip, {
												label: "Reviews",
												count: reviewTasks.length,
												tone: "violet"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineChip, {
												label: "Field Visits",
												count: fieldVisitTasks.length,
												tone: "success"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1",
										children: weekTimeline.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground",
											children: "No scheduled tasks this week."
										}) : weekTimeline.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TimelineItem, {
											task,
											todayKey
										}, task.id))
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "rounded-xl shadow-elevated",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScheduleColumn, {
									title: "Scheduled Today",
									items: scheduledToday
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScheduleColumn, {
									title: "Scheduled Tomorrow",
									items: scheduledTomorrow,
									emptyLabel: "Nothing scheduled tomorrow",
									muted: true
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
							className: "rounded-xl shadow-elevated",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
								className: "p-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "px-4 pt-4 text-sm font-semibold",
									children: "Quick Actions"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 divide-y",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickAction, {
											to: "/employees",
											label: "Manage Departments",
											highlighted: true
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickAction, {
											to: "/tasks",
											label: "View All Tasks"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickAction, {
											to: "/planner",
											label: "Open Planner"
										})
									]
								})]
							})
						})
					]
				})]
			})
		]
	});
}
function buildDepartmentSummaries(tasks) {
	const names = /* @__PURE__ */ new Set();
	for (const task of tasks) names.add(departmentNameForPlannerTask(task));
	return Array.from(names).sort((a, b) => a.localeCompare(b)).map((name) => {
		const departmentTasks = tasks.filter((task) => departmentNameForPlannerTask(task) === name).sort((a, b) => {
			const aDate = Date.parse(dateKeyForTask(a) ?? a.updated_at);
			return Date.parse(dateKeyForTask(b) ?? b.updated_at) - aDate;
		});
		return {
			name,
			total: departmentTasks.length,
			completed: departmentTasks.filter((task) => task.status === "done").length,
			pending: departmentTasks.filter((task) => task.status !== "done").length,
			recentTasks: departmentTasks.slice(0, 3)
		};
	}).filter((department) => department.total > 0);
}
function sortDepartmentSummaries(items, mode, todayTime) {
	const sorted = [...items];
	if (mode === "department") return sorted.sort((a, b) => a.name.localeCompare(b.name));
	if (mode === "latest") return sorted.sort((a, b) => latestMeetingTime(b) - latestMeetingTime(a));
	return sorted.sort((a, b) => nextMeetingTime(a, todayTime) - nextMeetingTime(b, todayTime));
}
function nextMeetingTime(department, today) {
	const upcoming = department.recentTasks.map((task) => Date.parse(dateKeyForTask(task) ?? "")).filter((time) => Number.isFinite(time) && time >= today);
	if (upcoming.length > 0) return Math.min(...upcoming);
	return latestMeetingTime(department);
}
function latestMeetingTime(department) {
	const times = department.recentTasks.map((task) => Date.parse(dateKeyForTask(task) ?? task.updated_at)).filter(Number.isFinite);
	return times.length > 0 ? Math.max(...times) : 0;
}
function DepartmentMeetingCard({ department, deletingMeetingId, onDeleteMeeting }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "overflow-hidden rounded-2xl border-border/80 bg-card shadow-elevated",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "p-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-4 px-5 py-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-sm font-extrabold text-white shadow-card",
					children: initialsForDepartment(department.name)
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "min-w-0 truncate text-xl font-extrabold text-foreground",
					children: department.name
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid min-h-24 border-t sm:grid-cols-[155px_repeat(3,minmax(0,1fr))]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center border-b px-5 py-4 sm:border-b-0 sm:border-r",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs font-extrabold uppercase tracking-wide text-muted-foreground",
						children: "Meetings"
					})
				}), department.recentTasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center px-5 py-5 text-sm text-muted-foreground sm:col-span-3",
					children: "No scheduled meetings."
				}) : department.recentTasks.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeetingCell, {
					task,
					deleting: deletingMeetingId === task.id,
					onDelete: () => onDeleteMeeting(task)
				}, task.id))]
			})]
		})
	});
}
function MeetingCell({ task, deleting, onDelete }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex min-h-24 flex-col items-center justify-center gap-2 border-b px-4 py-4 text-center transition-colors hover:bg-primary/5 sm:border-b-0 sm:border-r last:border-r-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/planner",
			className: "flex min-w-0 flex-col items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-sm font-extrabold tabular-nums text-slate-700",
					children: meetingDateLabel(task)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: cn("text-[11px] font-extrabold uppercase tracking-wide", meetingStatusTone(task)),
					children: meetingStatusLabel(task)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-bold text-slate-400",
					children: meetingTimeLabel(task)
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "button",
			variant: "ghost",
			size: "icon",
			className: "absolute right-2 top-2 h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive",
			"aria-label": `Delete meeting ${task.title}`,
			title: "Delete meeting",
			disabled: deleting,
			onClick: (event) => {
				event.preventDefault();
				event.stopPropagation();
				onDelete();
			},
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
		})]
	});
}
function TimelineItem({ task, todayKey }) {
	const dateKey = dateKeyForTask(task);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-[minmax(104px,134px)_minmax(0,1fr)] gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 shadow-card max-[420px]:grid-cols-1",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-lg border border-primary/10 bg-background/80 p-3 text-xs",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-bold uppercase text-primary",
				children: dateKey ? format(parseISO(dateKey), "EEE, d MMM") : "No date"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 font-semibold text-primary/90",
				children: task.due_time ? task.due_time.slice(0, 5) : "All day"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 py-0.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "outline",
					className: cn("h-6 rounded-full px-3 text-[11px] font-bold uppercase", statusTone(task, todayKey)),
					children: statusLabel(task, todayKey)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 line-clamp-2 text-sm font-semibold leading-5",
					children: task.title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-xs font-medium text-muted-foreground",
					children: task.department || "Task follow-up"
				})
			]
		})]
	});
}
function TimelineChip({ label, count, tone }) {
	const chipTone = {
		primary: "border-primary/20 bg-primary/12 text-primary",
		violet: "border-purple-200 bg-purple-100 text-purple-700",
		success: "border-success/25 bg-success/15 text-emerald-700"
	}[tone];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: cn("inline-flex h-9 items-center rounded-full border px-4 text-sm font-bold", chipTone),
		children: [label, label.includes("(") ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ml-1.5 text-xs opacity-70",
			children: count
		})]
	});
}
function QuickStat({ label, value, tone = "text-foreground" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("text-sm font-semibold tabular-nums", tone),
			children: value
		})]
	});
}
function overdueTask(task, todayKey) {
	return task.status !== "done" && (task.status === "blocked" || !!todayKey && !!task.due_date && task.due_date < todayKey);
}
function ScheduleColumn({ title, items, emptyLabel, muted }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("rounded-lg border p-3", muted ? "bg-muted/25" : "bg-primary/5"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-xs font-bold uppercase tracking-wide text-primary",
			children: title
		}), items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-xs italic text-muted-foreground",
			children: emptyLabel ?? "Nothing scheduled"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 max-h-72 space-y-2 overflow-y-auto pr-1",
			children: items.map((task) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border bg-background px-3 py-2 shadow-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "line-clamp-2 text-xs font-semibold",
					children: task.title
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-[11px] text-muted-foreground",
					children: task.department || "No department"
				})]
			}, task.id))
		})]
	});
}
function QuickAction({ to, label, highlighted }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		asChild: true,
		variant: "ghost",
		className: cn("h-12 w-full justify-between rounded-none px-4", highlighted && "bg-primary/12 text-primary hover:bg-primary/16 hover:text-primary"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
		})
	});
}
function meetingDateLabel(task) {
	const dateKey = dateKeyForTask(task);
	return dateKey ? format(parseISO(dateKey), "dd/MM/yy") : "No date";
}
function meetingTimeLabel(task) {
	return task.due_time ? formatTimeLabel(task.due_time) : "All day";
}
function meetingStatusLabel(task) {
	if (task.status === "done" || task.status === "in_progress") return "Confirmed";
	if (task.status === "blocked") return "Cancelled";
	return "Pending";
}
function meetingStatusTone(task) {
	if (task.status === "done" || task.status === "in_progress") return "text-emerald-600";
	if (task.status === "blocked") return "text-slate-400";
	return "text-primary";
}
function formatTimeLabel(value) {
	const [hourValue, minuteValue = "00"] = value.split(":");
	const hour = Number(hourValue);
	if (Number.isNaN(hour)) return value.slice(0, 5);
	const period = hour >= 12 ? "PM" : "AM";
	return `${hour % 12 || 12}:${minuteValue.padStart(2, "0").slice(0, 2)} ${period}`;
}
function taskMatchesText(task, ...terms) {
	const haystack = `${task.title} ${task.description ?? ""} ${task.department ?? ""}`.toLowerCase();
	return terms.some((term) => haystack.includes(term));
}
function departmentNameForPlannerTask(task) {
	return task.department?.trim() || "Governance Department";
}
function statusLabel(task, todayKey) {
	if (task.status === "done") return "Completed";
	if (overdueTask(task, todayKey)) return "Overdue";
	if (task.status === "in_progress") return "In Progress";
	return "Pending";
}
function statusTone(task, todayKey) {
	if (task.status === "done") return "bg-success/10 text-success border-success/30";
	if (overdueTask(task, todayKey)) return "bg-destructive/15 text-destructive border-destructive/30";
	if (task.status === "in_progress") return "bg-primary/10 text-primary border-primary/30";
	return "bg-muted text-muted-foreground border-muted-foreground/20";
}
function initialsForDepartment(name) {
	const parts = name.split(/\s+/).filter(Boolean);
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}
//#endregion
export { GovernanceOverviewPage as component };
