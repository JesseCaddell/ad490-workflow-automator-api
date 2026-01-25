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

    router.post("/", async (req: any, res) => {
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

        const installationId: number | undefined = payload?.installation?.id;
        if (!installationId) {
            return res.status(400).send("Missing installation.id in payload");
        }

        const ctx = normalizeWebhookEvent({
            headers: req.headers,
            payload,
        });

        console.log("[normalized-event]", {
            name: ctx.event.name,
            repo: ctx.repository.fullName,
            delivery: ctx.event.deliveryId,
        });

        // Engine entrypoint: consumes ONLY normalized context
        await handleNormalizedEvent(ruleStore, { ctx, installationId });

        return res.sendStatus(200);
    });

    return router;
}

