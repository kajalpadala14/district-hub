type ServerEnv = {
  supabaseUrl: string;
  supabasePublishableKey?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRedirectUri?: string;
};

export function getSupabaseServerEnv(requireServiceRole = false): ServerEnv {
  const env = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const missing = [
    ...(!env.supabaseUrl ? ["SUPABASE_URL"] : []),
    ...(!env.supabasePublishableKey ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ...(requireServiceRole && !env.supabaseServiceRoleKey ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
  ];

  if (missing.length > 0) {
    throw new Error(`Missing server environment variable(s): ${missing.join(", ")}. Check .env and deployment secrets.`);
  }

  return env as ServerEnv;
}

export function getGoogleCalendarServerEnv(): ServerEnv {
  const env = {
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  };

  const missing = [
    ...(!env.googleClientId ? ["GOOGLE_CLIENT_ID"] : []),
    ...(!env.googleClientSecret ? ["GOOGLE_CLIENT_SECRET"] : []),
    ...(!env.googleRedirectUri ? ["GOOGLE_REDIRECT_URI"] : []),
  ];

  if (missing.length > 0) {
    throw new Error(`Missing Google Calendar environment variable(s): ${missing.join(", ")}. Check Edge Function secrets.`);
  }

  return env as ServerEnv;
}
