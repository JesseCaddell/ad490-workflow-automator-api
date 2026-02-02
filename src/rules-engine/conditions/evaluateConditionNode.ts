import type { ConditionGroup, ConditionLeaf, ConditionNode, RuleContext } from "../coreTypes.js";
import { getValueAtPath } from "./getValueAtPath.js";
import { applyOperator } from "./operators.js";

function isLeaf(n: ConditionNode): n is ConditionLeaf {
    return n.type === "leaf";
}

function isGroup(n: ConditionNode): n is ConditionGroup {
    return n.type === "group";
}

/**
 * Evaluate a ConditionNode (leaf or group) against RuleContext.
 * Supports nested all/any/not.
 */
export function evaluateConditionNode(node: ConditionNode, ctx: RuleContext): boolean {
    if (!node) return true;

    if (isLeaf(node)) {
        const actual = getValueAtPath(ctx, node.path);
        return applyOperator(node, actual);
    }

    if (isGroup(node)) {
        // If multiple are present, treat them as constraints combined with AND.
        let ok = true;

        if (Array.isArray(node.all)) {
            ok = ok && node.all.every((c) => evaluateConditionNode(c, ctx));
        }

        if (Array.isArray(node.any)) {
            ok = ok && node.any.some((c) => evaluateConditionNode(c, ctx));
        }

        if (node.not) {
            ok = ok && !evaluateConditionNode(node.not, ctx);
        }

        return ok;
    }

    return true;
}
