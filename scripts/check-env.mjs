import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");
const required = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "JWT_SECRET",
];

if (!existsSync(envPath)) {
  console.error("Missing .env file. Copy .env.example to .env and fill real values.");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
    }),
);

const missing = required.filter((key) => !env[key]);
const unsafeFrontendSecrets = [
  "VITE_SUPABASE_SERVICE_ROLE_KEY",
  "VITE_GOOGLE_CLIENT_SECRET",
  "VITE_GOOGLE_CLIENT_ID",
  "VITE_OUTLOOK_CLIENT_SECRET",
].filter((key) => env[key]);
const optionalGroups = [
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"],
  ["OUTLOOK_CLIENT_ID", "OUTLOOK_CLIENT_SECRET", "OUTLOOK_REDIRECT_URI"],
];
const partialGroups = optionalGroups.flatMap((group) => {
  const present = group.filter((key) => !!env[key]);
  if (present.length === 0 || present.length === group.length) return [];
  return group.filter((key) => !env[key]);
});

if (missing.length > 0) {
  console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
  process.exit(1);
}

if (unsafeFrontendSecrets.length > 0) {
  console.error(`Unsafe frontend secret variable(s): ${unsafeFrontendSecrets.join(", ")}. Remove VITE_ prefix from secrets.`);
  process.exit(1);
}

if (partialGroups.length > 0) {
  console.error(`Partially configured OAuth variable group. Missing: ${partialGroups.join(", ")}`);
  process.exit(1);
}

console.log("Environment check passed. Required keys are present and no known secrets use VITE_ prefixes.");
