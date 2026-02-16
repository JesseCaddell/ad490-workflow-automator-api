// src/workflows/validateWorkflow.ts

import type { Workflow } from "./workflowTypes.js";
import type { ActionType } from "../rules-engine/ruleTypes.js";

export type ValidationError = {
    path: string; // e.g. "name", "trigger.event", "steps[0].type"
    message: string;
};

/**
 * Engine-level normalized events we may receive.
 * This is mainly for documentation/future use.
 * (push stays here for demo ping)
 */
export const SUPPORTED_NORMALIZED_EVENTS = [
    "push",

    "issue.opened",
    "issue.assigned",
    "issue.closed",
    "issue.reopened",

    "pull_request.opened",
    "pull_request.draft",
    "pull_request.ready",
    "pull_request.closed",
    "pull_request.merged",

    "pull_request_review.changes_requested",
] as const;

/**
 * Workflow trigger allowlist (MVP).
 * Include "push" for demo workflows.
 */
export const SUPPORTED_WORKFLOW_EVENTS = [
    "push",

    "issue.opened",
    "issue.assigned",
    "issue.closed",
    "issue.reopened",

    "pull_request.opened",
    "pull_request.draft",
    "pull_request.ready",
    "pull_request.closed",
    "pull_request.merged",

    "pull_request_review.changes_requested",
] as const;

/**
 * Workflow action allowlist (strict MVP).
 * Keep this limited to action handlers you can actually execute today.
 * Expand later as you implement more action stubs/handlers.
 */
export const SUPPORTED_WORKFLOW_ACTION_TYPES: ReadonlyArray<ActionType> = [
    "setProjectStatus",
    "addLabel",
    "addComment",
    "removeLabel",
] as const;

function add(errors: ValidationError[], path: string, message: string) {
    errors.push({ path, message });
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === "string" && v.trim().length > 0;
}

function isObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
    return typeof v === "number" && Number.isFinite(v);
}

export function validateWorkflow(wf: Workflow): ValidationError[] {
    const errors: ValidationError[] = [];

    // id (server assigned, still validate)
    if (!isNonEmptyString(wf.id)) add(errors, "id", "id is required");

    // name
    if (!isNonEmptyString(wf.name)) {
        add(errors, "name", "name is required");
    } else if (wf.name.trim().length > 80) {
        add(errors, "name", "name must be <= 80 chars");
    }

    // description (optional)
    if ((wf as any).description !== undefined && typeof (wf as any).description !== "string") {
        add(errors, "description", "description must be a string");
    }

    // scope
    if (!wf.scope) {
        add(errors, "scope.installationId", "scope.installationId is required");
        add(errors, "scope.repositoryId", "scope.repositoryId is required");
    } else {
        const inst = (wf.scope as any).installationId;
        const repo = (wf.scope as any).repositoryId;

        if (!isFiniteNumber(inst)) add(errors, "scope.installationId", "scope.installationId must be a number");
        if (!isFiniteNumber(repo)) add(errors, "scope.repositoryId", "scope.repositoryId must be a number");
    }

    // trigger.event — strict allowlist
    const event = wf.trigger?.event;
    if (!isNonEmptyString(event)) {
        add(errors, "trigger.event", "trigger.event is required");
    } else if (!SUPPORTED_WORKFLOW_EVENTS.includes(event as any)) {
        add(errors, "trigger.event", `Unsupported workflow event: ${event}`);
    }

    // steps
    if (!Array.isArray(wf.steps) || wf.steps.length === 0) {
        add(errors, "steps", "steps must contain at least 1 step");
        return errors;
    }
    if (wf.steps.length > 25) add(errors, "steps", "steps must be <= 25 steps");

    wf.steps.forEach((stepRaw: any, i) => {
        const base = `steps[${i}]`;

        if (!isObject(stepRaw)) {
            add(errors, base, "step must be an object");
            return;
        }

        /**
         * Support BOTH step shapes:
         *
         * 1) Simple editor shape (web MVP):
         *    { type: "addLabel", params: { ... } }
         *
         * 2) Richer shape (possible future):
         *    { id, name, action: { type, params } }
         */

        const hasActionObject = isObject((stepRaw as any).action);

        const actionType = hasActionObject
            ? (stepRaw as any).action.type
            : (stepRaw as any).type;

        const params = hasActionObject
            ? (stepRaw as any).action.params
            : (stepRaw as any).params;

        // Optional fields (only validate if present)
        if ("id" in stepRaw && stepRaw.id !== undefined) {
            if (!isNonEmptyString(stepRaw.id)) add(errors, `${base}.id`, "id must be a non-empty string");
        }

        if ("name" in stepRaw && stepRaw.name !== undefined) {
            if (!isNonEmptyString(stepRaw.name)) {
                add(errors, `${base}.name`, "name must be a non-empty string");
            } else if (stepRaw.name.trim().length > 80) {
                add(errors, `${base}.name`, "name must be <= 80 chars");
            }
        }

        // action.type required
        const typePath = hasActionObject ? `${base}.action.type` : `${base}.type`;

        if (!isNonEmptyString(actionType)) {
            add(errors, typePath, "action type is required");
        } else if (!SUPPORTED_WORKFLOW_ACTION_TYPES.includes(actionType as any)) {
            add(errors, typePath, `Unsupported action type: ${actionType}`);
        }

        // params optional, but if present must be an object
        const paramsPath = hasActionObject ? `${base}.action.params` : `${base}.params`;
        if (params !== undefined && !isObject(params)) {
            add(errors, paramsPath, "params must be an object");
        }
    });

    return errors;
}
