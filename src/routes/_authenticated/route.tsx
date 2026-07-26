import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, Lock, Moon, User, UserPlus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AUTH_USERNAME_DOMAIN } from "@/lib/profileClassification";
import { cn } from "@/lib/utils";

const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function LoginScreen() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [todayLabel, setTodayLabel] = useState("");
  const [currentYear, setCurrentYear] = useState("");

  useEffect(() => {
    const today = new Date();
    setTodayLabel(new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(today));
    setCurrentYear(String(today.getFullYear()));
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        void navigate({ to: "/dashboard", replace: true });
      }
    });

    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const normalizedUsername = normalizeUsername(username);
      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        throw new Error("Username single word hona chahiye. Sirf letters, numbers, _ ya - use karein.");
      }
      const authEmail = emailForUsername(normalizedUsername);

      if (mode === "create") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || normalizedUsername,
              username: normalizedUsername,
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user && !data.session) {
          setMessage("User created. Please confirm the email, then sign in.");
        } else {
          setMessage("User created successfully.");
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });
      if (signInError) throw signInError;
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <section className="relative flex min-h-[42dvh] flex-col items-center justify-center overflow-hidden bg-[#392896] px-6 py-10 text-center text-white lg:min-h-dvh">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
        <div className="relative flex max-w-md flex-col items-center">
          <div className="flex h-18 w-18 items-center justify-center rounded-xl bg-white/18 text-3xl font-extrabold shadow-2xl ring-1 ring-white/20">
            DA
          </div>
          <p className="mt-5 text-xl font-semibold uppercase tracking-wide text-white/90">District Administration</p>
          <h1 className="mt-16 text-6xl font-extrabold leading-[0.96] tracking-tight sm:text-7xl">
            Task
            <br />
            Dashboard
          </h1>
          <div className="mt-8 h-1 w-28 rounded-full bg-violet-300/80" />
          <p className="mt-8 text-xl font-semibold leading-8 text-white/82">
            Centralized task monitoring &
            <br />
            management portal
          </p>
          <div className="mt-14 inline-flex items-center gap-4 rounded-full border border-white/20 bg-white/12 px-9 py-4 text-lg font-bold shadow-xl backdrop-blur">
            <CalendarDays className="h-6 w-6 text-violet-100" />
            {todayLabel || "Loading date"}
          </div>
          <p className="mt-14 text-sm font-medium text-white/50">© {currentYear || "2026"} District Administration</p>
        </div>
      </section>

      <section className="relative flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-10 dark:bg-slate-950">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Toggle dark mode"
          className="absolute right-8 top-8 h-11 w-11 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300"
          onClick={() => {
            const next = !document.documentElement.classList.contains("dark");
            document.documentElement.classList.toggle("dark", next);
            window.localStorage.setItem("governance-theme", next ? "dark" : "light");
          }}
        >
          <Moon className="h-5 w-5" />
        </Button>

        <div className="w-full max-w-xl">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {mode === "login" ? "Welcome Back" : "Create User"}
            </h2>
            <p className="mt-4 text-2xl text-slate-500">
              {mode === "login" ? "Please sign in to continue." : "Create a new dashboard account."}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
            <button
              type="button"
              className={cn(
                "h-11 rounded-xl text-sm font-bold transition",
                mode === "login" ? "bg-white text-primary shadow-sm dark:bg-slate-800" : "text-slate-500",
              )}
              onClick={() => {
                setMode("login");
                setError(null);
                setMessage(null);
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={cn(
                "h-11 rounded-xl text-sm font-bold transition",
                mode === "create" ? "bg-white text-primary shadow-sm dark:bg-slate-800" : "text-slate-500",
              )}
              onClick={() => {
                setMode("create");
                setError(null);
                setMessage(null);
              }}
            >
              Create User
            </button>
          </div>

          <form onSubmit={submit} className="mt-10 space-y-7">
            {mode === "create" && (
              <AuthField label="Full Name" icon={User}>
                <Input
                  type="text"
                  autoComplete="name"
                  placeholder="District Admin"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-19 border-0 bg-transparent pl-14 text-xl shadow-none focus-visible:ring-0"
                />
              </AuthField>
            )}
            <AuthField label="Username" icon={User}>
              <Input
                type="text"
                autoComplete="username"
                placeholder="user"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-19 border-0 bg-transparent pl-14 text-xl shadow-none focus-visible:ring-0"
                pattern="[A-Za-z0-9_-]{3,32}"
                title="Single word username: letters, numbers, underscore or dash only"
                required
              />
            </AuthField>
            <AuthField label="Password" icon={Lock}>
              <Input
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-19 border-0 bg-transparent pl-14 text-xl shadow-none focus-visible:ring-0"
                minLength={6}
                required
              />
            </AuthField>

            <div className="flex items-center justify-between gap-4 text-base">
              <button type="button" className="font-medium text-primary">
                Need a hint?
              </button>
              <button type="button" className="font-medium text-slate-500">
                Forgot Password?
              </button>
            </div>

            {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">{error}</p>}
            {message && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}

            <Button type="submit" className="h-18 w-full rounded-xl bg-[#4833d4] text-xl font-extrabold shadow-2xl hover:bg-[#3d2bc0]" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "login" ? "Sign In" : (
                <>
                  <UserPlus className="h-5 w-5" />
                  Create User
                </>
              )}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

function AuthField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-lg font-extrabold text-slate-950 dark:text-white">{label}</span>
      <span className="relative mt-3 block overflow-hidden rounded-xl border border-slate-200 bg-[#eaf1ff] shadow-sm focus-within:ring-2 focus-within:ring-primary/30 dark:border-slate-800 dark:bg-slate-900">
        <Icon className="absolute left-6 top-1/2 h-7 w-7 -translate-y-1/2 text-slate-400" />
        {children}
      </span>
    </label>
  );
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function emailForUsername(username: string) {
  return `${username}@${AUTH_USERNAME_DOMAIN}`;
}
