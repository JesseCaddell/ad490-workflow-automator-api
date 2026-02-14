// src/routes/webhooks.ts

import express from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

import type { RuleStore } from "../rules-engine/storage/ruleStore.js";
import { normalizeWebhookEvent } from "../rules-engine/normalize/normalizeWebhookEvent.js";
import { handleNormalizedEvent } from "../rules-engine/handleNormalizedEvent.js";

export function githubWebhookRouter(ruleStore: RuleStore): express.Router {
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

        // Always return 200 on successful receipt; run engine asynchronously
        res.sendStatus(200);

        /**
         * Engine entrypoint: consumes ONLY normalized context.
         *
         * NOTE: This expects handleNormalizedEvent signature to be:
         *   handleNormalizedEvent(ruleStore, { ctx })
         * (and for it to use ctx.installationId internally).
         */
        void handleNormalizedEvent(ruleStore, { ctx }).catch((err: any) => {
            console.error("[rules-engine] error", {
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

