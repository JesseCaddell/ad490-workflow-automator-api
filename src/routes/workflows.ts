import express from "express";
import crypto from "crypto";

import type { Workflow } from "../workflows/workflowTypes.js";
import type {
    WorkflowOwnerKey,
    WorkflowStore,
} from "../workflows/storage/workflowStore.js";

type ApiErrorCode =
    | "BAD_REQUEST"
    | "UNAUTHORIZED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INTERNAL";

function ok(res: express.Response, data: unknown, status = 200) {
    return res.status(status).json({ ok: true, data });
}

function fail(
    res: express.Response,
    code: ApiErrorCode,
    message: string,
    status: number
) {
    return res.status(status).json({ ok: false, error: { code, message } });
}

/**
 * MVP scope resolution:
 * Non-webhook routes must explicitly provide scope.
 *
 * Headers:
 *   x-installation-id
 *   x-repository-id
 */
function requireScope(
    req: express.Request
): { key: WorkflowOwnerKey } | { error: "UNAUTHORIZED" | "BAD_REQUEST" } {
    const instRaw = req.header("x-installation-id");
    const repoRaw = req.header("x-repository-id");

    if (!instRaw || !repoRaw) return { error: "UNAUTHORIZED" };

    const installationId = Number(instRaw);
    const repositoryId = Number(repoRaw);

    if (!Number.isFinite(installationId) || !Number.isFinite(repositoryId)) {
        return { error: "BAD_REQUEST" };
    }

    return { key: { installationId, repositoryId } };
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateCreatePayload(
    body: unknown
):
    | {
    name: string;
    triggerEvent: string;
    steps: unknown[];
    description?: string;
    enabled?: boolean;
}
    | { error: string } {
    if (!isObject(body)) return { error: "Body must be a JSON object." };

    const { name, description, enabled, trigger, steps } = body;

    if (typeof name !== "string" || name.trim().length === 0) {
        return { error: "name is required." };
    }

    if (
        !isObject(trigger) ||
        typeof trigger.event !== "string" ||
        trigger.event.trim().length === 0
    ) {
        return { error: "trigger.event is required." };
    }

    if (description !== undefined && typeof description !== "string") {
        return { error: "description must be a string." };
    }

    if (enabled !== undefined && typeof enabled !== "boolean") {
        return { error: "enabled must be a boolean." };
    }

    if (steps !== undefined && !Array.isArray(steps)) {
        return { error: "steps must be an array." };
    }

    return {
        name: name.trim(),
        triggerEvent: trigger.event.trim(),
        steps: Array.isArray(steps) ? steps : [],
        ...(description !== undefined ? { description } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
    };
}

function validatePatchPayload(
    body: unknown
): { name?: string; description?: string; enabled?: boolean } | { error: string } {
    if (!isObject(body)) return { error: "Body must be a JSON object." };

    const out: { name?: string; description?: string; enabled?: boolean } = {};

    if ("name" in body) {
        if (typeof body.name !== "string" || body.name.trim().length === 0) {
            return { error: "name must be a non-empty string." };
        }
        out.name = body.name.trim();
    }

    if ("description" in body) {
        if (body.description !== undefined && typeof body.description !== "string") {
            return { error: "description must be a string." };
        }
        if (body.description !== undefined) {
            out.description = body.description;
        }
    }

    if ("enabled" in body) {
        if (typeof body.enabled !== "boolean") {
            return { error: "enabled must be a boolean." };
        }
        out.enabled = body.enabled;
    }

    return out;
}


export function workflowsRouter(
    workflowStore: WorkflowStore
): express.Router {
    const router = express.Router();

    // JSON parsing stays local (webhooks need raw body)
    router.use(express.json());

    // LIST
    router.get("/", async (req, res) => {
        const scope = requireScope(req);
        if ("error" in scope) {
            return scope.error === "UNAUTHORIZED"
                ? fail(res, "UNAUTHORIZED", "Missing scope headers.", 401)
                : fail(res, "BAD_REQUEST", "Invalid scope headers.", 400);
        }

        const workflows = await workflowStore.listWorkflowsForRepo(scope.key);
        return ok(res, workflows);
    });

    // CREATE
    router.post("/", async (req, res) => {
        const scope = requireScope(req);
        if ("error" in scope) {
            return scope.error === "UNAUTHORIZED"
                ? fail(res, "UNAUTHORIZED", "Missing scope headers.", 401)
                : fail(res, "BAD_REQUEST", "Invalid scope headers.", 400);
        }

        const parsed = validateCreatePayload(req.body);
        if ("error" in parsed) {
            return fail(res, "BAD_REQUEST", parsed.error, 400);
        }

        const workflow: Workflow = {
            id: crypto.randomUUID(),
            name: parsed.name,
            enabled: parsed.enabled ?? true,
            scope: scope.key,
            trigger: { event: parsed.triggerEvent as any },
            steps: parsed.steps as any,
            metadata: { createdBy: "api" },
            ...(parsed.description !== undefined
                ? { description: parsed.description }
                : {}),
        };

        try {
            const created = await workflowStore.createWorkflow(scope.key, workflow);
            return ok(res, created, 201);
        } catch {
            return fail(res, "CONFLICT", "Workflow already exists.", 409);
        }
    });

    // GET
    router.get("/:workflowId", async (req, res) => {
        const scope = requireScope(req);
        if ("error" in scope) {
            return scope.error === "UNAUTHORIZED"
                ? fail(res, "UNAUTHORIZED", "Missing scope headers.", 401)
                : fail(res, "BAD_REQUEST", "Invalid scope headers.", 400);
        }

        const wf = await workflowStore.getWorkflow(
            scope.key,
            req.params.workflowId
        );

        if (!wf) return fail(res, "NOT_FOUND", "Workflow not found.", 404);
        return ok(res, wf);
    });

    // PATCH
    router.patch("/:workflowId", async (req, res) => {
        const scope = requireScope(req);
        if ("error" in scope) {
            return scope.error === "UNAUTHORIZED"
                ? fail(res, "UNAUTHORIZED", "Missing scope headers.", 401)
                : fail(res, "BAD_REQUEST", "Invalid scope headers.", 400);
        }

        const existing = await workflowStore.getWorkflow(
            scope.key,
            req.params.workflowId
        );
        if (!existing) return fail(res, "NOT_FOUND", "Workflow not found.", 404);

        const patch = validatePatchPayload(req.body);
        if ("error" in patch) {
            return fail(res, "BAD_REQUEST", patch.error, 400);
        }

        const updated: Workflow = {
            ...existing,
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
            ...(patch.description !== undefined ? { description: patch.description } : {}),
            scope: existing.scope,
            trigger: existing.trigger,
            steps: existing.steps,
            metadata: {
                ...(existing.metadata ?? {}),
                createdBy: existing.metadata?.createdBy ?? "api",
            },
        };



        const saved = await workflowStore.updateWorkflow(scope.key, updated);
        return ok(res, saved);
    });

    // DELETE
    router.delete("/:workflowId", async (req, res) => {
        const scope = requireScope(req);
        if ("error" in scope) {
            return scope.error === "UNAUTHORIZED"
                ? fail(res, "UNAUTHORIZED", "Missing scope headers.", 401)
                : fail(res, "BAD_REQUEST", "Invalid scope headers.", 400);
        }

        const deleted = await workflowStore.deleteWorkflow(
            scope.key,
            req.params.workflowId
        );

        if (!deleted) return fail(res, "NOT_FOUND", "Workflow not found.", 404);
        return res.sendStatus(204);
    });

    return router;
}
