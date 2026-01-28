import type { ActionHandler } from "./types.js";
import { logActionStub } from "./logging.js";

export const addLabelStub: ActionHandler = async ({ action }) => {
    const ruleId = action.ruleId;

    if (action.type !== "addLabel") {
        return {
            ok: false,
            actionType: action.type,
            ruleId,
            error: `addLabelStub received unsupported action type: ${action.type}`,
        };
    }

    const label = typeof action.params?.label === "string" ? action.params.label : undefined;

    if (!label) {
        return {
            ok: false,
            actionType: action.type,
            ruleId,
            error: "Missing required params.label (string)",
        };
    }

    // TODO(real): Use Octokit to add label to an issue/PR.
    // Requires repo + issue_number/pr_number in context.
    logActionStub({
        ruleId,
        actionType: action.type,
        target: { label },
        message: "Stub: would add label",
    });

    return {
        ok: true,
        actionType: action.type,
        ruleId,
        target: { label },
    };
};
