import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { r as cn, t as Button } from "./button-PwNqyxv_.mjs";
import { a as useTasks, t as Badge } from "./useData-DHwf5NYf.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-C5Nmk_bj.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-BcaWptOW.mjs";
import { i as isTaskItem } from "./taskClassification-DlB8HnWP.mjs";
import { I as CircleCheck, N as Download, P as Clock3, g as RefreshCw, l as TimerReset } from "../_libs/lucide-react.mjs";
import { a as Bar, c as ResponsiveContainer, i as XAxis, l as Tooltip, n as BarChart, o as Pie, r as YAxis, s as Cell, t as PieChart } from "../_libs/recharts+[...].mjs";
import { a as format, c as differenceInCalendarDays, i as isPast, r as isToday, t as parseISO } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/analytics-DUwGGlMe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var healthColors = {
	completed: "oklch(0.62 0.14 155)",
	overdue: "oklch(0.58 0.22 25)",
	pending: "oklch(0.75 0.15 70)",
	inProgress: "oklch(0.48 0.22 290)"
};
function CommandCenterPage() {
	const { tasks, loading, error, refresh } = useTasks();
	const nowLabel = format(/* @__PURE__ */ new Date(), "dd/MM/yyyy, HH:mm:ss");
	const taskItems = (0, import_react.useMemo)(() => tasks.filter(isTaskItem), [tasks]);
	const stats = (0, import_react.useMemo)(() => {
		return {
			completed: taskItems.filter((task) => task.status === "done").length,
			inProgress: taskItems.filter((task) => task.status === "in_progress" && !isTaskOverdue(task)).length,
			overdue: taskItems.filter((task) => isTaskOverdue(task)).length,
			pending: taskItems.filter((task) => task.status === "todo" && !isTaskOverdue(task)).length,
			total: taskItems.length
		};
	}, [taskItems]);
	const healthData = [
		{
			name: "Completed",
			value: stats.completed,
			color: healthColors.completed
		},
		{
			name: "Overdue",
			value: stats.overdue,
			color: healthColors.overdue
		},
		{
			name: "Pending",
			value: stats.pending,
			color: healthColors.pending
		},
		{
			name: "In Progress",
			value: stats.inProgress,
			color: healthColors.inProgress
		}
	];
	const agencyRows = (0, import_react.useMemo)(() => buildAgencyRows(taskItems), [taskItems]);
	const bottlenecks = agencyRows.filter((row) => row.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 8);
	const workload = agencyRows.filter((row) => row.pending + row.inProgress + row.overdue > 0).sort((a, b) => b.pending + b.inProgress + b.overdue - (a.pending + a.inProgress + a.overdue)).slice(0, 10).map((row) => ({
		agency: row.agency,
		active: row.pending + row.inProgress + row.overdue
	}));
	const oldestPending = taskItems.filter((task) => task.status !== "done" && !isTaskOverdue(task)).sort((a, b) => ageInDays(b) - ageInDays(a)).slice(0, 10);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-semibold tracking-tight",
					children: "Command Center"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Task analytics and bottleneck detection"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "w-fit shadow-elevated",
					disabled: loading,
					onClick: () => void refresh(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4" }), loading ? "Refreshing" : "Refresh"]
				})]
			}),
			error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive",
				children: error
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-6 xl:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "rounded-2xl shadow-elevated",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Project Health" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current task status from saved records" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-64",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
								data: healthData,
								dataKey: "value",
								nameKey: "name",
								innerRadius: 58,
								outerRadius: 92,
								paddingAngle: 2,
								stroke: "white",
								strokeWidth: 3,
								children: healthData.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: entry.color }, entry.name))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {})] })
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 sm:grid-cols-2 2xl:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendPill, {
								color: "bg-success",
								label: "Completed",
								value: stats.completed
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendPill, {
								color: "bg-destructive",
								label: "Overdue",
								value: stats.overdue
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendPill, {
								color: "bg-warning",
								label: "Pending",
								value: stats.pending
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendPill, {
								color: "bg-primary",
								label: "In Progress",
								value: stats.inProgress
							})
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "rounded-2xl shadow-elevated",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Critical Bottlenecks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current overdue tasks by agency" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "h-80",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: bottlenecks.length ? bottlenecks : [{
									agency: "No overdue",
									overdue: 0
								}],
								layout: "vertical",
								margin: {
									left: 24,
									right: 24
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										type: "number",
										allowDecimals: false,
										tickLine: false,
										axisLine: true
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										type: "category",
										dataKey: "agency",
										width: 120,
										tickLine: false,
										axisLine: false,
										tick: { fontSize: 11 }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "overdue",
										fill: "oklch(0.62 0.22 25)",
										radius: [
											0,
											6,
											6,
											0
										],
										barSize: 86
									})
								]
							})
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-6 xl:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "rounded-2xl shadow-elevated",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Highest Workload" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current open workload by agency" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
						className: "h-80",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
								data: workload,
								layout: "vertical",
								margin: {
									left: 20,
									right: 24
								},
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
										type: "number",
										allowDecimals: false,
										tickLine: false,
										axisLine: true
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
										type: "category",
										dataKey: "agency",
										width: 145,
										tickLine: false,
										axisLine: false,
										tick: { fontSize: 11 }
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
										dataKey: "active",
										fill: "oklch(0.78 0.16 75)",
										radius: [
											0,
											8,
											8,
											0
										],
										barSize: 14
									})
								]
							})
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "rounded-2xl shadow-elevated",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Top 10 Oldest Pending Tasks" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current open tasks sorted by age" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "max-h-80 space-y-3 overflow-y-auto pr-2",
						children: [oldestPending.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "rounded-lg border p-4 text-sm text-muted-foreground",
							children: "No pending tasks."
						}), oldestPending.map((task, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg border bg-background p-3 shadow-card",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "line-clamp-2 text-sm font-semibold",
										children: [
											"#",
											task.id.slice(0, 3).toUpperCase(),
											"-",
											String(index + 1).padStart(3, "0"),
											" ·",
											" ",
											task.title
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs text-muted-foreground",
										children: agencyFor(task)
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "shrink-0 text-sm font-semibold text-destructive",
									children: [ageInDays(task), " days"]
								})]
							})
						}, task.id))]
					}) })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "rounded-2xl shadow-elevated",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
					className: "flex flex-row items-start justify-between gap-4 space-y-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Detailed Agency Performance" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardDescription, { children: "Current task rows only, excluding planner meetings" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						variant: "outline",
						className: "gap-1.5 text-muted-foreground",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3.5 w-3.5" }),
							stats.total,
							" tasks | Updated ",
							nowLabel
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, {
						className: "min-w-[900px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
							className: "hover:bg-transparent",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Agency" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-center",
									children: "Total"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-center text-success",
									children: "Completed"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-center text-warning-foreground",
									children: "Pending"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-center text-primary",
									children: "In Progress"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-center text-destructive",
									children: "Overdue"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
									className: "text-center",
									children: "Avg Speed"
								})
							]
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [agencyRows.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
							colSpan: 7,
							className: "py-8 text-center text-muted-foreground",
							children: "No current tasks found."
						}) }), agencyRows.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
							className: cn(index % 7 === 6 && "bg-primary/5"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "font-semibold",
									children: row.agency
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "text-center tabular-nums",
									children: row.total
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "text-center font-semibold tabular-nums text-success",
									children: row.completed
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "text-center font-semibold tabular-nums text-warning-foreground",
									children: row.pending
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "text-center font-semibold tabular-nums text-primary",
									children: row.inProgress
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "text-center font-semibold tabular-nums text-destructive",
									children: row.overdue
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									className: "text-center text-sm text-muted-foreground",
									children: row.avgSpeed
								})
							]
						}, row.agency))] })]
					})
				}) })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "grid gap-4 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryCard, {
						icon: CircleCheck,
						label: "Completed",
						value: stats.completed,
						tone: "text-success",
						bg: "bg-success/10"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryCard, {
						icon: TimerReset,
						label: "Overdue",
						value: stats.overdue,
						tone: "text-destructive",
						bg: "bg-destructive/10"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SummaryCard, {
						icon: Clock3,
						label: "Open Workload",
						value: stats.pending + stats.inProgress,
						tone: "text-warning-foreground",
						bg: "bg-warning/20"
					})
				]
			})
		]
	});
}
function LegendPill({ color, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-h-14 min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("h-2.5 w-2.5 shrink-0 rounded-full", color) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 whitespace-normal break-words leading-snug text-muted-foreground",
				children: [label, ":"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "shrink-0 text-sm font-semibold tabular-nums text-foreground",
				children: value
			})
		]
	});
}
function SummaryCard({ icon: Icon, label, value, tone, bg }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "rounded-xl shadow-elevated",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "flex items-center gap-3 p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("flex h-10 w-10 items-center justify-center rounded-lg", bg, tone),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-2xl font-semibold tabular-nums",
				children: value
			})] })]
		})
	});
}
function buildAgencyRows(tasks) {
	const rows = /* @__PURE__ */ new Map();
	for (const task of tasks) {
		const agency = agencyFor(task);
		rows.set(agency, [...rows.get(agency) ?? [], task]);
	}
	return Array.from(rows.entries()).map(([agency, items]) => {
		const completedTasks = items.filter((task) => task.status === "done");
		const completedSpeeds = completedTasks.filter((task) => task.completed_at).map((task) => Math.max(0, differenceInCalendarDays(parseISO(task.completed_at), parseISO(task.created_at))));
		const avgSpeed = completedSpeeds.length > 0 ? `${round1(completedSpeeds.reduce((sum, item) => sum + item, 0) / completedSpeeds.length)} days` : "-";
		return {
			agency,
			total: items.length,
			completed: completedTasks.length,
			pending: items.filter((task) => task.status === "todo" && !isTaskOverdue(task)).length,
			inProgress: items.filter((task) => task.status === "in_progress").length,
			overdue: items.filter(isTaskOverdue).length,
			avgSpeed
		};
	}).sort((a, b) => b.total - a.total || a.agency.localeCompare(b.agency));
}
function agencyFor(task) {
	return stringField(task, "agency") || extractDescriptionField(task.description, "Other Agency") || task.department || "District Administration";
}
function stringField(task, field) {
	const value = task[field];
	return typeof value === "string" && value.trim() ? value.trim() : null;
}
function extractDescriptionField(description, field) {
	const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return (description?.match(new RegExp(`^${escapedField}:\\s*(.+)$`, "im")))?.[1]?.trim() || null;
}
function isTaskOverdue(task) {
	if (task.status === "done") return false;
	if (task.status === "blocked") return true;
	return !!task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
}
function ageInDays(task) {
	return Math.max(0, differenceInCalendarDays(/* @__PURE__ */ new Date(), parseISO(task.created_at)));
}
function round1(value) {
	return Math.round(value * 10) / 10;
}
//#endregion
export { CommandCenterPage as component };
