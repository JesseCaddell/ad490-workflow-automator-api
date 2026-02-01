import express from "express";
import { env } from "./config/env.js";
import { githubWebhookRouter } from "./routes/webhooks.js";
import {healthRouter} from "./routes/health.js";

import { InMemoryRuleStore } from "./rules-engine/storage/inMemoryRuleStore.js";
import { applySeedSpecs } from "./rules-engine/storage/seedRules.js";

const app = express();

/**
 * IMPORTANT:
 * GitHub webhook signature verification requires access
 * to the raw request body. We handle this in the webhook
 * route specifically.
 */

// Initialize rule storage once (MVP: in-memory)
const ruleStore = new InMemoryRuleStore();

// Seed once on startup (MVP dev-only)
await applySeedSpecs(ruleStore);

// Mount webhook router with dependencies
app.use("/webhooks/github", githubWebhookRouter(ruleStore));

app.use("/health", healthRouter);

// Simple health check
app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(Number(env.PORT), () => {
    console.log(`🚀 Flowarden API listening on port ${env.PORT}`);
});

