import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  BarChart3,
  Users,
  UserCog,
  Shield,
  LogOut,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tasks", url: "/tasks", icon: ListChecks },
  { title: "Planner", url: "/planner", icon: CalendarDays },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Employees", url: "/employees", icon: Users },
  { title: "Users", url: "/users", icon: UserCog },
] as const;

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [darkMode, setDarkMode] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { user } = useAuth();
  const displayUser = user?.user_metadata?.full_name || user?.user_metadata?.username || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    const stored = window.localStorage.getItem("governance-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(stored ? stored === "dark" : prefersDark);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    window.localStorage.setItem("governance-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await Promise.race([
      supabase.auth.signOut({ scope: "local" }),
      new Promise((resolve) => window.setTimeout(resolve, 1200)),
    ]);
    clearSupabaseAuthStorage();
    window.location.replace("/");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">District Admin</span>
            <span className="text-xs text-muted-foreground">Governance Portal</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="group-data-[collapsible=icon]:hidden">
          <div className="rounded-lg bg-primary/6 p-3 ring-1 ring-primary/10">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
                U
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{displayUser}</p>
                <p className="text-xs text-muted-foreground">Logged in</p>
              </div>
            </div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-9 justify-start gap-2 px-2 text-muted-foreground hover:text-foreground group-data-[collapsible=icon]:justify-center"
          aria-label="Logout"
          disabled={loggingOut}
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">{loggingOut ? "Logging out..." : "Logout"}</span>
        </Button>
        <div className="mt-1 flex items-center justify-between rounded-lg bg-muted/35 px-2 py-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <Button variant="ghost" size="icon" aria-label="Menu" className="h-8 w-8">
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            title={darkMode ? "Light mode" : "Dark mode"}
            className="h-8 w-8"
            onClick={() => setDarkMode((value) => !value)}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function clearSupabaseAuthStorage() {
  window.localStorage.removeItem("governance.api.token");

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (
        key === "supabase.auth.token" ||
        key.startsWith("sb-") ||
        key.includes("auth-token")
      ) {
        storage.removeItem(key);
      }
    }
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = nav.find((n) => pathname === n.url || pathname.startsWith(n.url + "/"));
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger aria-label="Toggle navigation" />
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-tight">
                {current?.title ?? "Dashboard"}
              </h1>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
        <Toaster richColors position="top-right" />
      </div>
    </SidebarProvider>
  );
}
