import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime, a as Overlay2, c as Title2, i as Description2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as buttonVariants, r as cn, t as Button } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { a as useTasks, i as useProfiles, n as useDepartments, t as Badge } from "./useData-DHwf5NYf.mjs";
import { n as CardContent, t as Card } from "./card-C5Nmk_bj.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-BcaWptOW.mjs";
import { i as isTaskItem, t as PLANNER_MEETING_TYPE_LINE } from "./taskClassification-DlB8HnWP.mjs";
import { B as ChevronDown, C as MessageCircle, F as ClipboardList, G as BadgeCheck, M as FileImage, N as Download, O as ListChecks, P as Clock3, R as ChevronRight, S as MessageSquareText, T as MapPin, U as CalendarDays, V as Check, W as CalendarClock, _ as Plus, c as Trash2, d as Star, h as Search, j as Flag, q as ArrowDownUp, r as UsersRound, s as TriangleAlert, v as Pin, y as Pencil } from "../_libs/lucide-react.mjs";
import { a as format, c as differenceInCalendarDays, i as isPast, r as isToday, t as parseISO, u as addDays } from "../_libs/date-fns.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { i as Trigger, n as Portal, r as Root2$1, t as Content2$1 } from "../_libs/@radix-ui/react-popover+[...].mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DamjaduW.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-uzm9g8Y7.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, s as Label, t as Dialog } from "./label-ymT1GZwO.mjs";
import { t as Textarea } from "./textarea-DjqHhWkA.mjs";
import { t as useAuth } from "./useAuth-CDGY2Qbc.mjs";
import { a as SheetTitle, c as TooltipProvider, i as SheetHeader, l as TooltipTrigger, n as SheetContent, o as Tooltip, r as SheetDescription, s as TooltipContent, t as Sheet } from "./tooltip-CF6mGN2v.mjs";
import { i as stringType, n as enumType, r as objectType, t as booleanType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tasks-DDGdeW3C.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = Checkbox$1.displayName;
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
var Popover = Root2$1;
var PopoverTrigger = Trigger;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2$1, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = Content2$1.displayName;
async function syncTaskCalendar(taskId, retry = false) {
	const { data, error } = await supabase.functions.invoke("google-calendar-sync", { body: {
		taskId,
		retry
	} });
	if (error) throw new Error(error.message);
	if (data?.error) throw new Error(data.error);
	return data;
}
async function deleteTaskCalendarEvent(taskId) {
	const { data, error } = await supabase.functions.invoke("google-calendar-delete", { body: { taskId } });
	if (error) throw new Error(error.message);
	if (data?.error) throw new Error(data.error);
	return data;
}
var schema = objectType({
	title: stringType().trim().min(2, "Task description required").max(200),
	description: stringType().trim().min(2, "Task description required").max(2e3),
	priority: enumType([
		"low",
		"medium",
		"high",
		"urgent"
	]),
	status: enumType([
		"todo",
		"in_progress",
		"blocked",
		"done"
	]),
	assignee_id: stringType().uuid().nullable(),
	due_date: stringType().nullable(),
	due_time: stringType().nullable(),
	scheduled_date: stringType().nullable(),
	department: stringType().trim().max(100).nullable(),
	calendar_sync_enabled: booleanType()
});
function TaskDialog({ open, onOpenChange, currentUserId, employees, task, defaultDate, onSaved }) {
	const isEdit = !!task;
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [showAdvanced, setShowAdvanced] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)({
		title: "",
		description: "",
		agency: "",
		priority: "medium",
		status: "todo",
		assignee_id: null,
		second_assignee: "",
		time_given_days: "",
		due_date: null,
		scheduled_date: null,
		department: null,
		steno_note: "",
		remarks: "",
		mark_today: false,
		calendar_sync_enabled: false
	});
	const employeeOptions = (0, import_react.useMemo)(() => mergeEmployees(employees), [employees]);
	const { departments } = useDepartments(employeeOptions.map((employee) => employee.department));
	(0, import_react.useEffect)(() => {
		if (task) {
			setForm({
				title: task.title,
				description: task.description || task.title,
				agency: "",
				priority: task.priority,
				status: task.status,
				assignee_id: task.assignee_id,
				second_assignee: "",
				time_given_days: "",
				due_date: task.due_date,
				scheduled_date: task.scheduled_date,
				department: task.department,
				steno_note: "",
				remarks: "",
				mark_today: false,
				calendar_sync_enabled: task.calendar_sync_enabled
			});
			setShowAdvanced(true);
		} else {
			setForm({
				title: "",
				description: "",
				agency: "",
				priority: "medium",
				status: "todo",
				assignee_id: null,
				second_assignee: "",
				time_given_days: "",
				due_date: null,
				scheduled_date: defaultDate ?? null,
				department: null,
				steno_note: "",
				remarks: "",
				mark_today: false,
				calendar_sync_enabled: false
			});
			setShowAdvanced(false);
		}
	}, [
		task,
		defaultDate,
		open
	]);
	const submit = async (e) => {
		e.preventDefault();
		const title = form.title || titleFromDescription(form.description);
		const scheduledDate = form.mark_today ? format(/* @__PURE__ */ new Date(), "yyyy-MM-dd") : form.scheduled_date;
		const dueDate = form.due_date || dueDateFromDays(form.time_given_days);
		const description = composeDescription(form.description, form.steno_note, form.remarks, form.agency, form.second_assignee);
		const parsed = schema.safeParse({
			title,
			description,
			priority: form.priority,
			status: form.status,
			assignee_id: form.assignee_id,
			due_date: dueDate,
			due_time: null,
			scheduled_date: scheduledDate,
			department: form.department === "None (General)" ? null : form.department,
			calendar_sync_enabled: form.calendar_sync_enabled
		});
		if (!parsed.success) {
			toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
			return;
		}
		setSaving(true);
		try {
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
			if (sessionError) throw sessionError;
			const session = sessionData.session;
			const userId = session?.user.id;
			if (!userId) throw new Error("Please sign in before saving tasks.");
			const payload = {
				...parsed.data,
				created_by: userId
			};
			if (isEdit && task) {
				const updatePayload = {
					...parsed.data,
					completed_at: parsed.data.status === "done" ? (/* @__PURE__ */ new Date()).toISOString() : null
				};
				const data = await saveTaskViaApi(session.access_token, {
					...updatePayload,
					id: task.id
				}, "PUT");
				if (!data?.id) throw new Error("Task update did not return a task id.");
				await logTaskAudit$1(data.id, userId, "task_updated", { calendar_sync_enabled: parsed.data.calendar_sync_enabled });
				await syncCalendarAfterSave(data.id, parsed.data.calendar_sync_enabled, task.calendar_sync_enabled);
				await onSaved?.();
				toast.success("Task updated");
			} else {
				const data = await saveTaskViaApi(session.access_token, payload, "POST");
				if (!data?.id) throw new Error("Task insert did not return a task id.");
				await logTaskAudit$1(data.id, userId, "task_created", { calendar_sync_enabled: parsed.data.calendar_sync_enabled });
				await syncCalendarAfterSave(data.id, parsed.data.calendar_sync_enabled, false);
				await onSaved?.();
				toast.success("Task created");
			}
			onOpenChange(false);
		} catch (error) {
			console.error("[Task Save] failed", error);
			toast.error(error instanceof Error ? error.message : "Task save failed");
		} finally {
			setSaving(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-h-[95dvh] w-[calc(100vw-1rem)] overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, {
				className: "border-b bg-background px-4 py-4 sm:px-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClipboardList, { className: "h-4 w-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: isEdit ? "Edit Task" : "New Task" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: isEdit ? "Update task details." : "Add a new task to track." })] })]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "max-h-[78vh] overflow-y-auto px-4 py-5 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, {
								htmlFor: "task-description",
								children: "Task Description"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								id: "task-description",
								value: form.description,
								onChange: (e) => setForm({
									...form,
									description: e.target.value,
									title: titleFromDescription(e.target.value)
								}),
								rows: 4,
								maxLength: 2e3,
								placeholder: "Describe the objective or task in detail...",
								className: "resize-none bg-background focus-visible:ring-primary"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, {
									htmlFor: "agency",
									children: "Other Agency"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "agency",
									value: form.agency,
									onChange: (e) => setForm({
										...form,
										agency: e.target.value
									}),
									placeholder: "e.g. PWD, ZP, NIC",
									className: "bg-background"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, { children: "Department" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.department ?? "None (General)",
									onValueChange: (v) => setForm({
										...form,
										department: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "bg-background",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: department.name,
										children: department.name
									}, department.id)) })]
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 sm:grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, { children: "Assigned Employee" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: form.assignee_id ?? "none",
									onValueChange: (v) => setForm({
										...form,
										assignee_id: v === "none" ? null : v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger, {
										className: "bg-background",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "mr-2 h-3.5 w-3.5 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Search by name or designation" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "none",
										children: "Unassigned"
									}), employeeOptions.map((employee) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: employee.id,
										children: employee.full_name || employee.job_title || employee.email
									}, employee.id))] })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, {
									htmlFor: "second-assignee",
									children: "Second Assignee"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "second-assignee",
									value: form.second_assignee,
									onChange: (e) => setForm({
										...form,
										second_assignee: e.target.value
									}),
									placeholder: "Optional",
									className: "bg-background"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, {
								htmlFor: "due-date",
								children: "Due Date"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "due-date",
								type: "date",
								value: form.due_date ?? "",
								onChange: (e) => setForm({
									...form,
									due_date: e.target.value || null
								}),
								className: "bg-background"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-3 text-sm font-medium shadow-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
								checked: form.calendar_sync_enabled,
								onCheckedChange: (checked) => setForm({
									...form,
									calendar_sync_enabled: checked === true
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "h-4 w-4 text-primary" }), "Sync with Google Calendar"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							className: "flex items-center gap-2 text-sm font-semibold text-primary",
							onClick: () => setShowAdvanced((value) => !value),
							children: [showAdvanced ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" }), showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"]
						}),
						showAdvanced && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4 border-t pt-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-3 sm:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, { children: "Status" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.status,
											onValueChange: (v) => setForm({
												...form,
												status: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
												className: "bg-background",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "todo",
													children: "Pending"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "in_progress",
													children: "In Progress"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "done",
													children: "Completed"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "blocked",
													children: "Overdue"
												})
											] })]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, { children: "Priority" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
											value: form.priority,
											onValueChange: (v) => setForm({
												...form,
												priority: v
											}),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
												className: "bg-background",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "low",
													children: "Low"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "medium",
													children: "Normal"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "high",
													children: "High"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: "urgent",
													children: "Important"
												})
											] })]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, {
										htmlFor: "steno-note",
										children: "Steno / Follow-up Note"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
										id: "steno-note",
										value: form.steno_note,
										onChange: (e) => setForm({
											...form,
											steno_note: e.target.value
										}),
										placeholder: "Notes for secretary/steno...",
										rows: 3,
										className: "resize-none bg-background"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel$1, {
										htmlFor: "remarks",
										children: "Remarks"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "remarks",
										value: form.remarks,
										onChange: (e) => setForm({
											...form,
											remarks: e.target.value
										}),
										placeholder: "Any additional remarks...",
										className: "bg-background"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex cursor-pointer items-center gap-3 rounded-lg bg-background px-3 py-3 text-sm font-medium",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
										checked: form.mark_today,
										onCheckedChange: (checked) => setForm({
											...form,
											mark_today: checked === true
										})
									}), "Mark as Today"]
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
					className: "mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2 sm:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "secondary",
						className: "h-11 w-full rounded-full",
						onClick: () => onOpenChange(false),
						children: "Cancel"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						disabled: saving,
						className: "h-11 w-full rounded-full shadow-elevated",
						children: saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"
					})]
				})]
			})]
		})
	});
}
function mergeEmployees(primary) {
	const byId = /* @__PURE__ */ new Map();
	for (const employee of primary) byId.set(employee.id, employee);
	return Array.from(byId.values()).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
}
function FieldLabel$1({ children, htmlFor }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		htmlFor,
		className: "text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground",
		children
	});
}
function titleFromDescription(description) {
	const clean = description.trim().replace(/\s+/g, " ");
	if (!clean) return "";
	return clean.length > 120 ? `${clean.slice(0, 117)}...` : clean;
}
function dueDateFromDays(days) {
	const value = Number(days);
	if (!Number.isFinite(value) || value < 0) return null;
	return format(addDays(/* @__PURE__ */ new Date(), value), "yyyy-MM-dd");
}
function composeDescription(description, note, remarks, agency, secondAssignee) {
	const extra = [
		agency ? `Other Agency: ${agency}` : "",
		secondAssignee ? `Second Assignee: ${secondAssignee}` : "",
		note ? `Steno / Follow-up Note: ${note}` : "",
		remarks ? `Remarks: ${remarks}` : ""
	].filter(Boolean);
	return extra.length ? `${description.trim()}\n\n${extra.join("\n")}` : description.trim();
}
async function syncCalendarAfterSave(taskId, syncEnabled, wasSynced) {
	try {
		if (syncEnabled) {
			await syncTaskCalendar(taskId);
			toast.success("Google Calendar synced");
		} else if (wasSynced) {
			await deleteTaskCalendarEvent(taskId);
			toast.success("Google Calendar event removed");
		}
	} catch (error) {
		toast.error(error instanceof Error ? error.message : "Google Calendar sync failed");
	}
}
async function saveTaskViaApi(accessToken, payload, method) {
	const response = await fetch("/api/tasks", {
		method,
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${accessToken}`
		},
		body: JSON.stringify(payload)
	});
	if (!response.ok) {
		const message = await response.text();
		throw new Error(message || "Task save failed");
	}
	return (await response.json()).task;
}
async function logTaskAudit$1(taskId, actorId, action, metadata) {
	const modernPayload = {
		task_id: taskId,
		action_type: action,
		old_value: null,
		new_value: metadata,
		performed_by: actorId
	};
	const modern = await supabase.from("task_audit_logs").insert(modernPayload);
	if (!modern.error) return;
	console.warn("[Task Audit] modern audit insert failed, trying legacy shape", modern.error);
	const legacy = await supabase.from("task_audit_logs").insert({
		task_id: taskId,
		actor_id: actorId,
		action,
		metadata
	});
	if (legacy.error) console.warn("[Task Audit] legacy audit insert failed", legacy.error);
}
function normalizeWhatsAppPhone(phone) {
	const digits = (phone ?? "").replace(/\D/g, "");
	if (digits.length === 10) return `91${digits}`;
	if (digits.length >= 11 && digits.length <= 15) return digits;
	return null;
}
function isValidWhatsAppPhone(phone) {
	return normalizeWhatsAppPhone(phone) !== null;
}
function buildTaskWhatsAppMessage(input) {
	return [
		`Hello ${input.officerName},`,
		"",
		"You have been assigned the following task:",
		"",
		`Task: ${input.taskTitle}`,
		`Description: ${input.taskDescription}`,
		`Due Date: ${input.dueDate}`,
		`Priority: ${input.priority}`,
		`Status: ${input.status}`,
		"",
		"Please review the task and provide updates on the dashboard.",
		"",
		"Regards,",
		input.assignedBy,
		"Governance Review Dashboard"
	].join("\n");
}
function buildWhatsAppUrl(phone, message) {
	const normalizedPhone = normalizeWhatsAppPhone(phone);
	if (!normalizedPhone) return null;
	return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
var tooltipText = "Send Task Details via WhatsApp";
function WhatsAppActionButton({ phone, message, className, hideWhenInvalid = false }) {
	const valid = isValidWhatsAppPhone(phone);
	if (hideWhenInvalid && !valid) return null;
	const openWhatsApp = () => {
		const url = phone ? buildWhatsAppUrl(phone, message) : null;
		if (!url) {
			toast.error("Assigned officer does not have a valid WhatsApp mobile number.");
			return;
		}
		window.open(url, "_blank", "noopener,noreferrer");
		toast.success("Opening WhatsApp");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			type: "button",
			size: "icon",
			variant: "ghost",
			"aria-label": tooltipText,
			title: tooltipText,
			onClick: openWhatsApp,
			className: cn("h-8 w-8 bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 hover:text-white", className),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4" })
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: tooltipText })] }) });
}
var statusLabels = {
	todo: "Pending",
	in_progress: "In Progress",
	blocked: "Overdue",
	done: "Completed"
};
var priorityLabels = {
	low: "Low",
	medium: "Normal",
	high: "High",
	urgent: "Important"
};
function TasksManagementPage() {
	const { user } = useAuth();
	const { tasks, error: tasksError, refresh: refreshTasks } = useTasks();
	const { profiles } = useProfiles();
	const { departments: departmentOptions } = useDepartments([...tasks.map((task) => task.department), ...profiles.map((profile) => profile.department)]);
	const [query, setQuery] = (0, import_react.useState)("");
	const [quickFilter, setQuickFilter] = (0, import_react.useState)("all");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [agencyFilter, setAgencyFilter] = (0, import_react.useState)("all");
	const [departmentFilter, setDepartmentFilter] = (0, import_react.useState)("all");
	const [commentsFilter, setCommentsFilter] = (0, import_react.useState)("all");
	const [sortMode, setSortMode] = (0, import_react.useState)("latest");
	const [dialogOpen, setDialogOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [meetingTask, setMeetingTask] = (0, import_react.useState)(null);
	const [bulkMode, setBulkMode] = (0, import_react.useState)(false);
	const [selectedIds, setSelectedIds] = (0, import_react.useState)([]);
	const [bulkStatus, setBulkStatus] = (0, import_react.useState)("keep");
	const [bulkPriority, setBulkPriority] = (0, import_react.useState)("keep");
	const [bulkDepartment, setBulkDepartment] = (0, import_react.useState)("keep");
	const [bulkAssignee, setBulkAssignee] = (0, import_react.useState)("keep");
	const [bulkDueDate, setBulkDueDate] = (0, import_react.useState)("");
	const [bulkScheduledDate, setBulkScheduledDate] = (0, import_react.useState)("");
	const [bulkSaving, setBulkSaving] = (0, import_react.useState)(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = (0, import_react.useState)(false);
	const [taskComments, setTaskComments] = (0, import_react.useState)({});
	const [savingCommentId, setSavingCommentId] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		const department = new URLSearchParams(window.location.search).get("department");
		if (department) setDepartmentFilter(department);
	}, []);
	const taskItems = (0, import_react.useMemo)(() => tasks.filter(isTaskItem), [tasks]);
	const taskItemIds = (0, import_react.useMemo)(() => taskItems.map((task) => task.id), [taskItems]);
	const departments = (0, import_react.useMemo)(() => Array.from(new Set(taskItems.map((task) => task.department).filter(Boolean))).sort(), [taskItems]);
	const agencies = (0, import_react.useMemo)(() => Array.from(new Set(taskItems.map((task) => agencyFor(task)).filter(Boolean))).sort(), [taskItems]);
	const nameFor = (uid) => {
		if (!uid) return "Unassigned";
		const profile = profiles.find((item) => item.id === uid);
		return profile?.full_name || profile?.email || "Unknown";
	};
	const profileFor = (uid) => {
		if (!uid) return null;
		return profiles.find((item) => item.id === uid) ?? null;
	};
	const decoratedTasks = (0, import_react.useMemo)(() => {
		return taskItems.map((task) => ({
			task,
			agency: agencyFor(task),
			assignee: nameFor(task.assignee_id),
			assigneeProfile: profileFor(task.assignee_id),
			assignedBy: nameFor(task.created_by),
			displayStatus: displayStatusFor(task),
			comments: commentsFor(task, taskComments[task.id]),
			latestComment: taskComments[task.id]?.[0]?.comment ?? ""
		}));
	}, [
		taskItems,
		profiles,
		taskComments
	]);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return decoratedTasks.filter(({ task, agency, assignee, comments, latestComment, displayStatus }) => {
			if (quickFilter === "today" && !isDateToday(task.due_date)) return false;
			if (quickFilter === "important" && task.priority !== "urgent") return false;
			if (statusFilter !== "all" && displayStatus !== statusFilter) return false;
			if (agencyFilter !== "all" && agency !== agencyFilter) return false;
			if (departmentFilter !== "all" && task.department !== departmentFilter) return false;
			if (commentsFilter === "with-comments" && comments === "No comments") return false;
			if (commentsFilter === "without-comments" && comments !== "No comments") return false;
			if (!q) return true;
			return [
				String(task.id ?? "").slice(0, 8),
				task.title ?? "",
				task.description ?? "",
				agency,
				task.department ?? "",
				assignee,
				latestComment
			].some((value) => value.toLowerCase().includes(q));
		}).sort((a, b) => sortTasks(a.task, b.task, sortMode));
	}, [
		decoratedTasks,
		query,
		quickFilter,
		statusFilter,
		agencyFilter,
		departmentFilter,
		commentsFilter,
		sortMode
	]);
	const loadTaskComments = async () => {
		if (taskItemIds.length === 0) {
			setTaskComments({});
			return;
		}
		const { data, error } = await supabase.from("task_comments").select("id, task_id, comment, commented_by, created_at").in("task_id", taskItemIds).order("created_at", { ascending: false });
		if (error) {
			console.warn("[Task Comments] Load failed", error);
			return;
		}
		const grouped = (data ?? []).reduce((acc, comment) => {
			acc[comment.task_id] = [...acc[comment.task_id] ?? [], comment];
			return acc;
		}, {});
		setTaskComments(grouped);
	};
	(0, import_react.useEffect)(() => {
		loadTaskComments();
	}, [taskItemIds.join("|")]);
	(0, import_react.useEffect)(() => {
		setSelectedIds((ids) => ids.filter((id) => filtered.some((item) => item.task.id === id)));
	}, [filtered]);
	const completed = taskItems.filter((task) => task.status === "done").length;
	const overdue = taskItems.filter((task) => displayStatusFor(task) === "overdue").length;
	const pending = taskItems.filter((task) => task.status !== "done").length;
	const important = taskItems.filter((task) => task.priority === "urgent").length;
	const kpis = [
		{
			label: "Total Tasks",
			value: taskItems.length,
			icon: ListChecks,
			tone: "text-primary",
			bg: "bg-primary/10"
		},
		{
			label: "Completed",
			value: completed,
			icon: BadgeCheck,
			tone: "text-success",
			bg: "bg-success/10"
		},
		{
			label: "Pending",
			value: pending,
			icon: Clock3,
			tone: "text-info",
			bg: "bg-info/10"
		},
		{
			label: "Overdue",
			value: overdue,
			icon: TriangleAlert,
			tone: "text-destructive",
			bg: "bg-destructive/10"
		},
		{
			label: "Important Tasks",
			value: important,
			icon: Star,
			tone: "text-warning-foreground",
			bg: "bg-warning/25"
		}
	];
	const currentUserId = user?.id ?? "";
	const selectedTasks = (0, import_react.useMemo)(() => filtered.map((item) => item.task).filter((task) => selectedIds.includes(task.id)), [filtered, selectedIds]);
	const visibleIds = (0, import_react.useMemo)(() => filtered.map((item) => item.task.id), [filtered]);
	const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
	const toggleBulkMode = () => {
		setBulkMode((value) => {
			if (value) setSelectedIds([]);
			return !value;
		});
	};
	const toggleTaskSelection = (taskId) => {
		setSelectedIds((ids) => ids.includes(taskId) ? ids.filter((id) => id !== taskId) : [...ids, taskId]);
	};
	const toggleAllVisible = () => {
		setSelectedIds((ids) => {
			if (allVisibleSelected) return ids.filter((id) => !visibleIds.includes(id));
			return Array.from(/* @__PURE__ */ new Set([...ids, ...visibleIds]));
		});
	};
	const resetBulkFields = () => {
		setBulkStatus("keep");
		setBulkPriority("keep");
		setBulkDepartment("keep");
		setBulkAssignee("keep");
		setBulkDueDate("");
		setBulkScheduledDate("");
	};
	const applyBulkEdit = async () => {
		if (selectedTasks.length === 0) {
			toast.error("Select tasks first");
			return;
		}
		const updates = {};
		if (bulkStatus !== "keep") {
			updates.status = bulkStatus;
			updates.completed_at = bulkStatus === "done" ? (/* @__PURE__ */ new Date()).toISOString() : null;
		}
		if (bulkPriority !== "keep") updates.priority = bulkPriority;
		if (bulkDepartment !== "keep") updates.department = bulkDepartment === "none" ? null : bulkDepartment;
		if (bulkAssignee !== "keep") updates.assignee_id = bulkAssignee === "none" ? null : bulkAssignee;
		if (bulkDueDate) updates.due_date = bulkDueDate;
		if (bulkScheduledDate) updates.scheduled_date = bulkScheduledDate;
		if (Object.keys(updates).length === 0) {
			toast.error("Choose at least one field to update");
			return;
		}
		setBulkSaving(true);
		try {
			if (!currentUserId) throw new Error("Please sign in before updating tasks.");
			const { error } = await supabase.from("tasks").update(updates).in("id", selectedIds);
			if (error) throw error;
			await Promise.all(selectedTasks.map((task) => logTaskAudit(task.id, currentUserId, "task_updated", {
				bulk: true,
				updates
			})));
			await refreshTasks();
			toast.success(`${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} updated`);
			resetBulkFields();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Bulk update failed");
		} finally {
			setBulkSaving(false);
		}
	};
	const deleteSelectedTasks = async () => {
		if (selectedTasks.length === 0) return;
		setBulkSaving(true);
		try {
			if (!currentUserId) throw new Error("Please sign in before deleting tasks.");
			for (const task of selectedTasks) if (task.google_calendar_event_id) await deleteTaskCalendarEvent(task.id).catch((error) => {
				console.warn("[Bulk Delete] calendar delete failed", error);
			});
			await Promise.all(selectedTasks.map((task) => logTaskAudit(task.id, currentUserId, "task_deleted", {
				bulk: true,
				title: task.title
			})));
			const { error } = await supabase.from("tasks").delete().in("id", selectedIds);
			if (error) throw error;
			await refreshTasks();
			toast.success(`${selectedTasks.length} task${selectedTasks.length === 1 ? "" : "s"} deleted`);
			setSelectedIds([]);
			setBulkDeleteOpen(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Bulk delete failed");
		} finally {
			setBulkSaving(false);
		}
	};
	const handleComplete = async (task) => {
		if (!currentUserId) {
			toast.error("Please sign in before updating tasks.");
			return;
		}
		const { error } = await supabase.from("tasks").update({
			status: "done",
			completed_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("id", task.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await logTaskAudit(task.id, currentUserId, "task_updated", { status: "done" });
		if (task.calendar_sync_enabled) await syncTaskSafely(task.id);
		await refreshTasks();
		toast.success("Task marked complete");
	};
	const handleDelete = async (task) => {
		if (!currentUserId) {
			toast.error("Please sign in before deleting tasks.");
			return;
		}
		await logTaskAudit(task.id, currentUserId, "task_deleted", { title: task.title });
		if (task.google_calendar_event_id) try {
			await deleteTaskCalendarEvent(task.id);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Could not remove Google Calendar event");
			return;
		}
		const { error } = await supabase.from("tasks").delete().eq("id", task.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await refreshTasks();
		toast.success("Task deleted");
	};
	const handleExtendDeadline = async (task, dueDate) => {
		if (!dueDate) {
			toast.error("Please select a deadline date");
			return;
		}
		if (!currentUserId) {
			toast.error("Please sign in before updating tasks.");
			return;
		}
		const { error } = await supabase.from("tasks").update({ due_date: dueDate }).eq("id", task.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await logTaskAudit(task.id, currentUserId, "task_updated", { due_date: dueDate });
		if (task.calendar_sync_enabled) await syncTaskSafely(task.id);
		await refreshTasks();
		toast.success("Deadline updated");
	};
	const handleMarkImportant = async (task) => {
		if (!currentUserId) {
			toast.error("Please sign in before updating tasks.");
			return;
		}
		const { error } = await supabase.from("tasks").update({ priority: "urgent" }).eq("id", task.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await logTaskAudit(task.id, currentUserId, "task_updated", { priority: "urgent" });
		await refreshTasks();
		toast.success("Task marked important");
	};
	const handleFieldVisitNotepad = async (task) => {
		const today = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
		const note = [
			"Type: Field Visit",
			`Field Visit Notepad: ${task.department || "District field visit"}`,
			`Added On: ${format(/* @__PURE__ */ new Date(), "MMM d, yyyy")}`
		].join("\n");
		const description = task.description?.includes("Field Visit Notepad") ? task.description : [task.description || task.title, note].filter(Boolean).join("\n\n");
		if (!currentUserId) {
			toast.error("Please sign in before updating tasks.");
			return;
		}
		const { error } = await supabase.from("tasks").update({
			description,
			scheduled_date: today,
			status: task.status === "done" ? task.status : "in_progress"
		}).eq("id", task.id);
		if (error) {
			toast.error(error.message);
			return;
		}
		await logTaskAudit(task.id, currentUserId, "task_updated", {
			type: "field_visit_notepad",
			scheduled_date: today
		});
		await refreshTasks();
		toast.success("Added to Field Visit Notepad");
	};
	const handlePinTask = () => {
		toast.success("Task pinned for follow-up");
	};
	const handleSaveComment = async (task, comment) => {
		const trimmed = comment.trim();
		if (!trimmed) {
			toast.error("Enter a follow-up comment first");
			return;
		}
		if (!currentUserId) {
			toast.error("Please sign in before adding comments.");
			return;
		}
		setSavingCommentId(task.id);
		try {
			const { error } = await supabase.from("task_comments").insert({
				task_id: task.id,
				comment: trimmed,
				commented_by: currentUserId
			});
			if (error) throw error;
			await loadTaskComments();
			await refreshTasks();
			toast.success("Comment saved");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Comment save failed");
		} finally {
			setSavingCommentId(null);
		}
	};
	const handleExport = () => {
		if (filtered.length === 0) {
			toast.error("No tasks to export");
			return;
		}
		const rows = filtered.map(({ task, agency, assignee, assignedBy, comments, displayStatus }, index) => ({
			sno: index + 1,
			task_number: task.task_number ?? task.id.slice(0, 8),
			title: task.title,
			description: task.description ?? "",
			agency,
			department: task.department ?? "",
			assignee,
			assigned_by: assignedBy,
			allocated_date: formatDate(task.created_at),
			due_date: formatDate(task.due_date),
			scheduled_date: formatDate(task.scheduled_date),
			status: statusLabelForDisplay(displayStatus),
			priority: priorityLabels[task.priority],
			comments
		}));
		downloadExcelWorkbook(rows, `tasks-export-${format(/* @__PURE__ */ new Date(), "yyyy-MM-dd-HHmm")}.xls`);
		toast.success(`${rows.length} task${rows.length === 1 ? "" : "s"} exported`);
	};
	const handleScheduleMeeting = (task) => {
		setMeetingTask(task);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto w-full max-w-[1600px] min-w-0 space-y-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-card lg:flex-row lg:items-center lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-2xl font-semibold tracking-tight",
						children: "Tasks"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "Manage and track all assigned tasks"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: handleExport,
							className: "justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), "Export"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: bulkMode ? "default" : "outline",
							onClick: toggleBulkMode,
							className: "justify-center",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsersRound, { className: "h-4 w-4" }), bulkMode ? "Done Bulk" : "Bulk Edit"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "col-span-2 justify-center sm:col-span-1",
							onClick: () => {
								setEditing(null);
								setDialogOpen(true);
							},
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "New Task"]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5",
				children: kpis.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KpiCard, { ...item }, item.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "min-w-0 shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "min-w-0 space-y-4 p-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-3 gap-2 sm:flex sm:flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickFilterButton, {
								active: quickFilter === "all",
								onClick: () => setQuickFilter("all"),
								children: "All Tasks"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickFilterButton, {
								active: quickFilter === "today",
								onClick: () => setQuickFilter("today"),
								children: "Today"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickFilterButton, {
								active: quickFilter === "important",
								onClick: () => setQuickFilter("important"),
								children: "Important"
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(240px,1.25fr)_repeat(5,minmax(130px,1fr))]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									"aria-label": "Search tasks",
									placeholder: "Search tasks by number, agency, department or assignee",
									value: query,
									onChange: (event) => setQuery(event.target.value),
									className: "pl-9"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
								value: statusFilter,
								onValueChange: setStatusFilter,
								placeholder: "Status filter",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "all",
										children: "All Status"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "pending",
										children: "Pending"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "in_progress",
										children: "In Progress"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "completed",
										children: "Completed"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "overdue",
										children: "Overdue"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
								value: agencyFilter,
								onValueChange: setAgencyFilter,
								placeholder: "Agency filter",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All Agencies"
								}), agencies.map((agency) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: agency,
									children: agency
								}, agency))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
								value: departmentFilter,
								onValueChange: setDepartmentFilter,
								placeholder: "Department filter",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All Departments"
								}), departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: department,
									children: department
								}, department))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
								value: commentsFilter,
								onValueChange: (value) => setCommentsFilter(value),
								placeholder: "Comments filter",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "all",
										children: "All Comments"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "with-comments",
										children: "With Comments"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "without-comments",
										children: "Without Comments"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
								value: sortMode,
								onValueChange: (value) => setSortMode(value),
								placeholder: "Sort by Latest",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "latest",
										children: "Sort by Latest"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "deadline",
										children: "Deadline First"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "priority",
										children: "Priority First"
									})
								]
							})
						]
					})]
				})
			}),
			bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "min-w-0 border-primary/25 shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-4 p-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-semibold",
								children: "Bulk Edit"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: [selectedTasks.length, " selected from current task register"]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									size: "sm",
									onClick: toggleAllVisible,
									children: allVisibleSelected ? "Clear Visible" : "Select Visible"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									size: "sm",
									onClick: () => setSelectedIds([]),
									disabled: selectedTasks.length === 0,
									children: "Clear"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
									value: bulkStatus,
									onValueChange: (value) => setBulkStatus(value),
									placeholder: "Status",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "keep",
											children: "Keep Status"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "todo",
											children: "Pending"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "in_progress",
											children: "In Progress"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "done",
											children: "Completed"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "blocked",
											children: "Overdue"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
									value: bulkPriority,
									onValueChange: (value) => setBulkPriority(value),
									placeholder: "Priority",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "keep",
											children: "Keep Priority"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "low",
											children: "Low"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "medium",
											children: "Normal"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "high",
											children: "High"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "urgent",
											children: "Important"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
									value: bulkDepartment,
									onValueChange: setBulkDepartment,
									placeholder: "Department",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "keep",
											children: "Keep Department"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "none",
											children: "None"
										}),
										departmentOptions.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: department.name,
											children: department.name
										}, department.id))
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(FilterSelect, {
									value: bulkAssignee,
									onValueChange: setBulkAssignee,
									placeholder: "Assignee",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "keep",
											children: "Keep Assignee"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "none",
											children: "Unassigned"
										}),
										profiles.map((profile) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: profile.id,
											children: profile.full_name || profile.job_title || profile.email
										}, profile.id))
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									"aria-label": "Bulk due date",
									value: bulkDueDate,
									onChange: (event) => setBulkDueDate(event.target.value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									"aria-label": "Bulk scheduled date",
									value: bulkScheduledDate,
									onChange: (event) => setBulkScheduledDate(event.target.value)
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap justify-end gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									variant: "outline",
									onClick: resetBulkFields,
									disabled: bulkSaving,
									children: "Reset Fields"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									type: "button",
									onClick: applyBulkEdit,
									disabled: bulkSaving || selectedTasks.length === 0,
									children: bulkSaving ? "Saving..." : "Apply Changes"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									type: "button",
									variant: "outline",
									className: "border-destructive/30 text-destructive hover:text-destructive",
									onClick: () => setBulkDeleteOpen(true),
									disabled: bulkSaving || selectedTasks.length === 0,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }), "Delete Selected"]
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "min-w-0 overflow-hidden shadow-card",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-0",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "border-b bg-primary-muted/40 px-4 py-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm font-semibold",
										children: "Task Register"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted-foreground",
										children: [filtered.length, " records shown"]
									}),
									tasksError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs font-medium text-destructive",
										children: tasksError
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									variant: "secondary",
									className: "gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownUp, { className: "h-3.5 w-3.5" }), sortMode === "latest" ? "Latest first" : sortMode === "deadline" ? "Deadline first" : "Priority first"]
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-3 p-3 md:grid-cols-2 2xl:hidden",
							children: [filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground md:col-span-2",
								children: "No tasks found for the selected filters."
							}), filtered.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskMobileCard, {
								index,
								item,
								bulkMode,
								selected: selectedIds.includes(item.task.id),
								onToggleSelected: toggleTaskSelection,
								onSaveComment: handleSaveComment,
								savingComment: savingCommentId === item.task.id,
								onEdit: (task) => {
									setEditing(task);
									setDialogOpen(true);
								},
								onScheduleMeeting: handleScheduleMeeting,
								onExtendDeadline: handleExtendDeadline,
								onFieldVisit: handleFieldVisitNotepad,
								onComplete: handleComplete,
								onMarkImportant: handleMarkImportant,
								onPin: handlePinTask,
								onDelete: handleDelete
							}, item.task.id))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "hidden max-w-full overflow-x-auto 2xl:block",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, {
								className: "min-w-[1320px]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, {
									className: "bg-muted/45",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
										bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-12",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
												checked: allVisibleSelected,
												onCheckedChange: toggleAllVisible,
												"aria-label": "Select all visible tasks"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-12",
											children: "S.No"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-48",
											children: "Task"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-24",
											children: "Due In"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-16",
											children: "Image"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-64",
											children: "Task Description"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-36",
											children: "Comments"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-36",
											children: "Assigned To"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-36",
											children: "Allocated Date"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-28",
											children: "Deadline"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-32",
											children: "Status"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
											className: "w-64 text-right",
											children: "Actions"
										})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
									colSpan: bulkMode ? 12 : 11,
									className: "py-12 text-center text-sm text-muted-foreground",
									children: "No tasks found for the selected filters."
								}) }), filtered.map(({ task, assignee, assigneeProfile, assignedBy, agency, comments, latestComment, displayStatus }, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
									className: "bg-card/70",
									children: [
										bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
											checked: selectedIds.includes(task.id),
											onCheckedChange: () => toggleTaskSelection(task.id),
											"aria-label": `Select task ${index + 1}`
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "font-medium tabular-nums",
											children: index + 1
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "truncate font-medium",
												children: task.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1 flex flex-wrap gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityBadge, { priority: task.priority }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
													variant: "outline",
													className: "bg-primary/5 text-primary",
													children: agency
												})]
											})]
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DueBadge, { task }) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex h-10 w-10 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileImage, {
												className: "h-4 w-4",
												"aria-hidden": "true"
											})
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "line-clamp-2 text-sm text-muted-foreground",
											children: task.description || "No description added for this task."
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskCommentComposer, {
											task,
											comments,
											latestComment,
											saving: savingCommentId === task.id,
											onSave: handleSaveComment
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "text-sm",
											children: assignee
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "text-sm text-muted-foreground",
											children: formatDate(task.created_at)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "text-sm text-muted-foreground",
											children: formatDate(task.due_date)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, { status: displayStatus }) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskActions, {
											task,
											assignee,
											assigneeProfile,
											assignedBy,
											onEdit: (task) => {
												setEditing(task);
												setDialogOpen(true);
											},
											onScheduleMeeting: handleScheduleMeeting,
											onExtendDeadline: handleExtendDeadline,
											onFieldVisit: handleFieldVisitNotepad,
											onComplete: handleComplete,
											onMarkImportant: handleMarkImportant,
											onPin: handlePinTask,
											onDelete: handleDelete
										}) })
									]
								}, task.id))] })]
							})
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskDialog, {
				open: dialogOpen,
				onOpenChange: setDialogOpen,
				currentUserId,
				employees: profiles,
				task: editing,
				onSaved: refreshTasks
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScheduleMeetingSheet, {
				task: meetingTask,
				assignee: meetingTask ? nameFor(meetingTask.assignee_id) : "",
				assigneeProfile: meetingTask ? profileFor(meetingTask.assignee_id) : null,
				department: meetingTask?.department ?? "None (General)",
				departmentOptions: departmentOptions.map((department) => department.name),
				currentUserId,
				open: !!meetingTask,
				onOpenChange: (open) => {
					if (!open) setMeetingTask(null);
				},
				onSaved: refreshTasks
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: bulkDeleteOpen,
				onOpenChange: setBulkDeleteOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Delete selected tasks?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"This will permanently delete ",
					selectedTasks.length,
					" selected task",
					selectedTasks.length === 1 ? "" : "s",
					"."
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, {
					disabled: bulkSaving,
					children: "Cancel"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
					disabled: bulkSaving,
					onClick: (event) => {
						event.preventDefault();
						deleteSelectedTasks();
					},
					children: bulkSaving ? "Deleting..." : "Delete"
				})] })] })
			})
		]
	});
}
function KpiCard({ label, value, icon: Icon, tone, bg }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "shadow-card",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
			className: "p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground",
						children: label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-3xl font-semibold leading-none tabular-nums",
						children: value
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", bg, tone),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
						className: "h-5 w-5",
						"aria-hidden": "true"
					})
				})]
			})
		})
	});
}
function QuickFilterButton({ active, onClick, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		type: "button",
		variant: active ? "default" : "outline",
		className: cn("w-full justify-center px-2 text-xs sm:w-auto sm:px-3 sm:text-sm", !active && "bg-card"),
		onClick,
		children
	});
}
function FilterSelect({ value, onValueChange, placeholder, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
		value,
		onValueChange,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
			className: "min-w-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children })]
	});
}
function StatusPill({ status }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "outline",
		className: cn("font-medium", {
			pending: "bg-muted text-muted-foreground border-muted-foreground/20",
			in_progress: "bg-info/15 text-info border-info/30",
			completed: "bg-success/15 text-success border-success/30",
			overdue: "bg-destructive/15 text-destructive border-destructive/30"
		}[status]),
		children: {
			pending: "Pending",
			in_progress: "In Progress",
			completed: "Completed",
			overdue: "Overdue"
		}[status]
	});
}
function PriorityBadge({ priority }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "outline",
		className: cn("font-medium", {
			low: "bg-muted text-muted-foreground border-muted-foreground/20",
			medium: "bg-primary/10 text-primary border-primary/20",
			high: "bg-warning/20 text-warning-foreground border-warning/40",
			urgent: "bg-destructive/15 text-destructive border-destructive/30"
		}[priority]),
		children: priorityLabels[priority]
	});
}
function DueBadge({ task }) {
	const dueDate = safeParseDate(task.due_date);
	if (!dueDate) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "text-sm text-muted-foreground",
		children: "No deadline"
	});
	const days = differenceInCalendarDays(dueDate, /* @__PURE__ */ new Date());
	if (task.status === "done") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "outline",
		className: "bg-success/10 text-success",
		children: "Completed"
	});
	if (days < 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
		variant: "outline",
		className: "bg-destructive/15 text-destructive",
		children: [Math.abs(days), "d overdue"]
	});
	if (days === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: "outline",
		className: "bg-warning/25 text-warning-foreground",
		children: "Today"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
		variant: "outline",
		className: "bg-primary/10 text-primary",
		children: [days, "d left"]
	});
}
function TaskMobileCard({ index, item, bulkMode = false, selected = false, onToggleSelected, onEdit, onScheduleMeeting, onExtendDeadline, onFieldVisit, onComplete, onMarkImportant, onPin, onDelete, onSaveComment, savingComment = false }) {
	const { task, agency, assignee, assigneeProfile, assignedBy, comments, latestComment, displayStatus } = item;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
		className: cn("min-w-0 rounded-md border bg-card p-4 shadow-sm", selected && "border-primary/60 ring-2 ring-primary/15"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							bulkMode && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
								checked: selected,
								onCheckedChange: () => onToggleSelected?.(task.id),
								"aria-label": `Select task ${index + 1}`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "rounded bg-muted px-2 py-1 text-xs font-semibold tabular-nums text-muted-foreground",
								children: ["#", index + 1]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusPill, { status: displayStatus })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "mt-3 break-words text-base font-semibold leading-snug",
						children: task.title
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/30 text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileImage, {
						className: "h-4 w-4",
						"aria-hidden": "true"
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriorityBadge, { priority: task.priority }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
						variant: "outline",
						className: "max-w-full bg-primary/5 text-primary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: agency
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DueBadge, { task })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 line-clamp-3 break-words text-sm text-muted-foreground",
				children: task.description || "No description added for this task."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-4 grid gap-3 text-sm sm:grid-cols-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskMeta, {
						label: "Assigned To",
						value: assignee
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskMeta, {
						label: "Allocated",
						value: formatDate(task.created_at)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskMeta, {
						label: "Deadline",
						value: formatDate(task.due_date)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
							children: "Comments"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskCommentComposer, {
								task,
								comments,
								latestComment,
								saving: savingComment,
								onSave: onSaveComment
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskActions, {
				task,
				assignee,
				assigneeProfile,
				assignedBy,
				onEdit,
				onScheduleMeeting,
				onExtendDeadline,
				onFieldVisit,
				onComplete,
				onMarkImportant,
				onPin,
				onDelete,
				className: "mt-4 justify-start rounded-md bg-muted/25 p-1"
			})
		]
	});
}
function TaskCommentComposer({ task, comments, latestComment, saving, onSave }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const preview = latestComment || comments;
	const handleCancel = () => {
		setDraft("");
		setOpen(false);
	};
	const handleSave = async () => {
		await onSave(task, draft);
		setDraft("");
		setOpen(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				type: "button",
				className: "group flex w-full min-w-[8rem] items-start gap-2 rounded-md border border-transparent px-2 py-1.5 text-left text-sm transition hover:border-primary/25 hover:bg-primary/5",
				"aria-label": `Add comment for ${task.title}`,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquareText, {
					className: "mt-0.5 h-4 w-4 shrink-0 text-primary/75",
					"aria-hidden": "true"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("block line-clamp-2 break-words", latestComment ? "text-foreground" : "text-muted-foreground"),
						children: preview
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "mt-1 block text-[11px] font-semibold uppercase tracking-wide text-primary opacity-0 transition group-hover:opacity-100",
						children: "Follow-up"
					})]
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
			align: "start",
			className: "w-[min(20rem,calc(100vw-2rem))] rounded-lg p-3 shadow-lg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
						children: "Steno / Follow-up Comment"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						placeholder: "currently portal itself is not allowing for musterrolle to be generated...",
						className: "min-h-28 resize-none text-sm leading-relaxed",
						autoFocus: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							size: "sm",
							onClick: handleCancel,
							disabled: saving,
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							size: "sm",
							onClick: handleSave,
							disabled: saving || !draft.trim(),
							children: saving ? "Saving..." : "Save"
						})]
					})
				]
			})
		})]
	});
}
function TaskMeta({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-w-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-1 break-words font-medium",
			children: value
		})]
	});
}
function TaskActions({ task, assignee, assigneeProfile, assignedBy, onEdit, onScheduleMeeting, onExtendDeadline, onFieldVisit, onComplete, onMarkImportant, onPin, onDelete, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex flex-wrap justify-end gap-1", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WhatsAppActionButton, {
				className: "h-9 w-9 sm:h-8 sm:w-8",
				phone: assigneeProfile?.phone,
				message: buildTaskWhatsAppMessage({
					officerName: assignee,
					taskTitle: task.title,
					taskDescription: task.description || "No description added.",
					dueDate: formatDate(task.due_date),
					priority: priorityLabels[task.priority],
					status: statusLabels[task.status],
					assignedBy
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Edit",
				icon: Pencil,
				onClick: () => onEdit(task)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Schedule Task Meeting",
				icon: CalendarDays,
				onClick: () => onScheduleMeeting(task)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeadlineAction, {
				task,
				onSave: (dueDate) => onExtendDeadline(task, dueDate)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Add to Field Visit Notepad",
				icon: MapPin,
				onClick: () => onFieldVisit(task)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Complete",
				icon: Check,
				onClick: () => onComplete(task)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Mark Important",
				icon: Flag,
				onClick: () => onMarkImportant(task)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Pin Task",
				icon: Pin,
				onClick: onPin
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IconAction, {
				label: "Delete",
				icon: Trash2,
				destructive: true,
				onClick: () => onDelete(task)
			})
		]
	});
}
function IconAction({ label, icon: Icon, destructive, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
		size: "icon",
		variant: "ghost",
		"aria-label": label,
		title: label,
		onClick,
		className: cn("h-9 w-9 sm:h-8 sm:w-8", destructive && "text-destructive hover:text-destructive"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
	});
}
function DeadlineAction({ task, onSave }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [date, setDate] = (0, import_react.useState)(task.due_date ?? "");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const saveDeadline = async () => {
		setSaving(true);
		try {
			await onSave(date);
			setOpen(false);
		} finally {
			setSaving(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "icon",
				variant: "ghost",
				"aria-label": "Extend Deadline",
				title: "Extend Deadline",
				className: "h-9 w-9 text-muted-foreground hover:text-primary sm:h-8 sm:w-8",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "h-4 w-4" })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverContent, {
			align: "end",
			className: "w-[calc(100vw-2rem)] max-w-72 rounded-2xl p-5 shadow-2xl",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground",
						children: "Extend Deadline"
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "date",
						value: date,
						onChange: (event) => setDate(event.target.value),
						className: "h-12 rounded-xl text-base"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							className: "h-11 rounded-xl",
							onClick: () => setOpen(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							className: "h-11 rounded-xl shadow-elevated",
							disabled: saving,
							onClick: saveDeadline,
							children: saving ? "Saving..." : "Save"
						})]
					})
				]
			})
		})]
	});
}
function FieldLabel({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
		className: "text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground",
		children
	});
}
function ScheduleMeetingSheet({ task, assignee, assigneeProfile, department, departmentOptions, currentUserId, open, onOpenChange, onSaved }) {
	const today = format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
	const [form, setForm] = (0, import_react.useState)({
		title: "",
		date: today,
		time: "10:00",
		duration: "30m",
		department: "None (General)",
		venue: "",
		meetingWith: "",
		message: ""
	});
	(0, import_react.useEffect)(() => {
		if (!task) return;
		const taskDate = task.due_date ?? today;
		const meetingWith = assignee === "Unassigned" ? "" : assignee;
		const message = `Meeting to be scheduled with ${meetingWith || "assigned officer"} on ${formatDate(taskDate, "d MMMM yyyy")} at 10:00 AM on task "${task.title}"`;
		setForm({
			title: task.title,
			date: taskDate,
			time: "10:00",
			duration: "30m",
			department: department || assigneeProfile?.department || "None (General)",
			venue: "",
			meetingWith,
			message
		});
	}, [
		task,
		assignee,
		assigneeProfile,
		department
	]);
	const handleSave = async () => {
		if (!task) return;
		const cleanDepartment = form.department === "None (General)" ? null : form.department;
		const description = [
			PLANNER_MEETING_TYPE_LINE,
			task.description ? `Task: ${task.description}` : `Task: ${task.title}`,
			form.duration ? `Duration: ${form.duration}` : "",
			form.venue ? `Venue: ${form.venue}` : "",
			form.meetingWith ? `Meeting With: ${form.meetingWith}` : "",
			form.message ? `Message: ${form.message}` : "",
			`Source Task ID: ${task.id}`
		].filter(Boolean).join("\n");
		const payload = {
			title: form.title.trim() || task.title,
			description,
			scheduled_date: form.date,
			due_date: form.date,
			due_time: form.time || null,
			department: cleanDepartment,
			assignee_id: task.assignee_id,
			status: "in_progress",
			priority: "medium",
			calendar_sync_enabled: false
		};
		try {
			const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
			if (sessionError) throw sessionError;
			const createdBy = sessionData.session?.user.id ?? currentUserId;
			if (!createdBy) throw new Error("Please sign in before saving planner meetings.");
			const { error } = await supabase.from("tasks").insert({
				...payload,
				created_by: createdBy
			});
			if (error) throw error;
			await onSaved();
			toast.success("Department meeting added to planner");
			onOpenChange(false);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Meeting save failed");
		}
	};
	const handleWhatsApp = () => {
		if (!assigneeProfile?.phone) {
			toast.error("Assigned officer does not have a valid WhatsApp mobile number.");
			return;
		}
		const url = buildWhatsAppUrl(assigneeProfile.phone, form.message);
		if (!url) {
			toast.error("Assigned officer does not have a valid WhatsApp mobile number.");
			return;
		}
		window.open(url, "_blank", "noopener,noreferrer");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			className: "max-h-dvh w-full overflow-y-auto p-0 sm:max-w-xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, {
				className: "border-b bg-primary-muted/40 px-4 py-5 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: "Schedule Task Meeting" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetDescription, { children: "Create a planner slot from this row" })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-5 px-4 py-5 sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Title" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.title,
							onChange: (event) => setForm({
								...form,
								title: event.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Date" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: form.date,
								onChange: (event) => setForm({
									...form,
									date: event.target.value
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Time" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "time",
								value: form.time,
								onChange: (event) => setForm({
									...form,
									time: event.target.value
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Duration" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.duration,
								onValueChange: (value) => setForm({
									...form,
									duration: value
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
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
										value: "60m",
										children: "60m"
									})
								] })]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Department" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.department,
								onValueChange: (value) => setForm({
									...form,
									department: value
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
									"None (General)",
									...departmentOptions,
									department
								].filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).map((value) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value,
									children: value
								}, value)) })]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Venue" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.venue,
							onChange: (event) => setForm({
								...form,
								venue: event.target.value
							}),
							placeholder: "Meeting room / location"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Meeting With" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.meetingWith,
								onChange: (event) => setForm({
									...form,
									meetingWith: event.target.value
								}),
								placeholder: "Officer name"
							}),
							assigneeProfile?.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: ["Recipient mobile: ", assigneeProfile.phone]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Message Draft" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: form.message,
							onChange: (event) => setForm({
								...form,
								message: event.target.value
							}),
							rows: 5
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 sm:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							className: "h-11",
							onClick: handleWhatsApp,
							children: "Send WhatsApp"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							className: "h-11 shadow-elevated",
							onClick: handleSave,
							children: "Schedule Meeting"
						})]
					})
				]
			})]
		})
	});
}
function agencyFor(task) {
	return task.department ? `${task.department} Agency` : "District Administration";
}
function formatDate(value, pattern = "MMM d, yyyy") {
	const date = safeParseDate(value);
	if (!date) return "Not set";
	return format(date, pattern);
}
function statusLabelForDisplay(status) {
	return {
		pending: "Pending",
		in_progress: "In Progress",
		completed: "Completed",
		overdue: "Overdue"
	}[status];
}
function downloadExcelWorkbook(rows, fileName) {
	const headers = [
		["sno", "S.No"],
		["task_number", "Task No"],
		["title", "Task"],
		["description", "Description"],
		["agency", "Agency"],
		["department", "Department"],
		["assignee", "Assigned To"],
		["assigned_by", "Assigned By"],
		["allocated_date", "Allocated Date"],
		["due_date", "Deadline"],
		["scheduled_date", "Scheduled Date"],
		["status", "Status"],
		["priority", "Priority"],
		["comments", "Comments"]
	];
	const workbook = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
    th { background: #4f2fd6; color: #ffffff; font-weight: 700; }
    th, td { border: 1px solid #d9dce7; padding: 6px 8px; vertical-align: top; }
    td { mso-number-format: "\\@"; }
  </style>
</head>
<body>
  <table>
    <thead><tr>${headers.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((row) => `<tr>${headers.map(([key]) => `<td>${escapeHtml(row[key] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody>
  </table>
</body>
</html>`;
	const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
function escapeHtml(value) {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function safeParseDate(value) {
	if (!value) return null;
	const date = parseISO(value);
	return Number.isNaN(date.getTime()) ? null : date;
}
function isDateToday(value) {
	const date = safeParseDate(value);
	return date ? isToday(date) : false;
}
function isDatePast(value) {
	const date = safeParseDate(value);
	return date ? isPast(date) && !isToday(date) : false;
}
function timeForSort(value, fallback) {
	const date = safeParseDate(value);
	return date ? date.getTime() : fallback;
}
function commentsFor(task) {
	if (task.status === "blocked") return "Needs review";
	if (task.priority === "urgent") return "Marked important";
	if (task.completed_at) return "Completion updated";
	return "No comments";
}
function displayStatusFor(task) {
	if (task.status === "done") return "completed";
	if (task.status === "in_progress") return "in_progress";
	if (task.status === "blocked") return "overdue";
	if (isDatePast(task.due_date)) return "overdue";
	return "pending";
}
function sortTasks(a, b, sortMode) {
	if (sortMode === "deadline") return timeForSort(a.due_date, Number.MAX_SAFE_INTEGER) - timeForSort(b.due_date, Number.MAX_SAFE_INTEGER);
	if (sortMode === "priority") {
		const weights = {
			urgent: 0,
			high: 1,
			medium: 2,
			low: 3
		};
		return (weights[a.priority] ?? 99) - (weights[b.priority] ?? 99);
	}
	return timeForSort(b.created_at, 0) - timeForSort(a.created_at, 0);
}
async function syncTaskSafely(taskId, retry = false) {
	try {
		await syncTaskCalendar(taskId, retry);
		toast.success("Google Calendar synced");
	} catch (error) {
		toast.error(error instanceof Error ? error.message : "Google Calendar sync failed");
	}
}
async function logTaskAudit(taskId, actorId, action, metadata) {
	const modernPayload = {
		task_id: taskId,
		action_type: action,
		old_value: null,
		new_value: metadata,
		performed_by: actorId
	};
	const modern = await supabase.from("task_audit_logs").insert(modernPayload);
	if (!modern.error) return;
	const withoutTask = await supabase.from("task_audit_logs").insert({
		...modernPayload,
		task_id: null
	});
	if (!withoutTask.error) return;
	console.warn("[Task Audit] modern audit insert failed, trying legacy shape", modern.error, withoutTask.error);
	const legacy = await supabase.from("task_audit_logs").insert({
		task_id: taskId,
		actor_id: actorId,
		action,
		metadata
	});
	if (legacy.error) console.warn("[Task Audit] legacy audit insert failed", legacy.error);
}
//#endregion
export { TasksManagementPage as component };
