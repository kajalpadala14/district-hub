import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { N as require_jsx_runtime, k as Slot } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { r as cn, t as Button } from "./button-PwNqyxv_.mjs";
import { n as supabase } from "./client-Cisra8gy.mjs";
import { A as LayoutDashboard, D as Lock, E as LogOut, H as ChartColumn, O as ListChecks, U as CalendarDays, a as UserPlus, b as PanelLeft, f as Shield, i as User, n as Users, o as UserCog, u as Sun, w as Menu, x as Moon } from "../_libs/lucide-react.mjs";
import { _ as useNavigate, f as Outlet, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Input } from "./input-uzm9g8Y7.mjs";
import { t as AUTH_USERNAME_DOMAIN } from "./profileClassification-qLmYHp_o.mjs";
import { t as useAuth } from "./useAuth-CDGY2Qbc.mjs";
import { a as SheetTitle, c as TooltipProvider, i as SheetHeader, l as TooltipTrigger, n as SheetContent, o as Tooltip, r as SheetDescription, s as TooltipContent, t as Sheet } from "./tooltip-CF6mGN2v.mjs";
import { t as Root } from "../_libs/radix-ui__react-separator.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-BPYBHTeT.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MOBILE_BREAKPOINT = 768;
function useIsMobile() {
	const [isMobile, setIsMobile] = import_react.useState(void 0);
	import_react.useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		mql.addEventListener("change", onChange);
		setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		return () => mql.removeEventListener("change", onChange);
	}, []);
	return !!isMobile;
}
var Separator = import_react.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	decorative,
	orientation,
	className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className),
	...props
}));
Separator.displayName = Root.displayName;
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("animate-pulse rounded-md bg-primary/10", className),
		...props
	});
}
var SIDEBAR_COOKIE_NAME = "sidebar_state";
var SIDEBAR_COOKIE_MAX_AGE = 3600 * 24 * 7;
var SIDEBAR_WIDTH = "16rem";
var SIDEBAR_WIDTH_MOBILE = "18rem";
var SIDEBAR_WIDTH_ICON = "3rem";
var SIDEBAR_KEYBOARD_SHORTCUT = "b";
var SidebarContext = import_react.createContext(null);
function useSidebar() {
	const context = import_react.useContext(SidebarContext);
	if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
	return context;
}
var SidebarProvider = import_react.forwardRef(({ defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props }, ref) => {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = import_react.useState(false);
	const [_open, _setOpen] = import_react.useState(defaultOpen);
	const open = openProp ?? _open;
	const setOpen = import_react.useCallback((value) => {
		const openState = typeof value === "function" ? value(open) : value;
		if (setOpenProp) setOpenProp(openState);
		else _setOpen(openState);
		document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
	}, [setOpenProp, open]);
	const toggleSidebar = import_react.useCallback(() => {
		return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
	}, [
		isMobile,
		setOpen,
		setOpenMobile
	]);
	import_react.useEffect(() => {
		const handleKeyDown = (event) => {
			if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				toggleSidebar();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [toggleSidebar]);
	const state = open ? "expanded" : "collapsed";
	const contextValue = import_react.useMemo(() => ({
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar
	}), [
		state,
		open,
		setOpen,
		isMobile,
		openMobile,
		setOpenMobile,
		toggleSidebar
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContext.Provider, {
		value: contextValue,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, {
			delayDuration: 0,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				style: {
					"--sidebar-width": SIDEBAR_WIDTH,
					"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
					...style
				},
				className: cn("group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar", className),
				ref,
				...props,
				children
			})
		})
	});
});
SidebarProvider.displayName = "SidebarProvider";
var Sidebar = import_react.forwardRef(({ side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props }, ref) => {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
	if (collapsible === "none") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", className),
		ref,
		...props,
		children
	});
	if (isMobile) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sheet, {
		open: openMobile,
		onOpenChange: setOpenMobile,
		...props,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
			"data-sidebar": "sidebar",
			"data-mobile": "true",
			className: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden",
			style: { "--sidebar-width": SIDEBAR_WIDTH_MOBILE },
			side,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetHeader, {
				className: "sr-only",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, { children: "Sidebar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetDescription, { children: "Displays the mobile sidebar." })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-full w-full flex-col",
				children
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		className: "group peer hidden text-sidebar-foreground md:block",
		"data-state": state,
		"data-collapsible": state === "collapsed" ? collapsible : "",
		"data-variant": variant,
		"data-side": side,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear", "group-data-[collapsible=offcanvas]:w-0", "group-data-[side=right]:rotate-180", variant === "floating" || variant === "inset" ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)") }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex", side === "left" ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]" : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]", variant === "floating" || variant === "inset" ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l", className),
			...props,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				"data-sidebar": "sidebar",
				className: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow",
				children
			})
		})]
	});
});
Sidebar.displayName = "Sidebar";
var SidebarTrigger = import_react.forwardRef(({ className, onClick, ...props }, ref) => {
	const { toggleSidebar } = useSidebar();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		ref,
		"data-sidebar": "trigger",
		variant: "ghost",
		size: "icon",
		className: cn("h-7 w-7", className),
		onClick: (event) => {
			onClick?.(event);
			toggleSidebar();
		},
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PanelLeft, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Toggle Sidebar"
		})]
	});
});
SidebarTrigger.displayName = "SidebarTrigger";
var SidebarRail = import_react.forwardRef(({ className, ...props }, ref) => {
	const { toggleSidebar } = useSidebar();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		ref,
		"data-sidebar": "rail",
		"aria-label": "Toggle Sidebar",
		tabIndex: -1,
		onClick: toggleSidebar,
		title: "Toggle Sidebar",
		className: cn("absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex", "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize", "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize", "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar", "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2", "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2", className),
		...props
	});
});
SidebarRail.displayName = "SidebarRail";
var SidebarInset = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		ref,
		className: cn("relative flex w-full flex-1 flex-col bg-background", "md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow", className),
		...props
	});
});
SidebarInset.displayName = "SidebarInset";
var SidebarInput = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
		ref,
		"data-sidebar": "input",
		className: cn("h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring", className),
		...props
	});
});
SidebarInput.displayName = "SidebarInput";
var SidebarHeader = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "header",
		className: cn("flex flex-col gap-2 p-2", className),
		...props
	});
});
SidebarHeader.displayName = "SidebarHeader";
var SidebarFooter = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "footer",
		className: cn("flex flex-col gap-2 p-2", className),
		...props
	});
});
SidebarFooter.displayName = "SidebarFooter";
var SidebarSeparator = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, {
		ref,
		"data-sidebar": "separator",
		className: cn("mx-2 w-auto bg-sidebar-border", className),
		...props
	});
});
SidebarSeparator.displayName = "SidebarSeparator";
var SidebarContent = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "content",
		className: cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", className),
		...props
	});
});
SidebarContent.displayName = "SidebarContent";
var SidebarGroup = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		"data-sidebar": "group",
		className: cn("relative flex w-full min-w-0 flex-col p-2", className),
		...props
	});
});
SidebarGroup.displayName = "SidebarGroup";
var SidebarGroupLabel = import_react.forwardRef(({ className, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "div", {
		ref,
		"data-sidebar": "group-label",
		className: cn("flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0", className),
		...props
	});
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";
var SidebarGroupAction = import_react.forwardRef(({ className, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		ref,
		"data-sidebar": "group-action",
		className: cn("absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0", "after:absolute after:-inset-2 after:md:hidden", "group-data-[collapsible=icon]:hidden", className),
		...props
	});
});
SidebarGroupAction.displayName = "SidebarGroupAction";
var SidebarGroupContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	"data-sidebar": "group-content",
	className: cn("w-full text-sm", className),
	...props
}));
SidebarGroupContent.displayName = "SidebarGroupContent";
var SidebarMenu = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
	ref,
	"data-sidebar": "menu",
	className: cn("flex w-full min-w-0 flex-col gap-1", className),
	...props
}));
SidebarMenu.displayName = "SidebarMenu";
var SidebarMenuItem = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
	ref,
	"data-sidebar": "menu-item",
	className: cn("group/menu-item relative", className),
	...props
}));
SidebarMenuItem.displayName = "SidebarMenuItem";
var sidebarMenuButtonVariants = cva("peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring cursor-pointer transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0", {
	variants: {
		variant: {
			default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
			outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
		},
		size: {
			default: "h-8 text-sm",
			sm: "h-7 text-xs",
			lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var SidebarMenuButton = import_react.forwardRef(({ asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, ...props }, ref) => {
	const Comp = asChild ? Slot : "button";
	const { isMobile, state } = useSidebar();
	const button = /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Comp, {
		ref,
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-active": isActive,
		className: cn(sidebarMenuButtonVariants({
			variant,
			size
		}), className),
		...props
	});
	if (!tooltip) return button;
	if (typeof tooltip === "string") tooltip = { children: tooltip };
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
		asChild: true,
		children: button
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, {
		side: "right",
		align: "center",
		hidden: state !== "collapsed" || isMobile,
		...tooltip
	})] });
});
SidebarMenuButton.displayName = "SidebarMenuButton";
var SidebarMenuAction = import_react.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		ref,
		"data-sidebar": "menu-action",
		className: cn("absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0", "after:absolute after:-inset-2 after:md:hidden", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0", className),
		...props
	});
});
SidebarMenuAction.displayName = "SidebarMenuAction";
var SidebarMenuBadge = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	"data-sidebar": "menu-badge",
	className: cn("pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground", "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground", "peer-data-[size=sm]/menu-button:top-1", "peer-data-[size=default]/menu-button:top-1.5", "peer-data-[size=lg]/menu-button:top-2.5", "group-data-[collapsible=icon]:hidden", className),
	...props
}));
SidebarMenuBadge.displayName = "SidebarMenuBadge";
var SidebarMenuSkeleton = import_react.forwardRef(({ className, showIcon = false, ...props }, ref) => {
	const width = import_react.useMemo(() => {
		return `${Math.floor(Math.random() * 40) + 50}%`;
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		ref,
		"data-sidebar": "menu-skeleton",
		className: cn("flex h-8 items-center gap-2 rounded-md px-2", className),
		...props,
		children: [showIcon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
			className: "size-4 rounded-md",
			"data-sidebar": "menu-skeleton-icon"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, {
			className: "h-4 max-w-(--skeleton-width) flex-1",
			"data-sidebar": "menu-skeleton-text",
			style: { "--skeleton-width": width }
		})]
	});
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";
var SidebarMenuSub = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
	ref,
	"data-sidebar": "menu-sub",
	className: cn("mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5", "group-data-[collapsible=icon]:hidden", className),
	...props
}));
SidebarMenuSub.displayName = "SidebarMenuSub";
var SidebarMenuSubItem = import_react.forwardRef(({ ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
	ref,
	...props
}));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";
var SidebarMenuSubButton = import_react.forwardRef(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "a", {
		ref,
		"data-sidebar": "menu-sub-button",
		"data-size": size,
		"data-active": isActive,
		className: cn("flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring cursor-pointer hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground", "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground", size === "sm" && "text-xs", size === "md" && "text-sm", "group-data-[collapsible=icon]:hidden", className),
		...props
	});
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
var nav = [
	{
		title: "Overview",
		url: "/dashboard",
		icon: LayoutDashboard
	},
	{
		title: "Tasks",
		url: "/tasks",
		icon: ListChecks
	},
	{
		title: "Planner",
		url: "/planner",
		icon: CalendarDays
	},
	{
		title: "Analytics",
		url: "/analytics",
		icon: ChartColumn
	},
	{
		title: "Employees",
		url: "/employees",
		icon: Users
	},
	{
		title: "Users",
		url: "/users",
		icon: UserCog
	}
];
function AppSidebar() {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [darkMode, setDarkMode] = (0, import_react.useState)(false);
	const [loggingOut, setLoggingOut] = (0, import_react.useState)(false);
	const { user } = useAuth();
	const displayUser = user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email?.split("@")[0] || "User";
	(0, import_react.useEffect)(() => {
		const stored = window.localStorage.getItem("governance-theme");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		setDarkMode(stored ? stored === "dark" : prefersDark);
	}, []);
	(0, import_react.useEffect)(() => {
		document.documentElement.classList.toggle("dark", darkMode);
		window.localStorage.setItem("governance-theme", darkMode ? "dark" : "light");
	}, [darkMode]);
	const handleLogout = async () => {
		setLoggingOut(true);
		await Promise.race([supabase.auth.signOut({ scope: "local" }), new Promise((resolve) => window.setTimeout(resolve, 1200))]);
		clearSupabaseAuthStorage();
		window.location.replace("/");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sidebar, {
		collapsible: "icon",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarHeader, {
				className: "border-b border-sidebar-border",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 px-2 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, {
							className: "h-4 w-4",
							"aria-hidden": "true"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col leading-tight group-data-[collapsible=icon]:hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm font-semibold",
							children: "District Admin"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted-foreground",
							children: "Governance Portal"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarGroup, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroupLabel, { children: "Workspace" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarGroupContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenu, { children: nav.map((item) => {
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuItem, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarMenuButton, {
					asChild: true,
					isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
					tooltip: item.title,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: item.url,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(item.icon, {
							className: "h-4 w-4",
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title })]
					})
				}) }, item.url);
			}) }) })] }) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SidebarFooter, {
				className: "border-t border-sidebar-border p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "group-data-[collapsible=icon]:hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg bg-primary/6 p-3 ring-1 ring-primary/10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground",
									children: "U"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-sm font-semibold",
										children: displayUser
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "Logged in"
									})]
								})]
							})
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "ghost",
						className: "mt-2 h-9 justify-start gap-2 px-2 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:justify-center",
						"aria-label": "Logout",
						disabled: loggingOut,
						onClick: () => void handleLogout(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "group-data-[collapsible=icon]:hidden",
							children: loggingOut ? "Logging out..." : "Logout"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-1 flex items-center justify-between rounded-lg bg-muted/35 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "Menu",
							className: "h-8 w-8",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": darkMode ? "Switch to light mode" : "Switch to dark mode",
							title: darkMode ? "Light mode" : "Dark mode",
							className: "h-8 w-8",
							onClick: () => setDarkMode((value) => !value),
							children: darkMode ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-4 w-4" })
						})]
					})
				]
			})
		]
	});
}
function clearSupabaseAuthStorage() {
	window.localStorage.removeItem("governance.api.token");
	for (const storage of [window.localStorage, window.sessionStorage]) for (const key of Object.keys(storage)) if (key === "supabase.auth.token" || key.startsWith("sb-") || key.includes("auth-token")) storage.removeItem(key);
}
function AppShell({ children }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const current = nav.find((n) => pathname === n.url || pathname.startsWith(n.url + "/"));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-dvh w-full overflow-x-hidden bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppSidebar, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-1 flex-col",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarTrigger, { "aria-label": "Toggle navigation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-sm font-semibold tracking-tight",
							children: current?.title ?? "Dashboard"
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
					className: "min-w-0 max-w-full flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8",
					children
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
				richColors: true,
				position: "top-right"
			})
		]
	}) });
}
var USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/;
function AuthenticatedLayout() {
	const { user, loading } = useAuth();
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-dvh items-center justify-center bg-background px-4 text-sm text-muted-foreground",
		children: "Loading..."
	});
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginScreen, {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) });
}
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
export { LoginScreen, AuthenticatedLayout as component };
