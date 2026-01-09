import express from "express";
import { env } from "./config/env.js";
import { githubWebhookRouter } from "./routes/webhooks.js";

const app = express();

/**
 * IMPORTANT:
 * GitHub webhook signature verification requires access
 * to the raw request body. We handle this in the webhook
 * route specifically.
 */
app.use("/webhooks/github", githubWebhookRouter);

// Simple health check
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(Number(env.PORT), () => {
    console.log(`🚀 Flowarden API listening on port ${env.PORT}`);
});
