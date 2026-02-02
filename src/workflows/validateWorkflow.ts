// src/workflows/validateWorkflow.ts
import type { Workflow } from "./workflowTypes.js";

export function validateWorkflow(wf: Workflow): string[] {
    const errors: string[] = [];

    if (!wf.id) errors.push("workflow.id is required");
    if (!wf.name || wf.name.trim().length === 0) errors.push("workflow.name is required");
    if (wf.name && wf.name.length > 80) errors.push("workflow.name must be <= 80 chars");

    if (!wf.scope?.repositoryId) errors.push("workflow.scope.repositoryId is required");

    if (!wf.scope?.installationId) errors.push("workflow.scope.installationId is required");

    if (!wf.trigger?.event) errors.push("workflow.trigger.event is required");

    if (!Array.isArray(wf.steps) || wf.steps.length === 0) {
        errors.push("workflow.steps must contain at least 1 step");
        return errors;
    }

    if (wf.steps.length > 25) errors.push("workflow.steps must be <= 25 steps");

    for (const step of wf.steps) {
        if (!step.id) errors.push("workflow.steps[].id is required");
        if (!step.name || step.name.trim().length === 0) errors.push(`step(${step.id}).name is required`);
        if (step.name && step.name.length > 80) errors.push(`step(${step.id}).name must be <= 80 chars`);

        if (!step.action?.type) errors.push(`step(${step.id}).action.type is required`);
    }

    return errors;
}
