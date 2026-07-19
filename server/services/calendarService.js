import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/http.js";
import { decryptSecret, encryptSecret, randomToken, sha256 } from "../utils/crypto.js";

const taskSelect = `
  id, task_number, title, description, priority, status, due_date, due_time, scheduled_date,
  department, agency, created_by, assigned_to, backend_assigned_to,
  calendar_sync_enabled, calendar_sync_status, calendar_event_html_link,
  google_calendar_event_id, created_at, updated_at
`;

const providers = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/calendar.events"],
    clientId: () => env.googleClientId,
    clientSecret: () => env.googleClientSecret,
    redirectUri: () => env.googleRedirectUri,
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["offline_access", "User.Read", "Calendars.ReadWrite"],
    clientId: () => env.outlookClientId,
    clientSecret: () => env.outlookClientSecret,
    redirectUri: () => env.outlookRedirectUri,
  },
};

export async function listIntegrationStatus(userId) {
  const { data, error } = await supabaseAdmin
    .from("calendar_integrations")
    .select("id,provider,provider_account_email,token_expiry,sync_enabled,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function createProviderAuthUrl(provider, userId, returnTo) {
  const config = providers[provider];
  if (!config) throw new ApiError(400, `Unsupported calendar provider: ${provider}`);
  if (!config.clientId() || !config.redirectUri()) throw new ApiError(500, `${provider} OAuth is not configured`);

  const state = Buffer.from(JSON.stringify({ userId, provider, returnTo, nonce: randomToken(12) })).toString("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId(),
    redirect_uri: config.redirectUri(),
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent",
  });
  if (provider === "outlook") params.delete("access_type");
  return `${config.authUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(provider, code, stateText) {
  const config = providers[provider];
  if (!config) throw new ApiError(400, `Unsupported calendar provider: ${provider}`);
  const state = JSON.parse(Buffer.from(stateText, "base64url").toString("utf8"));
  if (state.provider !== provider) throw new ApiError(400, "OAuth state provider mismatch");

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId(),
      client_secret: config.clientSecret(),
      redirect_uri: config.redirectUri(),
      grant_type: "authorization_code",
      code,
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(400, payload.error_description ?? "Calendar OAuth token exchange failed", payload);

  const expiresIn = Number(payload.expires_in ?? 3600);
  const integration = await upsertIntegration({
    userId: state.userId,
    provider,
    email: payload.email ?? null,
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
    scopes: String(payload.scope ?? "").split(" ").filter(Boolean),
  });

  return { integration, returnTo: state.returnTo ?? env.appBaseUrl };
}

export async function upsertIntegration({ userId, provider, email, accessToken, refreshToken, tokenExpiry, scopes = [] }) {
  const { data, error } = await supabaseAdmin
    .from("calendar_integrations")
    .upsert({
      user_id: userId,
      provider,
      provider_account_email: email,
      access_token: encryptSecret(accessToken),
      refresh_token: encryptSecret(refreshToken),
      token_expiry: tokenExpiry,
      token_key_id: "local-v1",
      scopes,
      sync_enabled: true,
    }, { onConflict: "user_id,provider,provider_account_email" })
    .select("id,provider,provider_account_email,sync_enabled,token_expiry")
    .single();
  if (error) throw error;
  return data;
}

export async function disconnectProvider(userId, provider) {
  const { error } = await supabaseAdmin
    .from("calendar_integrations")
    .update({ sync_enabled: false })
    .eq("user_id", userId)
    .eq("provider", provider);
  if (error) throw error;
}

export async function createSubscriptionToken(userId, label = "Default planner feed") {
  const token = randomToken();
  const { data, error } = await supabaseAdmin
    .from("calendar_subscription_tokens")
    .insert({ user_id: userId, token_hash: sha256(token), label })
    .select("id,label,scope,created_at")
    .single();
  if (error) throw error;
  return { ...data, token };
}

export async function revokeSubscriptionToken(userId, id) {
  const { error } = await supabaseAdmin
    .from("calendar_subscription_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function syncSource({ userId, sourceType, sourceId, provider }) {
  const source = await loadSource(sourceType, sourceId);
  const { data: integrations, error } = await supabaseAdmin
    .from("calendar_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("sync_enabled", true);
  if (error) throw error;
  if (!integrations?.length) throw new ApiError(400, `No connected ${provider} calendar account found`);

  const results = [];
  for (const integration of integrations) {
    const eventPayload = buildProviderEvent(source, sourceType);
    const existing = await loadCalendarEvent(sourceType, sourceId, provider, userId);
    const accessToken = await getFreshAccessToken(integration);
    const external = await pushProviderEvent(provider, accessToken, eventPayload, existing?.external_event_id);
    const { data, error: eventError } = await supabaseAdmin
      .from("calendar_events")
      .upsert({
        source_type: sourceType,
        source_id: sourceId,
        provider,
        user_id: userId,
        integration_id: integration.id,
        external_event_id: external.id,
        external_event_url: external.url,
        sync_status: "synced",
        sync_error: null,
        last_synced_at: new Date().toISOString(),
        payload_hash: sha256(JSON.stringify(eventPayload)),
      }, { onConflict: "source_type,source_id,provider,user_id" })
      .select("*")
      .single();
    if (eventError) throw eventError;
    results.push(data);
  }
  return results;
}

async function getFreshAccessToken(integration) {
  if (integration.token_expiry && new Date(integration.token_expiry).getTime() > Date.now() + 60_000) {
    return decryptSecret(integration.access_token);
  }
  const config = providers[integration.provider];
  if (!config) throw new ApiError(400, `Unsupported calendar provider: ${integration.provider}`);
  const refreshToken = decryptSecret(integration.refresh_token);
  if (!refreshToken) throw new ApiError(400, "Calendar refresh token is missing. Reconnect calendar.");

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId(),
      client_secret: config.clientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload.error_description ?? "Calendar token refresh failed", payload);
  const expiresIn = Number(payload.expires_in ?? 3600);
  const accessToken = payload.access_token;
  const { error } = await supabaseAdmin
    .from("calendar_integrations")
    .update({
      access_token: encryptSecret(accessToken),
      token_expiry: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scopes: String(payload.scope ?? integration.scopes?.join(" ") ?? "").split(" ").filter(Boolean),
    })
    .eq("id", integration.id);
  if (error) throw error;
  return accessToken;
}

async function loadCalendarEvent(sourceType, sourceId, provider, userId) {
  const { data, error } = await supabaseAdmin
    .from("calendar_events")
    .select("external_event_id")
    .eq("source_type", sourceType)
    .eq("source_id", sourceId)
    .eq("provider", provider)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function queueSyncJob({ userId, sourceType, sourceId, provider, action = "sync" }) {
  const { data, error } = await supabaseAdmin
    .from("calendar_sync_jobs")
    .insert({ user_id: userId, source_type: sourceType, source_id: sourceId, provider, action })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function disableSourceCalendarEvents({ sourceType, sourceId }) {
  const { error } = await supabaseAdmin
    .from("calendar_events")
    .update({
      sync_status: "disabled",
      sync_error: "Source deleted or calendar sync disabled",
      updated_at: new Date().toISOString(),
    })
    .eq("source_type", sourceType)
    .eq("source_id", sourceId);
  if (error) throw error;
}

export async function exportPlannerIcs(userId) {
  const tasks = await listCalendarSources(userId);
  return buildIcs(tasks);
}

export async function exportPlannerIcsByToken(token) {
  const { data: tokenRow, error } = await supabaseAdmin
    .from("calendar_subscription_tokens")
    .select("user_id")
    .eq("token_hash", sha256(token))
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!tokenRow) throw new ApiError(404, "Calendar subscription token not found");
  return exportPlannerIcs(tokenRow.user_id);
}

async function listCalendarSources(userId) {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select(taskSelect)
    .or(`created_by.eq.${userId},assigned_to.eq.${userId},backend_assigned_to.eq.${userId}`)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function loadSource(sourceType, sourceId) {
  if (!["task", "planner", "meeting", "reminder"].includes(sourceType)) {
    throw new ApiError(400, "Unsupported calendar source type");
  }
  const { data, error } = await supabaseAdmin.from("tasks").select(taskSelect).eq("id", sourceId).maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError(404, "Calendar source not found");
  return data;
}

function buildProviderEvent(source, sourceType) {
  const date = source.due_date ?? source.scheduled_date ?? new Date().toISOString().slice(0, 10);
  const time = source.due_time ?? "10:00";
  const start = new Date(`${date}T${time}:00+05:30`);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    sourceType,
    title: source.title,
    description: [
      source.description ?? "",
      `Priority: ${source.priority ?? "medium"}`,
      `Department: ${source.department ?? "Not set"}`,
      `Task URL: ${env.appBaseUrl}/tasks`,
    ].filter(Boolean).join("\n"),
    start,
    end,
    reminders: [{ method: "popup", minutes: 60 }],
  };
}

async function pushProviderEvent(provider, accessToken, event, externalEventId) {
  if (!accessToken) throw new ApiError(400, `${provider} access token is missing`);
  if (provider === "ics" || provider === "apple") {
    return { id: `${event.sourceType}-${Date.now()}`, url: null };
  }
  if (provider === "google") return pushGoogleEvent(accessToken, event, externalEventId);
  if (provider === "outlook") return pushOutlookEvent(accessToken, event, externalEventId);
  throw new ApiError(400, `Unsupported push provider: ${provider}`);
}

async function pushGoogleEvent(accessToken, event, externalEventId) {
  const url = externalEventId
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(externalEventId)}?sendUpdates=all`
    : "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all";
  const response = await fetch(url, {
    method: externalEventId ? "PUT" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.start.toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: event.end.toISOString(), timeZone: "Asia/Kolkata" },
      reminders: {
        useDefault: false,
        overrides: event.reminders,
      },
    }),
  });
  const payload = await response.json();
  if (!response.ok) throw new ApiError(response.status, payload.error?.message ?? "Google Calendar sync failed", payload);
  return { id: payload.id, url: payload.htmlLink ?? null };
}

