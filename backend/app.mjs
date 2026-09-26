import express from "express";
import helmet from "helmet";
import { validateContact } from "./validation.mjs";
export function createApp({ store, mode, origin, salt, retentionDays }) {
  const app = express();
  app.disable("x-powered-by");
  // Only the adjacent Nginx proxy can reach this service. It overwrites X-Forwarded-For.
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (_req, res) => {
    try {
      store.db.prepare("SELECT 1").get();
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  app.get("/api/config", (_req, res) => res.json({ mode, retentionDays }));
  app.use(
    "/api/contact",
    (req, res, next) => {
      if (req.method !== "POST")
        return res
          .status(405)
          .set("Allow", "POST")
          .json({ message: "Use POST." });
      if (req.headers.origin !== origin)
        return res
          .status(403)
          .json({
            message: "This form must be submitted from the portfolio website.",
          });
      if (!req.is("application/json"))
        return res.status(415).json({ message: "Send JSON content." });
      if (!store.limit(req.ip, salt))
        return res
          .status(429)
          .set("Retry-After", "3600")
          .json({
            message:
              "Too many attempts. Please try again in an hour or use LinkedIn.",
          });
      next();
    },
    express.json({ limit: "16kb" }),
  );
  app.post("/api/contact", (req, res) => {
    const result = validateContact(req.body);
    if (result.errors)
      return res
        .status(400)
        .json({
          message: result.errors.form || "Please check the highlighted fields.",
          errors: result.errors,
        });
    store.prune();
    if (store.count() >= 1000)
      return res
        .status(503)
        .json({
          message: "The contact form is temporarily full. Please use LinkedIn.",
        });
    const id = store.add(result.data, mode);
    return res
      .status(202)
      .json({
        id,
        mode,
        message:
          mode === "local"
            ? "Test inquiry saved locally. No email was sent."
            : "Your inquiry has been queued for email delivery. This is not a delivery confirmation.",
      });
  });
  app.use((_req, res) => res.status(404).json({ message: "Not found." }));
  // No request bodies, addresses, credentials, or provider errors in logs/responses.
  app.use((err, _req, res, _next) =>
    res
      .status(
        err.type === "entity.too.large"
          ? 413
          : err instanceof SyntaxError
            ? 400
            : 500,
      )
      .json({
        message:
          err.type === "entity.too.large"
            ? "Message is too large."
            : "Unable to process your message. Please try again.",
      }),
  );
  return app;
}
