import type { RuleContext } from "../coreTypes.js";
import type { ActionStubResult, EvaluatedActionInput } from "./actionTypes.js";
import { addLabelStub } from "./addLabel.stub.js";
import { addCommentStub } from "./addComment.stub.js";

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

            default:
                // Stub engine only supports the two MVP actions for now
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
