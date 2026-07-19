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
    res.header("Content-Type", "text/calendar; charset=utf-8");
    res.attachment("governance-planner.ics");
    res.send(ics);
  }),
);

calendarRouter.get(
  "/feed.ics",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? "");
    if (!token) throw new ApiError(400, "token is required");
    const ics = await exportPlannerIcsByToken(token);
    res.header("Content-Type", "text/calendar; charset=utf-8");
    res.send(ics);
  }),
);
