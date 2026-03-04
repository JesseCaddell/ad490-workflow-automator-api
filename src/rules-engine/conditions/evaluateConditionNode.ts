import type { ConditionNode, RuleContext } from "../ruleTypes.js";
import { getValueAtPath } from "./getValueAtPath.js";
import { applyOperator } from "./operators.js";

/**
 * Evaluate a ConditionNode (leaf or group) against RuleContext.
 * Supports nested all/any/not.
 */
export function evaluateConditionNode(node: ConditionNode, ctx: RuleContext): boolean {
    if (!node) return true;

    if (node.type === "leaf") {
        const actual = getValueAtPath(ctx, node.path);
        return applyOperator(node, actual);
    }

    if (node.type === "group") {
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