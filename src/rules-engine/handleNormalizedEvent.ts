import type { RuleContext } from "./types.js";
import type { RuleStore } from "./storage/ruleStore.js";
import { evaluateRules } from "./evaluateRules.js";

export interface HandleNormalizedEventInput {
    ctx: RuleContext;
    installationId: number;
}

export async function handleNormalizedEvent(
    store: RuleStore,
    input: HandleNormalizedEventInput
): Promise<void> {
    const { matchedRuleIds, actions } = await evaluateRules(store, {
        ctx: input.ctx,
        installationId: input.installationId,
    });

    console.log("[rules-engine]", {
        event: input.ctx.event.name,
        repo: input.ctx.repository.fullName,
        matchedRuleIds,
        actions: actions.map((a) => ({
            ruleId: a.ruleId,
            type: a.type,
            paramsKeys: a.params ? Object.keys(a.params) : [],
        })),
    });

    //TODO: MVP: stop here. Next issue plugs in execution.
}


