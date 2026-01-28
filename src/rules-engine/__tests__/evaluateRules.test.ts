import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRules } from "../evaluateRules.js";
import type { Rule, RuleContext } from "../types.js";

// Local minimal RuleStore double using the real interface shape.
// If your RuleStore type is not exported from types.ts, import from its file instead.
type Store = {
    getRulesForRepo(args: { installationId: number; repositoryId: number }): Promise<Rule[]>;
};

function makeCtx(eventName: string): RuleContext {
    return {
        event: {
            name: eventName as any,
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
        data: {
            pullRequest: {
                base: { ref: "main" },
                labels: ["bug"],
            },
        },
    };
}

function storeWith(rules: Rule[]): Store {
    return {
        async getRulesForRepo() {
            return rules;
        },
    };
}

test("evaluateRules: deterministic ordering by priority desc then id asc", async () => {
    const ctx = makeCtx("pull_request.opened");

    const rules: Rule[] = [
        {
            id: "b" as any,
            name: "B",
            enabled: true,
            trigger: { event: "pull_request.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any, params: { n: 1 } }],
            // priority omitted => 0
        } as any,
        {
            id: "a" as any,
            name: "A",
            enabled: true,
            trigger: { event: "pull_request.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any, params: { n: 2 } }],
            priority: 10,
        } as any,
        {
            id: "c" as any,
            name: "C",
            enabled: true,
            trigger: { event: "pull_request.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any, params: { n: 3 } }],
            priority: 10,
        } as any,
    ];

    const res = await evaluateRules(storeWith(rules) as any, {
        ctx,
        installationId: 1,
    });

    // priority 10 rules first, tie-break by id asc => a then c, then b
    assert.deepEqual(res.matchedRuleIds.map(String), ["a", "c", "b"]);
    assert.deepEqual(res.actions.map((a) => String(a.ruleId)), ["a", "c", "b"]);
});

test("evaluateRules: firstMatch stops after first matched rule", async () => {
    const ctx = makeCtx("pull_request.opened");

    const rules: Rule[] = [
        {
            id: "a" as any,
            name: "A",
            enabled: true,
            trigger: { event: "pull_request.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any }],
            evaluation: { mode: "firstMatch" as any },
            priority: 10,
        } as any,
        {
            id: "b" as any,
            name: "B",
            enabled: true,
            trigger: { event: "pull_request.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any }],
            priority: 0,
        } as any,
    ];

    const res = await evaluateRules(storeWith(rules) as any, {
        ctx,
        installationId: 1,
    });

    assert.deepEqual(res.matchedRuleIds.map(String), ["a"]);
    assert.equal(res.actions.length, 1);
    assert.equal(res.actions.length, 1);
    assert.equal(String(res.actions[0]!.ruleId), "a");
});

test("evaluateRules: ignores disabled rules and non-matching triggers", async () => {
    const ctx = makeCtx("pull_request.opened");

    const rules: Rule[] = [
        {
            id: "a" as any,
            name: "A",
            enabled: false,
            trigger: { event: "pull_request.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any }],
        } as any,
        {
            id: "b" as any,
            name: "B",
            enabled: true,
            trigger: { event: "issues.opened" as any } as any,
            conditions: { type: "leaf", path: "pullRequest.base.ref", op: "equals", value: "main" } as any,
            actions: [{ type: "noop" as any }],
        } as any,
    ];

    const res = await evaluateRules(storeWith(rules) as any, {
        ctx,
        installationId: 1,
    });

    assert.deepEqual(res.matchedRuleIds, []);
    assert.deepEqual(res.actions, []);
});
