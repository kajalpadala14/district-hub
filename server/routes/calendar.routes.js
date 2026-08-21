import { createHash } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler, ApiError } from "../utils/http.js";
import {
  createProviderAuthUrl,
  createSubscriptionToken,
  disconnectProvider,
  exchangeOAuthCode,
  exportPlannerIcs,
  exportPlannerIcsByToken,
  listIntegrationStatus,
  queueSyncJob,
  revokeSubscriptionToken,
  syncSource,
} from "../services/calendarService.js";

export const calendarRouter = Router();

function calendarNoCacheHeaders(extra = {}) {
  return {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    ...extra,
  };
}

function calendarFeedMeta(ics) {
  const modifiedMatches = [...ics.matchAll(/^LAST-MODIFIED:(.+)$/gm)];
  const newestModified = modifiedMatches
    .map((match) => Date.parse(parseIcsDate(match[1])))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  return {
    etag: `"calendar-feed-${createHash("sha256").update(ics).digest("hex").slice(0, 16)}"`,
    lastModified: newestModified ? new Date(newestModified).toUTCString() : null,
  };
}

function sendCalendarFeed(req, res, ics, { attachmentName } = {}) {
  const meta = calendarFeedMeta(ics);
  const headers = calendarNoCacheHeaders({
    "Content-Type": "text/calendar; charset=utf-8",
    ETag: meta.etag,
    ...(meta.lastModified ? { "Last-Modified": meta.lastModified } : {}),
  });

  res.set(headers);
  if (attachmentName) {
    res.set("Content-Disposition", `attachment; filename="${attachmentName}"`);
  }

  if (calendarRequestNotModified(req, meta)) {
    res.status(304).end();
    return;
  }

  res.send(ics);
}

function calendarRequestNotModified(req, meta) {
  const ifNoneMatch = req.get("if-none-match");
  if (ifNoneMatch) {
    const requestedEtags = ifNoneMatch.split(",").map((value) => value.trim());
    if (requestedEtags.includes("*") || requestedEtags.includes(meta.etag)) return true;
  }

  const ifModifiedSince = req.get("if-modified-since");
  if (ifModifiedSince && meta.lastModified) {
    const requestedTime = Date.parse(ifModifiedSince);
    const lastModifiedTime = Date.parse(meta.lastModified);
    if (Number.isFinite(requestedTime) && Number.isFinite(lastModifiedTime)) {
      return lastModifiedTime <= requestedTime;
    }
  }

  return false;
}

function parseIcsDate(value) {
  const compact = String(value ?? "").trim();
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!match) return compact;
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
}

calendarRouter.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const integrations = await listIntegrationStatus(req.user.id);
    res.json({ integrations });
  }),
);

calendarRouter.post(
  "/connect/:provider",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authUrl = createProviderAuthUrl(req.params.provider, req.user.id, req.body?.return_to);
    res.json({ authUrl });
  }),
);

calendarRouter.get(
  "/oauth/:provider/callback",
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) throw new ApiError(400, "Missing OAuth code or state");
    const result = await exchangeOAuthCode(req.params.provider, String(code), String(state));
    res.redirect(result.returnTo);
  }),
);

calendarRouter.post(
  "/disconnect/:provider",
  requireAuth,
  asyncHandler(async (req, res) => {
    await disconnectProvider(req.user.id, req.params.provider);
    res.json({ ok: true });
  }),
);

calendarRouter.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { source_type, source_id, provider = "google", background = false } = req.body ?? {};
    if (!source_type || !source_id) throw new ApiError(400, "source_type and source_id are required");
    if (background) {
      const job = await queueSyncJob({ userId: req.user.id, sourceType: source_type, sourceId: source_id, provider });
      res.status(202).json({ job });
      return;
    }
    const events = await syncSource({ userId: req.user.id, sourceType: source_type, sourceId: source_id, provider });
    res.json({ events });
  }),
);

calendarRouter.post(
  "/subscriptions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = await createSubscriptionToken(req.user.id, req.body?.label);
    res.status(201).json({ token });
  }),
);

calendarRouter.delete(
  "/subscriptions/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeSubscriptionToken(req.user.id, req.params.id);
    res.status(204).send();
  }),
);

calendarRouter.get(
  "/export.ics",
  requireAuth,
  asyncHandler(async (req, res) => {
    const ics = await exportPlannerIcs(req.user.id);
    sendCalendarFeed(req, res, ics, { attachmentName: "governance-planner.ics" });
  }),
);

calendarRouter.get(
  "/feed.ics",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? "");
    if (!token) throw new ApiError(400, "token is required");
    const ics = await exportPlannerIcsByToken(token);
    sendCalendarFeed(req, res, ics);
  }),
);
