import type {
    Action,
    Rule,
    RuleContext,
    RuleId,
    RuleEvaluationMode,
} from "./types.js";
import type { RuleStore } from "./storage/ruleStore.js";
import { evaluateConditionNode } from "./conditions/evaluateConditionNode.js";

export interface EvaluatedAction extends Action {
    ruleId: RuleId;
}

export interface EvaluateRulesInput {
    ctx: RuleContext;
}

export interface EvaluateRulesResult {
    matchedRuleIds: RuleId[];
    actions: EvaluatedAction[];
}

const DEFAULT_MODE: RuleEvaluationMode = "allMatches";

/**
 * Evaluate a normalized RuleContext against stored rules (repo-scoped).
 * Deterministic output:
 *  - Stable rule ordering
 *  - Stable action ordering
 *  - Explicit evaluation modes
 */
export async function evaluateRules(
    store: RuleStore,
    input: EvaluateRulesInput
): Promise<EvaluateRulesResult> {
    const rules = await store.getRulesForRepo({
        installationId: input.ctx.installationId,
        repositoryId: input.ctx.repository.id,
    });

    /**
     * 1) Filter to rules that can even be considered
     */
    const eligibleRules = rules.filter(
        (rule) =>
            rule.enabled &&
            rule.trigger?.event === input.ctx.event.name
    );

    /**
     * 2) Deterministic rule ordering
     *    - priority DESC (if present)
     *    - id ASC (tie-breaker)
     */
    const orderedRules = eligibleRules.slice().sort((a, b) => {
        const aPriority = typeof (a as any).priority === "number" ? (a as any).priority : 0;
        const bPriority = typeof (b as any).priority === "number" ? (b as any).priority : 0;

        if (aPriority !== bPriority) {
            return bPriority - aPriority;
        }

        return String(a.id).localeCompare(String(b.id));
    });

    /**
     * 3) Evaluate rules in order
     */
    const matchedRules: Rule[] = [];

    for (const rule of orderedRules) {
        const conditionsPass = evaluateConditionNode(rule.conditions, input.ctx);
        if (!conditionsPass) continue;

        matchedRules.push(rule);

        const mode = rule.evaluation?.mode ?? DEFAULT_MODE;
        if (mode === "firstMatch") {
            break;
        }
    }

    /**
     * 4) Produce deterministic outputs
     */
    const matchedRuleIds = matchedRules.map((rule) => rule.id);

    const actions: EvaluatedAction[] = matchedRules.flatMap((rule) =>
        (rule.actions ?? []).map((action) => ({
            ...action,
            ruleId: rule.id,
        }))
    );

    return {
        matchedRuleIds,
        actions,
    };
}
