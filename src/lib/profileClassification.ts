import type { AppRole } from "@/hooks/useAuth";
import type { Profile } from "@/hooks/useData";

export const AUTH_USERNAME_DOMAIN = "district.gov.in";

export function isDashboardUserProfile(profile: Profile, role?: AppRole | null) {
  const email = profile.email.toLowerCase();
  const title = (profile.job_title ?? "").toLowerCase();

  return (
    email.endsWith(`@${AUTH_USERNAME_DOMAIN}`) ||
    email === "local.user@gov.local" ||
    role === "admin" ||
    role === "manager" ||
    title.includes("administrator") ||
    title === "task manager"
  );
}

export function usernameFromProfile(profile: Profile) {
  const email = profile.email.toLowerCase();
  if (email.endsWith(`@${AUTH_USERNAME_DOMAIN}`)) {
    return email.slice(0, -(`@${AUTH_USERNAME_DOMAIN}`.length));
  }
  return profile.email.split("@")[0] || "--";
}
