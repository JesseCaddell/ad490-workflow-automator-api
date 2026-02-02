import type { RuleContext, RuleEventName } from "../rules-engine/ruleTypes.js";

export function makeRuleContext(overrides?: Partial<RuleContext>): RuleContext {
    return {
        installationId: 123456,
        event: {
            name: "pull_request.opened" as RuleEventName,
            deliveryId: "deliv_123",
            receivedAt: new Date().toISOString(),
        },
        repository: {
            id: 42,
            owner: "octo",
            name: "repo",
            fullName: "octo/repo",
        },
        actor: { id: 99, login: "me" },
        data: {},
        ...overrides,
    };
}
