import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Button } from "./button-PwNqyxv_.mjs";
import { i as useProfiles, o as useUserRoles, t as Badge } from "./useData-DHwf5NYf.mjs";
import { n as CardContent, t as Card } from "./card-C5Nmk_bj.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-BcaWptOW.mjs";
import { g as RefreshCw, h as Search, p as ShieldCheck } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-uzm9g8Y7.mjs";
import { n as isDashboardUserProfile, r as usernameFromProfile } from "./profileClassification-qLmYHp_o.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/users-CwAEuz_G.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function UsersPage() {
	const { profiles, refresh } = useProfiles();
	const roles = useUserRoles();
	const [query, setQuery] = (0, import_react.useState)("");
	const roleByUserId = (0, import_react.useMemo)(() => new Map(roles.map((role) => [role.user_id, role.role])), [roles]);
	const users = (0, import_react.useMemo)(() => {
		const byEmail = /* @__PURE__ */ new Map();
		for (const profile of profiles) {
			if (!isDashboardUserProfile(profile, roleByUserId.get(profile.id))) continue;
			const key = profile.email.toLowerCase();
			const existing = byEmail.get(key);
			if (!existing || profile.created_at > existing.created_at) byEmail.set(key, profile);
		}
		return Array.from(byEmail.values()).sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
	}, [profiles, roleByUserId]);
	const filtered = (0, import_react.useMemo)(() => {
		const q = query.trim().toLowerCase();
		if (!q) return users;
		return users.filter((profile) => [
			profile.full_name ?? "",
			usernameFromProfile(profile),
			profile.email,
			profile.job_title ?? "",
			roleByUserId.get(profile.id) ?? ""
		].some((value) => value.toLowerCase().includes(q)));
	}, [
		query,
		roleByUserId,
		users
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-3xl font-semibold tracking-tight",
					children: "Users"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: "Manage dashboard login users separately from employees"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					className: "w-fit",
					onClick: async () => {
						await refresh();
						toast.success("User list refreshed");
					},
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-4 w-4" }), "Refresh"]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "rounded-xl shadow-elevated",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, {
					className: "p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, {
							className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							"aria-label": "Search users",
							placeholder: "Search by name, username, or role...",
							value: query,
							onChange: (event) => setQuery(event.target.value),
							className: "pl-9"
						})]
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
							className: "min-w-[820px]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
								className: "bg-muted/35 hover:bg-muted/35",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
										className: "w-[30%]",
										children: "Name"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Username" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Role" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Department" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Status" })
								]
							}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableBody, { children: [filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableRow, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
								colSpan: 5,
								className: "py-12 text-center text-sm text-muted-foreground",
								children: "No users found."
							}) }), filtered.map((profile) => {
								const role = roleByUserId.get(profile.id);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, {
									className: "h-14",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "font-semibold",
											children: profile.full_name || usernameFromProfile(profile)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "text-sm",
											children: usernameFromProfile(profile)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "secondary",
											className: "capitalize",
											children: role ?? profile.job_title ?? "user"
										}) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
											className: "text-sm text-muted-foreground",
											children: profile.department || "--"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4" }), "Active"]
										}) })
									]
								}, profile.id);
							})] })]
						})
					})
				})
			})
		]
	});
}
//#endregion
export { UsersPage as component };
