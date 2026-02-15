import { Router } from "express";
import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
    const checks = {
        server: true,
        env: {
            githubWebhookSecret: Boolean(env.GITHUB_WEBHOOK_SECRET),
        },
    };

    const ok = checks.server && checks.env.githubWebhookSecret;

    res.status(200).json({
        ok,
        status: ok ? "ok" : "degraded",
        timestamp: new Date().toISOString(),
        checks,
    });
});
