// src/workflows/validateWorkflow.ts

import type { Workflow } from "./workflowTypes.js";
import type { ActionType } from "../rules-engine/ruleTypes.js";

export type ValidationError = {
    path: string; // e.g. "name", "trigger.event", "steps[0].action.type"
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
 * push intentionally excluded (demo-only).
 * If you ever want push-triggered workflows, add "push" here.
 */
export const SUPPORTED_WORKFLOW_EVENTS = [
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

export function validateWorkflow(wf: Workflow): ValidationError[] {
    const errors: ValidationError[] = [];

    // id (server assigned, still validate)
    if (!isNonEmptyString(wf.id)) add(errors, "id", "id is required");

    // name
    if (!isNonEmptyString(wf.name)) add(errors, "name", "name is required");
    if (wf.name.length > 80) {
        add(errors, "name", "name must be <= 80 chars");
    }

    // scope
    if (!wf.scope) {
        add(errors, "scope.repositoryId", "scope.repositoryId is required");
    }
    if (!wf.scope) {
        add(errors, "scope.installationId", "scope.installationId is required");
    }

    // trigger.event — strict workflow allowlist
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

    wf.steps.forEach((step, i) => {
        const base = `steps[${i}]`;

        if (!isNonEmptyString(step.id)) add(errors, `${base}.id`, "id is required");

        if (!isNonEmptyString(step.name)) add(errors, `${base}.name`, "name is required");
        if (step.name.length > 80) {
            add(errors, `${base}.name`, "name must be <= 80 chars");
        }

        const actionType = step.action?.type;
        if (!isNonEmptyString(actionType)) {
            add(errors, `${base}.action.type`, "action.type is required");
        } else if (!SUPPORTED_WORKFLOW_ACTION_TYPES.includes(actionType as any)) {
            add(errors, `${base}.action.type`, `Unsupported action type: ${actionType}`);
        }
    });

    return errors;
}
