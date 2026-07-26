import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAuthenticatedUser, requiredEnv, serviceClient } from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const user = await getAuthenticatedUser(req);
    const { returnTo } = await req.json().catch(() => ({ returnTo: null }));
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await serviceClient.from("google_calendar_oauth_states").insert({
      state,
      user_id: user.id,
      return_to: typeof returnTo === "string" ? returnTo : null,
      expires_at: expiresAt,
    });

    const params = new URLSearchParams({
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      redirect_uri: requiredEnv("GOOGLE_REDIRECT_URI"),
      response_type: "code",
      scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    });

    return jsonResponse({
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    });
  } catch (error) {
    const status = error instanceof Error && "status" in error ? Number(error.status) : 500;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to start Google OAuth" }, status);
  }
});
