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

    // Structured logs for debugging + demo visibility
    console.log(
        "[rules-engine] evaluation",
        JSON.stringify(
            {
                installationId: input.installationId,
                event: {
                    name: input.ctx.event.name,
                    id: input.ctx.event.deliveryId,
                },
                repository: {
                    id: input.ctx.repository.id,
                    fullName: input.ctx.repository.fullName,
                },
                matchedRuleIds,
                actions: actions.map((a) => ({
                    ruleId: a.ruleId,
                    type: a.type,
                    paramKeys: a.params ? Object.keys(a.params) : [],
                })),
            },
            null,
            2
        )
    );

    // MVP stops here. Next issue: execute actions.
}

