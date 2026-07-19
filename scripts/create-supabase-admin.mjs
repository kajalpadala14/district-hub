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

const AUTH_USERNAME_DOMAIN = "district.gov.in";
const USERNAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/;

const [username, password, fullName = "Admin User"] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: npm.cmd run auth:create-admin -- admin StrongPassword123 \"Admin User\"");
  process.exit(1);
}

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const normalizedUsername = username.trim().toLowerCase();
if (!USERNAME_PATTERN.test(normalizedUsername)) {
  console.error("Username single word hona chahiye. Sirf letters, numbers, _ ya - use karein.");
  process.exit(1);
}

const normalizedEmail = `${normalizedUsername}@${AUTH_USERNAME_DOMAIN}`;
let authUser = null;

const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;
authUser = existingUsers.users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null;

if (!authUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username: normalizedUsername },
  });
  if (error) throw error;
  authUser = data.user;
}

if (!authUser) throw new Error("Could not create or find auth user.");

const profilePayload = {
  id: authUser.id,
  email: normalizedEmail,
  full_name: fullName,
  job_title: "Administrator",
  department: "District Administration",
};

const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
if (profileError) throw profileError;

const { error: roleError } = await supabase
  .from("user_roles")
  .upsert({ user_id: authUser.id, role: "admin" }, { onConflict: "user_id,role" });
if (roleError) throw roleError;

console.log(`Admin ready: ${normalizedEmail}`);
