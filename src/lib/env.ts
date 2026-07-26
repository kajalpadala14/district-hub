type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

const publicEnvKeys = {
  supabaseUrl: "VITE_SUPABASE_URL",
  supabasePublishableKey: "VITE_SUPABASE_PUBLISHABLE_KEY",
} as const;

export function getPublicEnv(): PublicEnv {
  const env = {
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };

  assertEnv(env, publicEnvKeys, "public frontend");
  assertNoServerSecretsInClient();

  return env;
}

function assertEnv<T extends Record<string, string | undefined>>(
  env: T,
  labels: Record<keyof T, string>,
  scope: string,
) {
  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => labels[key as keyof T]);

  if (missing.length > 0) {
    throw new Error(`Missing ${scope} environment variable(s): ${missing.join(", ")}. Check .env and .env.example.`);
  }
}

function assertNoServerSecretsInClient() {
  const accidentalSecrets = [
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "VITE_GOOGLE_CLIENT_SECRET",
    "VITE_GOOGLE_CLIENT_ID",
  ].filter((key) => Boolean(import.meta.env[key]));

  if (accidentalSecrets.length > 0) {
    throw new Error(
      `Unsafe frontend environment variable(s): ${accidentalSecrets.join(", ")}. Secrets must not use the VITE_ prefix.`,
    );
  }
}
