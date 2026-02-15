import express from "express";
import { env } from "./config/env.js";
import { githubWebhookRouter } from "./routes/webhooks.js";

import { InMemoryRuleStore } from "./rules-engine/storage/inMemoryRuleStore.js";
import { applySeedSpecs } from "./rules-engine/storage/seedRules.js";

import { workflowsRouter } from "./routes/workflows.js";
import { InMemoryWorkflowStore } from "./workflows/storage/inMemoryWorkflowStore.js";

const app = express();

/**
 * IMPORTANT:
 * GitHub webhook signature verification requires access
 * to the raw request body. We handle this in the webhook
 * route specifically.
 *
 * So: do NOT app.use(express.json()) globally here.
 */

// Initialize rule storage once (MVP: in-memory)
const ruleStore = new InMemoryRuleStore();

// Initialize workflow storage once (MVP: in-memory)
const workflowStore = new InMemoryWorkflowStore();

// Seed once on startup (MVP dev-only)
await applySeedSpecs(ruleStore);

// Mount webhook router with dependencies (RAW body required)
app.use("/webhooks/github", githubWebhookRouter(ruleStore, workflowStore));

// Workflow CRUD API (JSON parsing is local inside router)
app.use("/api/workflows", workflowsRouter(workflowStore));

// Simple health check
app.use("/health", (_req, res) => {
    res.json({ ok: true });
});

app.listen(Number(env.PORT), () => {
    console.log(`🚀 Flowarden API listening on port ${env.PORT}`);
});


