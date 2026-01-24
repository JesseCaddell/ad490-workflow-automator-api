import express from "express";
import crypto from "crypto";
import { env } from "../config/env.js";
import { normalizeWebhookEvent } from "../rules-engine/normalize/normalizeWebhookEvent.js";

export const githubWebhookRouter = express.Router();

/**
 * Capture raw body for signature verification.
 * NOTE: This MUST run before the handler that validates the signature.
 */
githubWebhookRouter.use(
    express.raw({ type: "application/json" })
);

githubWebhookRouter.post("/", (req: any, res) => {
    const signature = req.get("x-hub-signature-256");

    if (!signature) {
        return res.status(401).send("Missing signature");
    }

    const hmac = crypto.createHmac("sha256", env.GITHUB_WEBHOOK_SECRET);
    const digest = `sha256=${hmac.update(req.body).digest("hex")}`;

    const sigBuf = Buffer.from(signature);
    const digBuf = Buffer.from(digest);

    if (sigBuf.length !== digBuf.length) {
        return res.status(401).send("Invalid signature");
    }

    if (!crypto.timingSafeEqual(sigBuf, digBuf)) {
        return res.status(401).send("Invalid signature");
    }

    const ctx = normalizeWebhookEvent({
        headers: req.headers,
        payload: req.body,
    });

    console.log("[normalized-event]", {
        name: ctx.event.name,
        repo: ctx.repository.fullName,
        delivery: ctx.event.deliveryId,
    });

    return res.sendStatus(200);
});

