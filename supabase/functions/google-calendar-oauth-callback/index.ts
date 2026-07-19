import { requiredEnv, serviceClient } from "../_shared/google-calendar.ts";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return html("Google Calendar connection was cancelled.", 400);

    const { data: oauthState, error: stateError } = await serviceClient
      .from("google_calendar_oauth_states")
      .select("*")
      .eq("state", state)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (stateError) throw stateError;
    if (!oauthState) return html("Google Calendar connection link expired. Please try again.", 400);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: requiredEnv("GOOGLE_CLIENT_ID"),
        client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
        code,
        grant_type: "authorization_code",
        redirect_uri: requiredEnv("GOOGLE_REDIRECT_URI"),
      }),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) return html(tokens.error_description ?? "Google token exchange failed.", 400);

    const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = profileResponse.ok ? await profileResponse.json() : {};
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString();

    const existing = await serviceClient
      .from("google_calendar_connections")
      .select("refresh_token")
      .eq("user_id", oauthState.user_id)
      .maybeSingle();

    await serviceClient.from("google_calendar_connections").upsert({
      user_id: oauthState.user_id,
      google_email: typeof profile.email === "string" ? profile.email : null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing.data?.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokens.scope,
      token_type: tokens.token_type ?? "Bearer",
    });

    await serviceClient.from("google_calendar_oauth_states").delete().eq("state", state);

    const returnTo = oauthState.return_to || "/";
    return new Response(null, {
      status: 302,
      headers: { Location: `${returnTo}${returnTo.includes("?") ? "&" : "?"}googleCalendar=connected` },
    });
  } catch (error) {
    return html(error instanceof Error ? error.message : "Google Calendar connection failed.", 500);
  }
});

function html(message: string, status = 200) {
  return new Response(
    `<!doctype html><html><body style="font-family:system-ui;padding:32px"><h2>${escapeHtml(message)}</h2><p>You can close this tab and return to the dashboard.</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
    return map[char];
  });
}
