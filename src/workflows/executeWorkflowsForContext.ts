// src/workflows/executeWorkflowsForContext.ts

import type { RuleContext } from "../rules-engine/ruleTypes.js";
import type { WorkflowOwnerKey, WorkflowStore } from "./storage/workflowStore.js";
import type { ActionStubResult, EvaluatedActionInput } from "../rules-engine/actions/actionTypes.js";
import { executeActionStubs } from "../rules-engine/actions/executeActionStubs.js";

export type WorkflowStepExecution = {
    stepId: string;
    actionType: string;
    ok: boolean;
    error?: string;
};

export type WorkflowExecutionResult = {
    workflowId: string;
    workflowName: string;
    matched: boolean;
    stepsAttempted: number;
    stepResults: WorkflowStepExecution[];
};

export async function executeWorkflowsForContext(input: {
    workflowStore: WorkflowStore;
    ctx: RuleContext;
}): Promise<WorkflowExecutionResult[]> {
    const key: WorkflowOwnerKey = {
        installationId: input.ctx.installationId,
        repositoryId: input.ctx.repository.id,
    };

    const workflows = await input.workflowStore.listWorkflowsForRepo(key);

    const matched = workflows.filter(
        (wf) => wf.enabled && wf.trigger?.event === input.ctx.event.name
    );

    const results: WorkflowExecutionResult[] = [];

    for (const wf of matched) {
        const wfResult: WorkflowExecutionResult = {
            workflowId: wf.id,
            workflowName: wf.name,
            matched: true,
            stepsAttempted: 0,
            stepResults: [],
        };

        for (const step of wf.steps) {
            if (step.enabled === false) continue;

            wfResult.stepsAttempted += 1;

            const evaluatedAction: EvaluatedActionInput = {
                type: step.action.type,
                ruleId: `workflow:${wf.id}`,
                ...(step.action.params !== undefined ? { params: step.action.params } : {}),
            };

            const stubResults: ActionStubResult[] = await executeActionStubs({
                ctx: input.ctx,
                actions: [evaluatedAction],
            });

            const r = stubResults[0];

            if (!r) {
                wfResult.stepResults.push({
                    stepId: step.id,
                    actionType: step.action.type,
                    ok: false,
                    error: "No stub result returned for action",
                });
                continue;
            }

            wfResult.stepResults.push({
                stepId: step.id,
                actionType: step.action.type,
                ok: r.ok,
                ...(r.ok ? {} : { error: r.error }),
            });
        }

        results.push(wfResult);
    }

    return results;
}