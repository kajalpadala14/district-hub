import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { a as useTasks, i as useProfiles, n as useDepartments, o as useUserRoles, t as Badge } from "./useData-DHwf5NYf.mjs";
import { n as CardContent, t as Card } from "./card-C5Nmk_bj.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-BcaWptOW.mjs";
import { _ as Plus, c as Trash2, g as RefreshCw, h as Search, y as Pencil } from "../_libs/lucide-react.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DamjaduW.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-uzm9g8Y7.mjs";
import { n as isDashboardUserProfile, r as usernameFromProfile } from "./profileClassification-qLmYHp_o.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, s as Label, t as Dialog } from "./label-ymT1GZwO.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/employees-Dt7E4S2l.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function EmployeesPage() {
	const { profiles, refresh } = useProfiles();
	const roles = useUserRoles();
	const { tasks } = useTasks();
	const { departments, refresh: refreshDepartments } = useDepartments();
	const [query, setQuery] = (0, import_react.useState)("");
	const [departmentFilter, setDepartmentFilter] = (0, import_react.useState)("all");
	const [dialogOpen, setDialogOpen] = (0, import_react.useState)(false);
	const [departmentsOpen, setDepartmentsOpen] = (0, import_react.useState)(false);
	const [editing, setEditing] = (0, import_react.useState)(null);
	const roleByUserId = (0, import_react.useMemo)(() => new Map(roles.map((role) => [role.user_id, role.role])), [roles]);
	const employeeProfiles = (0, import_react.useMemo)(() => profiles.filter((profile) => !isDashboardUserProfile(profile, roleByUserId.get(profile.id))), [profiles, roleByUserId]);
	(0, import_react.useEffect)(() => {
		if (new URLSearchParams(window.location.search).get("manage") === "departments") setDepartmentsOpen(true);
	}, []);
	const departmentNames = (0, import_react.useMemo)(() => departments.map((department) => department.name), [departments]);
	const departmentUsage = (0, import_react.useMemo)(() => {
		const counts = /* @__PURE__ */ new Map();
		const ensure = (name) => {
			const key = name.toLowerCase();
			const existing = counts.get(key);
			if (existing) return existing;
			const next = {
				employees: 0,
				tasks: 0,
				planner: 0
			};
			counts.set(key, next);
			return next;
		};
		for (const profile of employeeProfiles) if (profile.department) ensure(profile.department).employees += 1;
		for (const task of tasks) {
			if (!task.department) continue;
			const usage = ensure(task.department);
			usage.tasks += 1;
			if (task.scheduled_date || task.due_date) usage.planner += 1;
		}
		return counts;
	}, [employeeProfiles, tasks]);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		return employeeProfiles.filter((profile) => {
			if (departmentFilter !== "all" && profile.department !== departmentFilter) return false;
			if (!q) return true;
			return [
				profile.full_name ?? "",
				profile.email ?? "",
				profile.phone ?? "",
				profile.job_title ?? "",
				profile.department ?? ""
			].some((value) => value.toLowerCase().includes(q));
		}).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
	}, [
		employeeProfiles,
		query,
		departmentFilter
	]);
	const openAdd = () => {
		setEditing(null);
		setDialogOpen(true);
	};
	const openEdit = (profile) => {
		setEditing(profile);
		setDialogOpen(true);
	};
	const handleDelete = async (profile) => {
		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			toast.error("Please sign in before deleting employees.");
			return;
		}
		const { error } = await supabase.from("profiles").delete().eq("id", profile.id);
		if (error) toast.error(error.message);
		else {
			await refresh();
			toast.success("Employee removed");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-semibold tracking-tight",
					children: "Employees"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Manage personnel for task assignment"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						className: "w-fit",
						onClick: () => setDepartmentsOpen(true),
						children: "Manage Departments"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "w-fit shadow-elevated",
						onClick: openAdd,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), "Add Employee"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "rounded-xl shadow-elevated",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_36px]",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
									className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
									"aria-hidden": "true"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									"aria-label": "Search employees",
									placeholder: "Search by name, username, or mobile...",
									value: query,
									onChange: (event) => setQuery(event.target.value),
									className: "pl-9"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: departmentFilter,
								onValueChange: setDepartmentFilter,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "All Departments" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: "all",
									children: "All Departments"
								}), departmentNames.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: department,
									children: department
								}, department))] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								"aria-label": "Refresh employees",
								onClick: async () => {
									await refresh();
									toast.success("Employee list refreshed");
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4" })
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "overflow-hidden rounded-xl shadow-elevated",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, {
							className: "min-w-[900px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
								className: "bg-muted/35 hover:bg-muted/35",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
										className: "w-[28%]",
										children: "Name"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Display Username" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Mobile" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Department" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
										className: "text-right",
										children: "Actions"
									})
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								colSpan: 5,
								className: "py-12 text-center text-sm text-muted-foreground",
								children: "No employees found."
							}) }), filtered.map((profile) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
								className: "h-14",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
										className: "font-semibold",
										children: profile.full_name || profile.email
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
										className: "text-sm",
										children: profile.job_title || displayUsername(profile)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
										className: "text-sm text-muted-foreground",
										children: profile.phone || "--"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: profile.department ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "bg-primary/10 text-primary hover:bg-primary/10",
										children: profile.department
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm text-muted-foreground",
										children: "--"
									}) }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-end gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											"aria-label": "Edit employee",
											onClick: () => openEdit(profile),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											"aria-label": "Delete employee",
											className: "text-destructive hover:text-destructive",
											onClick: () => handleDelete(profile),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
										})]
									}) })
								]
							}, profile.id))] })]
						})
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmployeeDialog, {
				open: dialogOpen,
				onOpenChange: setDialogOpen,
				employee: editing,
				departments: departmentNames,
				onSaved: refresh
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepartmentsDialog, {
				open: departmentsOpen,
				onOpenChange: setDepartmentsOpen,
				departments,
				usage: departmentUsage,
				onViewEmployees: (department) => {
					setDepartmentFilter(department);
					setDepartmentsOpen(false);
				},
				onSaved: async () => {
					await refreshDepartments();
					await refresh();
				}
			})
		]
	});
}
function DepartmentsDialog({ open, onOpenChange, departments, usage, onViewEmployees, onSaved }) {
	const [name, setName] = (0, import_react.useState)("");
	const [editing, setEditing] = (0, import_react.useState)(null);
	const totalUsage = (0, import_react.useMemo)(() => departments.reduce((sum, department) => sum + totalDepartmentUsage(usageForDepartment(usage, department.name)), 0), [departments, usage]);
	(0, import_react.useEffect)(() => {
		setName(editing?.name ?? "");
	}, [editing]);
	const reset = () => {
		setName("");
		setEditing(null);
	};
	const saveDepartment = async (event) => {
		event.preventDefault();
		const clean = name.trim().replace(/\s+/g, " ");
		if (!clean) {
			toast.error("Department name is required");
			return;
		}
		if (departments.some((department) => department.id !== editing?.id && department.name.toLowerCase() === clean.toLowerCase())) {
			toast.error("Department already exists");
			return;
		}
		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			toast.error("Please sign in before saving departments.");
			return;
		}
		const { error } = await (editing ? supabase.from("departments").update({ name: clean }).eq("id", editing.id) : supabase.from("departments").insert({ name: clean }));
		if (error) {
			toast.error(error.message);
			return;
		}
		await onSaved();
		toast.success(editing ? "Department updated" : "Department added");
		reset();
	};
	const removeDepartment = async (department) => {
		if (totalDepartmentUsage(usageForDepartment(usage, department.name)) > 0) {
			toast.error("This department is in use. Move employees/tasks first, then delete.");
			return;
		}
		const { data: sessionData } = await supabase.auth.getSession();
		if (!sessionData.session) {
			toast.error("Please sign in before deleting departments.");
			return;
		}
		const { error } = await supabase.from("departments").delete().eq("id", department.id);
		if (error) toast.error(error.message);
		else {
			await onSaved();
			toast.success("Department removed");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-md",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, {
					className: "border-b bg-background px-6 py-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Manage Departments" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Add departments used by employees, tasks, and planner entries." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "shrink-0 rounded-lg bg-primary/10 px-3 py-2 text-right",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xl font-semibold tabular-nums",
								children: departments.length
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
								children: "Departments"
							})]
						})]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4 px-6 py-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid gap-2 sm:grid-cols-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepartmentStat, {
									label: "Total",
									value: departments.length
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepartmentStat, {
									label: "Employees",
									value: sumDepartmentUsage(usage, "employees")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepartmentStat, {
									label: "Tasks",
									value: sumDepartmentUsage(usage, "tasks")
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DepartmentStat, {
									label: "Planner",
									value: sumDepartmentUsage(usage, "planner")
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: saveDepartment,
							className: "grid gap-2 sm:grid-cols-[1fr_auto]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: name,
								onChange: (event) => setName(event.target.value),
								placeholder: "Department name",
								className: "bg-background"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								children: editing ? "Save" : "Add"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "max-h-80 space-y-2 overflow-y-auto pr-1",
							children: [departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border bg-background p-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm font-semibold",
											children: department.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-2 flex flex-wrap gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageBadge, {
													label: "Employees",
													value: usageForDepartment(usage, department.name).employees
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageBadge, {
													label: "Tasks",
													value: usageForDepartment(usage, department.name).tasks
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageBadge, {
													label: "Planner",
													value: usageForDepartment(usage, department.name).planner
												})
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex shrink-0 gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "ghost",
											size: "icon",
											"aria-label": "Edit department",
											onClick: () => setEditing(department),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "ghost",
											size: "icon",
											"aria-label": "Delete department",
											className: "text-destructive hover:text-destructive",
											onClick: () => removeDepartment(department),
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 flex flex-wrap gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											size: "sm",
											variant: "outline",
											onClick: () => onViewEmployees(department.name),
											children: "Employees"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
												to: "/tasks",
												search: { department: department.name },
												children: "Tasks"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											size: "sm",
											variant: "outline",
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
												to: "/planner",
												children: "Planner"
											})
										})
									]
								})]
							}, department.id)), departments.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground",
								children: "No departments added yet."
							})]
						}),
						totalUsage > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground",
							children: "Delete is blocked while a department is used by employees, tasks, or planner entries."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, {
					className: "border-t bg-background px-6 py-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "outline",
						onClick: () => {
							reset();
							onOpenChange(false);
						},
						children: "Done"
					})
				})
			]
		})
	});
}
function DepartmentStat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border bg-background px-3 py-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-lg font-semibold tabular-nums",
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
			children: label
		})]
	});
}
function UsageBadge({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
		variant: "secondary",
		className: "bg-muted text-muted-foreground hover:bg-muted",
		children: [
			label,
			": ",
			value
		]
	});
}
function usageForDepartment(usage, department) {
	return usage.get(department.toLowerCase()) ?? {
		employees: 0,
		tasks: 0,
		planner: 0
	};
}
function totalDepartmentUsage(usage) {
	return usage.employees + usage.tasks + usage.planner;
}
function sumDepartmentUsage(usage, key) {
	return Array.from(usage.values()).reduce((sum, item) => sum + item[key], 0);
}
function EmployeeDialog({ open, onOpenChange, employee, departments, onSaved }) {
	const [form, setForm] = (0, import_react.useState)({
		full_name: "",
		email: "",
		phone: "",
		job_title: "",
		department: ""
	});
	(0, import_react.useEffect)(() => {
		setForm({
			full_name: employee?.full_name ?? "",
			email: employee?.email ?? "",
			phone: employee?.phone ?? "",
			job_title: employee?.job_title ?? "",
			department: employee?.department ?? ""
		});
	}, [employee, open]);
	const submit = async (event) => {
		event.preventDefault();
		const name = form.full_name.trim();
		const phone = form.phone.replace(/\D/g, "");
		const username = form.job_title.trim();
		if (!name) {
			toast.error("Employee name is required");
			return;
		}
		if (phone && phone.length !== 10) {
			toast.error("Enter a valid 10-digit mobile number");
			return;
		}
		const payload = {
			id: employee?.id ?? crypto.randomUUID(),
			full_name: name,
			email: form.email || emailForEmployee(name, username),
			phone: phone || null,
			job_title: username || null,
			department: form.department || null
		};
		const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
		if (sessionError) {
			toast.error(sessionError.message);
			return;
		}
		if (!sessionData.session) {
			toast.error("Please sign in before saving employees.");
			return;
		}
		if (!employee) {
			const { error } = await supabase.from("profiles").insert(payload);
			if (error) {
				toast.error(error.message);
				return;
			}
			await onSaved();
			toast.success("Employee added");
			onOpenChange(false);
			return;
		}
		const { error } = await supabase.from("profiles").update(payload).eq("id", employee.id);
		if (error) toast.error(error.message);
		else {
			await onSaved();
			toast.success("Employee updated");
			onOpenChange(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "overflow-hidden border-0 bg-muted p-0 shadow-2xl sm:max-w-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
				className: "px-6 pt-6 text-xl",
				children: employee ? "Edit Employee" : "New Employee"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
				className: "sr-only",
				children: employee ? "Update personnel details for task assignment." : "Add employee details to the personnel register."
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-4 px-6 pb-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
							htmlFor: "employee-name",
							children: "Name *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "employee-name",
							value: form.full_name,
							onChange: (event) => setForm({
								...form,
								full_name: event.target.value
							}),
							placeholder: "Employee Full Name",
							className: "bg-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
							htmlFor: "employee-phone",
							children: "Mobile Number *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "employee-phone",
							value: form.phone,
							onChange: (event) => setForm({
								...form,
								phone: event.target.value
							}),
							placeholder: "10-digit mobile number",
							className: "bg-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, {
							htmlFor: "employee-username",
							children: "Display Username *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "employee-username",
							value: form.job_title,
							onChange: (event) => setForm({
								...form,
								job_title: event.target.value
							}),
							placeholder: "Username",
							className: "bg-background"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FieldLabel, { children: "Department (Optional)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: form.department || "none",
							onValueChange: (value) => setForm({
								...form,
								department: value === "none" ? "" : value
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "bg-background",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Select department" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "none",
								children: "None"
							}), departments.map((department) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: department,
								children: department
							}, department))] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
						className: "grid grid-cols-2 gap-2 pt-2 sm:space-x-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "button",
							variant: "outline",
							className: "h-11",
							onClick: () => onOpenChange(false),
							children: "Cancel"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "h-11",
							children: employee ? "Save Changes" : "Add Employee"
						})]
					})
				]
			})]
		})
	});
}
function displayUsername(profile) {
	return usernameFromProfile(profile);
}
function emailForEmployee(name, username) {
	return `${(username || name).toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "") || crypto.randomUUID()}@local.employee`;
}
function FieldLabel({ children, htmlFor }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
		htmlFor,
		className: "text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground",
		children
	});
}
//#endregion
export { EmployeesPage as component };
