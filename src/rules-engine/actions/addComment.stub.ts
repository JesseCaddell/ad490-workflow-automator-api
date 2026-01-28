import type { ActionHandler } from "./types.js";
import { logActionStub } from "./logging.js";

export const addCommentStub: ActionHandler = async ({ action }) => {
    const ruleId = action.ruleId;

    if (action.type !== "addComment") {
        return {
            ok: false,
            actionType: action.type,
            ruleId,
            error: `addCommentStub received unsupported action type: ${action.type}`,
        };
    }

    const body = typeof action.params?.body === "string" ? action.params.body : undefined;

    if (!body) {
        return {
            ok: false,
            actionType: action.type,
            ruleId,
            error: "Missing required params.body (string)",
        };
    }

    const bodyPreview = body.length > 120 ? `${body.slice(0, 120)}…` : body;

    // TODO(real): Use Octokit to create an issue/PR comment.
    // Requires repo + issue_number/pr_number in context.
    logActionStub({
        ruleId,
        actionType: action.type,
        target: { bodyPreview },
        message: "Stub: would add comment",
        data: { body },
    });

    return {
        ok: true,
        actionType: action.type,
        ruleId,
        target: { bodyPreview },
    };
};
