import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { A as redirect, c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Route$8 } from "./route-CKKZwlLI.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-Y2WGi7sV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-DyEhebvK.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	window.__lovableReportRuntimeError?.({
		message,
		stack: error instanceof Error ? error.stack : void 0,
		filename: window.location.pathname
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	const message = error instanceof Error ? error.message : String(error);
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", {
					className: "mt-4 max-h-32 overflow-auto rounded-md border bg-muted px-3 py-2 text-left text-xs text-muted-foreground",
					children: message
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$7 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "District Governance Portal — Task Management" },
			{
				name: "description",
				content: "Modern governance task management for district administration: tasks, weekly planner, analytics, and team management."
			},
			{
				property: "og:title",
				content: "District Governance Portal"
			},
			{
				property: "og:description",
				content: "Task management, weekly planner and analytics for public administration teams."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "icon",
				href: "/favicon-32.png",
				type: "image/png",
				sizes: "32x32"
			},
			{
				rel: "icon",
				href: "/favicon-16.png",
				type: "image/png",
				sizes: "16x16"
			},
			{
				rel: "apple-touch-icon",
				href: "/apple-touch-icon.png",
				sizes: "180x180"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$7.useRouteContext();
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		let unsub;
		import("./client-Cisra8gy.mjs").then((n) => n.t).then((n) => n.t).then(({ supabase }) => {
			const { data } = supabase.auth.onAuthStateChange((event) => {
				if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
				router.invalidate();
				if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
			});
			unsub = () => data.subscription.unsubscribe();
		});
		return () => unsub?.();
	}, [queryClient, router]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {})
	});
}
var $$splitComponentImporter$6 = () => import("./routes-C9M5nQpK.mjs");
var Route$6 = createFileRoute("/")({
	ssr: false,
	beforeLoad: async () => {
		const { data } = await supabase.auth.getSession();
		if (data.session?.user) throw redirect({ to: "/dashboard" });
	},
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./users-CwAEuz_G.mjs");
var Route$5 = createFileRoute("/_authenticated/users")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./tasks-DDGdeW3C.mjs");
var Route$4 = createFileRoute("/_authenticated/tasks")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./planner-DYIOdmHS.mjs");
var Route$3 = createFileRoute("/_authenticated/planner")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./employees-Dt7E4S2l.mjs");
var Route$2 = createFileRoute("/_authenticated/employees")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./dashboard-BgCtoNb-.mjs");
var Route$1 = createFileRoute("/_authenticated/dashboard")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./analytics-DUwGGlMe.mjs");
var Route = createFileRoute("/_authenticated/analytics")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var AuthenticatedRouteRoute = Route$8.update({
	id: "/_authenticated",
	getParentRoute: () => Route$7
});
var IndexRoute = Route$6.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$7
});
var AuthenticatedUsersRoute = Route$5.update({
	id: "/users",
	path: "/users",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTasksRoute = Route$4.update({
	id: "/tasks",
	path: "/tasks",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedPlannerRoute = Route$3.update({
	id: "/planner",
	path: "/planner",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedEmployeesRoute = Route$2.update({
	id: "/employees",
	path: "/employees",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedDashboardRoute = Route$1.update({
	id: "/dashboard",
	path: "/dashboard",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedRouteRouteChildren = {
	AuthenticatedAnalyticsRoute: Route.update({
		id: "/analytics",
		path: "/analytics",
		getParentRoute: () => AuthenticatedRouteRoute
	}),
	AuthenticatedDashboardRoute,
	AuthenticatedEmployeesRoute,
	AuthenticatedPlannerRoute,
	AuthenticatedTasksRoute,
	AuthenticatedUsersRoute
};
var rootRouteChildren = {
	IndexRoute,
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren)
};
var routeTree = Route$7._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
