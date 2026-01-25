import type { Action, Rule, RuleContext, RuleId, RuleEvaluationMode } from "./types.js";
import type { RuleStore } from "./storage/ruleStore.js";
import { evaluateConditionNode } from "./conditions/evaluateConditionNode.js";

export interface EvaluatedAction extends Action {
    ruleId: RuleId;
}

export interface EvaluateRulesInput {
    ctx: RuleContext;
    installationId: number;
}

export interface EvaluateRulesResult {
    matchedRuleIds: RuleId[];
    actions: EvaluatedAction[];
}

const DEFAULT_MODE: RuleEvaluationMode = "allMatches";

/**
 * Evaluate a normalized RuleContext against stored rules (repo-scoped).
 * Deterministic output: same ctx + same rules => same matches + action order.
 */
export async function evaluateRules(
    store: RuleStore,
    input: EvaluateRulesInput
): Promise<EvaluateRulesResult> {
    const rules = await store.getRulesForRepo({
        installationId: input.installationId,
        repositoryId: input.ctx.repository.id,
    });

    // 1) Filter enabled + matching trigger
    const eligible = rules.filter((r) => r.enabled && r.trigger?.event === input.ctx.event.name);

    // 2) Deterministic ordering (do not rely on storage order)
    const ordered = eligible.slice().sort((a, b) => {
        // If you later add priority, it goes here. For now: stable by id.
        return String(a.id).localeCompare(String(b.id));
    });

    const matched: Rule[] = [];
    for (const rule of ordered) {
        const ok = evaluateConditionNode(rule.conditions, input.ctx);
        if (!ok) continue;

        matched.push(rule);

        const mode = rule.evaluation?.mode ?? DEFAULT_MODE;
        if (mode === "firstMatch") break;
    }

    const matchedRuleIds = matched.map((r) => r.id);

    // 3) Flatten actions in deterministic order
    const actions: EvaluatedAction[] = matched.flatMap((rule) =>
        (rule.actions ?? []).map((a) => ({
            ...a,
            ruleId: rule.id,
        }))
    );

    return { matchedRuleIds, actions };
}
