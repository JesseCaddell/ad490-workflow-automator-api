// src/workflows/types.ts

import type { ActionType, RuleEventName, RuleContext } from "../rules-engine/coreTypes.js";

export type WorkflowId = string;
export type WorkflowStepId = string;

export interface WorkflowScope {
    repositoryId: number;
    installationId: number;
}

/**
 * MVP workflow:
 * - 1 trigger
 * - linear steps
 * - no branching
 * - no versioning
 */
export interface Workflow {
    id: WorkflowId;

    name: string;
    description?: string;
    enabled: boolean;

    scope: WorkflowScope;

    trigger: WorkflowTrigger;

    steps: WorkflowStep[];

    metadata?: {
        createdAt?: string; // ISO
        updatedAt?: string; // ISO
        createdBy?: "seed" | "ui" | "api";
    };
}

/**
 * Must match RuleContext.event.name (normalized event name).
 */
export interface WorkflowTrigger {
    event: RuleEventName;
}

/**
 * Linear step (MVP).
 */
export interface WorkflowStep {
    id: WorkflowStepId;
    name: string;
    enabled?: boolean; // optional for MVP, useful for UI toggles later

    action: WorkflowAction;
}

/**
 * Must align with rules-engine action types.
 * We intentionally reuse ActionType and Action params shape.
 */
export interface WorkflowAction {
    type: ActionType;
    params?: Record<string, unknown>;
}

/**
 * Optional helper: strongly typed runner input later
 */
export interface WorkflowRunInput {
    ctx: RuleContext;
    workflow: Workflow;
}
