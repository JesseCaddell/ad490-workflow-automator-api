import type { RuleContext } from "./types.js";
import type { RuleStore } from "./storage/ruleStore.js";

export interface HandleNormalizedEventInput {
    ctx: RuleContext;
    installationId: number;
}

export async function handleNormalizedEvent(
    store: RuleStore,
    input: HandleNormalizedEventInput
): Promise<void> {

    const rules = await store.getRulesForRepo({
        installationId: input.installationId,
        repositoryId: input.ctx.repository.id,
    });

    // TODO: For Issue #10, we stop here. Next issues plug in evaluation + actions.
    console.log("[rules-engine]", {
        event: input.ctx.event.name,
        repo: input.ctx.repository.fullName,
        rules: rules.length,
    });
}

