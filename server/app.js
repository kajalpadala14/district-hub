import express from "express";
import { rateLimit } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { taskRouter } from "./routes/task.routes.js";
import { calendarRouter } from "./routes/calendar.routes.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "2mb" }));
  app.use(securityHeaders);
  app.use(rateLimit);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "governance-tasks-api" });
  });

  app.use("/auth", authRouter);
  app.use("/tasks", taskRouter);
  app.use("/calendar", calendarRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}
