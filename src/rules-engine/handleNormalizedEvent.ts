import type { RuleContext } from "./types.js";
import type { RuleStore } from "./storage/ruleStore.js";
import { evaluateRules } from "./evaluateRules.js";
import { executeActionStubs } from "./actions/executeActionStubs.js";

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

    // Execute action stubs (log-only, safe for end-to-end tests)
    const actionResults = await executeActionStubs({
        ctx: input.ctx,
        actions,
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
                actionResults,
            },
            null,
            2
        )
    );

    // TODO(real): Replace stubs with real GitHub execution (Octokit) once MVP demo is complete.
}


