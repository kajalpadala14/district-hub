import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { r as cn, t as Button } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { D as Lock, U as CalendarDays, a as UserPlus, i as User, x as Moon } from "../_libs/lucide-react.mjs";
import { _ as useNavigate, m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Input } from "./input-uzm9g8Y7.mjs";
import { t as AUTH_USERNAME_DOMAIN } from "./profileClassification-qLmYHp_o.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-CKKZwlLI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var $$splitComponentImporter = () => import("./route-BPYBHTeT.mjs");
var USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/;
var Route = createFileRoute("/_authenticated")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
function LoginScreen() {
	const navigate = useNavigate();
	const [mode, setMode] = (0, import_react.useState)("login");
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [username, setUsername] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)(null);
	const [message, setMessage] = (0, import_react.useState)(null);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const [todayLabel, setTodayLabel] = (0, import_react.useState)("");
	const [currentYear, setCurrentYear] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const today = /* @__PURE__ */ new Date();
		setTodayLabel(new Intl.DateTimeFormat("en-US", {
			weekday: "long",
			month: "long",
			day: "numeric",
			year: "numeric"
		}).format(today));
		setCurrentYear(String(today.getFullYear()));
	}, []);
	(0, import_react.useEffect)(() => {
		const { data } = supabase.auth.onAuthStateChange((event, session) => {
			if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) navigate({
				to: "/dashboard",
				replace: true
			});
		});
		return () => data.subscription.unsubscribe();
	}, [navigate]);
	const submit = async (event) => {
		event.preventDefault();
		setError(null);
		setMessage(null);
		setSubmitting(true);
		try {
			const normalizedUsername = normalizeUsername(username);
			if (!USERNAME_PATTERN.test(normalizedUsername)) throw new Error("Username single word hona chahiye. Sirf letters, numbers, _ ya - use karein.");
			const authEmail = emailForUsername(normalizedUsername);
			if (mode === "create") {
				const { data, error: signUpError } = await supabase.auth.signUp({
					email: authEmail,
					password,
					options: { data: {
						full_name: fullName.trim() || normalizedUsername,
						username: normalizedUsername
					} }
				});
				if (signUpError) throw signUpError;
				if (data.user && !data.session) setMessage("User created. Please confirm the email, then sign in.");
				else setMessage("User created successfully.");
				return;
			}
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: authEmail,
				password
			});
			if (signInError) throw signInError;
		} catch (authError) {
			setError(authError instanceof Error ? authError.message : "Authentication failed");
		} finally {
			setSubmitting(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid min-h-dvh bg-background lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative flex min-h-[42dvh] flex-col items-center justify-center overflow-hidden bg-[#392896] px-6 py-10 text-center text-white lg:min-h-dvh",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative flex max-w-md flex-col items-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-18 w-18 items-center justify-center rounded-xl bg-white/18 text-3xl font-extrabold shadow-2xl ring-1 ring-white/20",
						children: "DA"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-5 text-xl font-semibold uppercase tracking-wide text-white/90",
						children: "District Administration"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "mt-16 text-6xl font-extrabold leading-[0.96] tracking-tight sm:text-7xl",
						children: [
							"Task",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"Dashboard"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "mt-8 h-1 w-28 rounded-full bg-violet-300/80" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-8 text-xl font-semibold leading-8 text-white/82",
						children: [
							"Centralized task monitoring &",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"management portal"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-14 inline-flex items-center gap-4 rounded-full border border-white/20 bg-white/12 px-9 py-4 text-lg font-bold shadow-xl backdrop-blur",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarDays, { className: "h-6 w-6 text-violet-100" }), todayLabel || "Loading date"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-14 text-sm font-medium text-white/50",
						children: [
							"© ",
							currentYear || "2026",
							" District Administration"
						]
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-10 dark:bg-slate-950",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				size: "icon",
				"aria-label": "Toggle dark mode",
				className: "absolute right-8 top-8 h-11 w-11 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300",
				onClick: () => {
					const next = !document.documentElement.classList.contains("dark");
					document.documentElement.classList.toggle("dark", next);
					window.localStorage.setItem("governance-theme", next ? "dark" : "light");
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-5 w-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "w-full max-w-xl",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white",
						children: mode === "login" ? "Welcome Back" : "Create User"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-2xl text-slate-500",
						children: mode === "login" ? "Please sign in to continue." : "Create a new dashboard account."
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-10 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: cn("h-11 rounded-xl text-sm font-bold transition", mode === "login" ? "bg-white text-primary shadow-sm dark:bg-slate-800" : "text-slate-500"),
							onClick: () => {
								setMode("login");
								setError(null);
								setMessage(null);
							},
							children: "Login"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: cn("h-11 rounded-xl text-sm font-bold transition", mode === "create" ? "bg-white text-primary shadow-sm dark:bg-slate-800" : "text-slate-500"),
							onClick: () => {
								setMode("create");
								setError(null);
								setMessage(null);
							},
							children: "Create User"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: submit,
						className: "mt-10 space-y-7",
						children: [
							mode === "create" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
								label: "Full Name",
								icon: User,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "text",
									autoComplete: "name",
									placeholder: "District Admin",
									value: fullName,
									onChange: (event) => setFullName(event.target.value),
									className: "h-19 border-0 bg-transparent pl-14 text-xl shadow-none focus-visible:ring-0"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
								label: "Username",
								icon: User,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "text",
									autoComplete: "username",
									placeholder: "user",
									value: username,
									onChange: (event) => setUsername(event.target.value),
									className: "h-19 border-0 bg-transparent pl-14 text-xl shadow-none focus-visible:ring-0",
									pattern: "[A-Za-z0-9_-]{3,32}",
									title: "Single word username: letters, numbers, underscore or dash only",
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthField, {
								label: "Password",
								icon: Lock,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "password",
									autoComplete: mode === "login" ? "current-password" : "new-password",
									placeholder: "••••••••",
									value: password,
									onChange: (event) => setPassword(event.target.value),
									className: "h-19 border-0 bg-transparent pl-14 text-xl shadow-none focus-visible:ring-0",
									minLength: 6,
									required: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-4 text-base",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-medium text-primary",
									children: "Need a hint?"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "font-medium text-slate-500",
									children: "Forgot Password?"
								})]
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive",
								children: error
							}),
							message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700",
								children: message
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								className: "h-18 w-full rounded-xl bg-[#4833d4] text-xl font-extrabold shadow-2xl hover:bg-[#3d2bc0]",
								disabled: submitting,
								children: submitting ? "Please wait..." : mode === "login" ? "Sign In" : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "h-5 w-5" }), "Create User"] })
							})
						]
					})
				]
			})]
		})]
	});
}
function AuthField({ label, icon: Icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "block",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-lg font-extrabold text-slate-950 dark:text-white",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "relative mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-[#eaf1ff] shadow-sm focus-within:ring-2 focus-within:ring-primary/30 dark:border-slate-800 dark:bg-slate-900",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "absolute left-6 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400" }), children]
		})]
	});
}
function normalizeUsername(value) {
	return value.trim().toLowerCase();
}
function emailForUsername(username) {
	return `${username}@${AUTH_USERNAME_DOMAIN}`;
}
//#endregion
export { Route as n, LoginScreen as t };
