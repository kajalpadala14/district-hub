import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@district.gov.in";
const ADMIN_PASSWORD = "Admin@123";

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: userList, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

let adminUser = userList.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL) ?? null;

if (!adminUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Admin User", username: ADMIN_USERNAME },
  });
  if (error) throw error;
  adminUser = data.user;
} else {
  const { data, error } = await supabase.auth.admin.updateUserById(adminUser.id, {
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Admin User", username: ADMIN_USERNAME },
  });
  if (error) throw error;
  adminUser = data.user;
}

if (!adminUser) throw new Error("Could not create or update admin user.");

for (const user of userList.users) {
  if (user.id === adminUser.id) continue;
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
}

const adminProfile = {
  id: adminUser.id,
  email: ADMIN_EMAIL,
  full_name: "Admin User",
  job_title: "Administrator",
  department: "District Administration",
};

const { error: profileError } = await supabase.from("profiles").upsert(adminProfile, { onConflict: "id" });
if (profileError) throw profileError;

const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id,email,job_title");
if (profilesError) throw profilesError;

const dashboardProfiles = (profiles ?? []).filter((profile) => {
  if (profile.id === adminUser.id) return false;
  const email = profile.email.toLowerCase();
  const title = (profile.job_title ?? "").toLowerCase();
  return (
    email.endsWith("@district.gov.in") ||
    email === "local.user@gov.local" ||
    title.includes("administrator") ||
    title === "task manager"
  );
});

if (dashboardProfiles.length > 0) {
  const ids = dashboardProfiles.map((profile) => profile.id);
  const { error } = await supabase.from("profiles").delete().in("id", ids);
  if (error) throw error;
}

const { error: roleCleanupError } = await supabase.from("user_roles").delete().neq("user_id", adminUser.id);
if (roleCleanupError) throw roleCleanupError;

const { error: roleError } = await supabase
  .from("user_roles")
  .upsert({ user_id: adminUser.id, role: "admin" }, { onConflict: "user_id,role" });
if (roleError) throw roleError;

console.log("Kept dashboard user: admin");
console.log("Password reset to: Admin@123");