async function pushOutlookEvent(accessToken, event, externalEventId) {
  const url = externalEventId
    ? `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(externalEventId)}`
    : "https://graph.microsoft.com/v1.0/me/events";
  const response = await fetch(url, {
    method: externalEventId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subject: event.title,
      body: { contentType: "Text", content: event.description },
      start: { dateTime: event.start.toISOString(), timeZone: "Asia/Kolkata" },
      end: { dateTime: event.end.toISOString(), timeZone: "Asia/Kolkata" },
      isReminderOn: true,
      reminderMinutesBeforeStart: event.reminders[0]?.minutes ?? 60,
    }),
  });
  const payload = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new ApiError(response.status, payload.error?.message ?? "Outlook Calendar sync failed", payload);
  return {
    id: payload.id ?? externalEventId,
    url: payload.webLink ?? null,
  };
}

function buildIcs(tasks) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Governance Review Dashboard//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...tasks.flatMap((task) => {
      const date = task.due_date ?? task.scheduled_date;
      if (!date) return [];
      const time = task.due_time ?? "10:00";
      const start = new Date(`${date}T${time}:00+05:30`);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return [
        "BEGIN:VEVENT",
        `UID:${task.id}@governance-review-dashboard`,
        `DTSTAMP:${icsDate(new Date())}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${escapeIcs(task.title)}`,
        `DESCRIPTION:${escapeIcs(task.description ?? "")}`,
        task.department ? `LOCATION:${escapeIcs(task.department)}` : "",
        "END:VEVENT",
      ].filter(Boolean);
    }),
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcs(value) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
