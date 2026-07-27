import type { AppRole } from "@/hooks/useAuth";
import type { Profile } from "@/hooks/useData";

export const AUTH_USERNAME_DOMAIN = "review-dashboard.example.com";
export const LEGACY_AUTH_USERNAME_DOMAINS = ["district.gov.in"];
export const AUTH_USERNAME_DOMAINS = [AUTH_USERNAME_DOMAIN, ...LEGACY_AUTH_USERNAME_DOMAINS];

export function isDashboardUserProfile(profile: Profile, role?: AppRole | null) {
  const email = profile.email.toLowerCase();
  const title = (profile.job_title ?? "").toLowerCase();

  return (
    AUTH_USERNAME_DOMAINS.some((domain) => email.endsWith(`@${domain}`)) ||
    email === "local.user@gov.local" ||
    role === "admin" ||
    role === "manager" ||
    title.includes("administrator") ||
    title === "task manager"
  );
}

export function usernameFromProfile(profile: Profile) {
  const email = profile.email.toLowerCase();
  const authDomain = AUTH_USERNAME_DOMAINS.find((domain) => email.endsWith(`@${domain}`));
  if (authDomain) {
    return email.slice(0, -(`@${authDomain}`.length));
  }
  return profile.email.split("@")[0] || "--";
}
