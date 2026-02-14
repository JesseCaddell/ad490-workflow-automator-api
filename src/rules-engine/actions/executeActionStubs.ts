// src/rules-engine/actions/executeActionStubs.ts

import type { RuleContext } from "../ruleTypes.js";
import type { ActionStubResult, EvaluatedActionInput } from "./actionTypes.js";
import { addLabelStub } from "./addLabel.stub.js";
import { addCommentStub } from "./addComment.stub.js";

function notImplementedStub(input: {
    ctx: RuleContext;
    action: EvaluatedActionInput;
}): ActionStubResult {
    return {
        ok: false,
        actionType: input.action.type,
        ruleId: input.action.ruleId,
        error: `No stub handler implemented for action type: ${input.action.type}`,
    };
}

export async function executeActionStubs(input: {
    ctx: RuleContext;
    actions: EvaluatedActionInput[];
}): Promise<ActionStubResult[]> {
    const results: ActionStubResult[] = [];

    for (const action of input.actions) {
        switch (action.type) {
            case "addLabel":
                results.push(await addLabelStub({ ctx: input.ctx, action }));
                break;

            case "addComment":
                results.push(await addCommentStub({ ctx: input.ctx, action }));
                break;

            // Allowed by workflow validation (MVP) but not implemented as a stub yet
            case "removeLabel":
            case "setProjectStatus":
                results.push(notImplementedStub({ ctx: input.ctx, action }));
                break;

            default:
                // Stub engine only supports a small set of actions for now
                results.push({
                    ok: false,
                    actionType: action.type,
                    ruleId: action.ruleId,
                    error: `No stub handler implemented for action type: ${action.type}`,
                });
                break;
        }
    }

    return results;
}
