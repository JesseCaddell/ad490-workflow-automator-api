import express from "express";
import crypto from "crypto";
import { env } from "../config/env.js";

export const githubWebhookRouter = express.Router();

/**
 * Capture raw body for signature verification
 */
githubWebhookRouter.use(
    express.json({
        verify: (req: any, _res, buf) => {
            req.rawBody = buf;
        },
    })
);

githubWebhookRouter.post("/", (req: any, res) => {
    const signature = req.headers["x-hub-signature-256"] as string | undefined;

    if (!signature) {
        return res.status(401).send("Missing signature");
    }

    const hmac = crypto.createHmac("sha256", env.GITHUB_WEBHOOK_SECRET);
    const digest = `sha256=${hmac.update(req.rawBody).digest("hex")}`;

    if (
        !crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(digest)
        )
    ) {
        return res.status(401).send("Invalid signature");
    }

    const event = req.headers["x-github-event"];
    const delivery = req.headers["x-github-delivery"];

    console.log("[webhook]", { event, delivery });

    res.sendStatus(200);
});
