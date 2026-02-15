// src/routes/webhooks.ts

import express from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

import type { RuleStore } from "../rules-engine/storage/ruleStore.js";
import { normalizeWebhookEvent } from "../rules-engine/normalize/normalizeWebhookEvent.js";
import { handleNormalizedEvent } from "../rules-engine/handleNormalizedEvent.js";

import type { WorkflowStore } from "../workflows/storage/workflowStore.js";
import { executeWorkflowsForContext } from "../workflows/executeWorkflowsForContext.js";

export function githubWebhookRouter(
    ruleStore: RuleStore,
    workflowStore: WorkflowStore
): express.Router {
    const router = express.Router();

    // Use raw to avoid the `verify` warning and to correctly validate signatures.
    router.use(express.raw({ type: "application/json" }));

    router.post("/", (req: any, res) => {
        const signature = req.get("x-hub-signature-256");
        if (!signature) return res.status(401).send("Missing signature");

        const rawBody: Buffer = req.body;
        if (!Buffer.isBuffer(rawBody)) {
            return res.status(400).send("Expected raw body buffer");
        }

        const hmac = crypto.createHmac("sha256", env.GITHUB_WEBHOOK_SECRET);
        const digest = `sha256=${hmac.update(rawBody).digest("hex")}`;

        const sigBuf = Buffer.from(signature);
        const digBuf = Buffer.from(digest);

        if (sigBuf.length !== digBuf.length) {
            return res.status(401).send("Invalid signature");
        }
        if (!crypto.timingSafeEqual(sigBuf, digBuf)) {
            return res.status(401).send("Invalid signature");
        }

        let payload: any;
        try {
            payload = JSON.parse(rawBody.toString("utf8"));
        } catch {
            return res.status(400).send("Invalid JSON payload");
        }

        // Receipt log (before normalization)
        console.log("[webhook] received", {
            event: req.get("x-github-event"),
            delivery: req.get("x-github-delivery"),
        });

        let ctx;
        try {
            ctx = normalizeWebhookEvent({
                headers: req.headers,
                payload,
            });
        } catch (err: any) {
            console.error("[webhook] normalize failed", {
                message: err?.message ?? String(err),
            });
            return res.status(400).send("Normalization failed");
        }

        console.log("[normalized-event]", {
            name: ctx.event.name,
            repo: ctx.repository.fullName,
            delivery: ctx.event.deliveryId,
            installationId: ctx.installationId,
        });

        // Always return 200 on successful receipt; run engines asynchronously
        res.sendStatus(200);

        // Rules engine entrypoint (existing)
        void handleNormalizedEvent(ruleStore, { ctx }).catch((err: any) => {
            console.error("[rules-engine] error", {
                message: err?.message ?? String(err),
                installationId: ctx.installationId,
                repo: ctx.repository.fullName,
                event: ctx.event.name,
                delivery: ctx.event.deliveryId,
            });
        });

        // Workflow engine entrypoint
        void executeWorkflowsForContext({ workflowStore, ctx })
            .then((results) => {
                if (results.length === 0) {
                    console.log("[workflow-engine] no matched workflows", {
                        event: ctx.event.name,
                        repo: ctx.repository.fullName,
                        repositoryId: ctx.repository.id,
                        installationId: ctx.installationId,
                    });
                    return;
                }

                console.log("[workflow-engine] matched workflows", {
                    count: results.length,
                    event: ctx.event.name,
                    repo: ctx.repository.fullName,
                });

                for (const r of results) {
                    const failures = r.stepResults.filter((s) => !s.ok).length;

                    console.log("[workflow-engine] executed workflow", {
                        workflowId: r.workflowId,
                        workflowName: r.workflowName,
                        stepsAttempted: r.stepsAttempted,
                        failures,
                        stepResults: r.stepResults,
                    });
                }
            })
            .catch((err: any) => {
                console.error("[workflow-engine] error", {
                    message: err?.message ?? String(err),
                    installationId: ctx.installationId,
                    repo: ctx.repository.fullName,
                    event: ctx.event.name,
                    delivery: ctx.event.deliveryId,
                });
            });
    });

    return router;
}
