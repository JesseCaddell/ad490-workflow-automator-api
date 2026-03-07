// src/rules-engine/__tests__/pipeline.integration.test.ts

import test from "node:test";
import assert from "node:assert/strict";

import { normalizeWebhookEvent } from "../normalize/normalizeWebhookEvent.js";
import { evaluateRules } from "../evaluateRules.js";
import { executeActionStubs } from "../actions/executeActionStubs.js";
import { InMemoryRuleStore } from "../storage/inMemoryRuleStore.js";
import type { Rule } from "../ruleTypes.js";

/**
 * Integration test: webhook headers + payload → normalize → evaluate → execute action stubs.
 * Validates that the full pipeline runs without throwing and produces expected results.
 */
test("pipeline: normalize → evaluate → execute does not throw and produces correct results", async () => {
    // 1. Simulate a GitHub pull_request.opened webhook
    const headers: Record<string, string> = {
        "x-github-event": "pull_request",
        "x-github-delivery": "test-delivery-001",
        "x-hub-signature-256": "unused-in-this-test",
    };

    const payload = {
        action: "opened",
        installation: { id: 99 },
        repository: {
            id: 42,
            full_name: "octo/repo",
        },
        sender: { login: "testuser", id: 7 },
        pull_request: {
            id: 1001,
            number: 5,
            title: "[WIP] Add feature",
            body: "Work in progress",
            state: "open",
            draft: true,
            html_url: "https://github.com/octo/repo/pull/5",
            user: { login: "testuser" },
            base: { ref: "main", sha: "abc123" },
            head: { ref: "feature-branch", sha: "def456" },
            labels: [{ name: "draft" }],
        },
    };

    // 2. Normalize — should not throw
    const ctx = normalizeWebhookEvent({ headers, payload });

    assert.equal(ctx.event.name, "pull_request.opened");
    assert.equal(ctx.installationId, 99);
    assert.equal(ctx.repository.id, 42);
    assert.equal(ctx.repository.fullName, "octo/repo");
    assert.equal(ctx.actor?.login, "testuser");

    // 3. Seed a matching rule
    const store = new InMemoryRuleStore();

    const rule: Rule = {
        id: "test-pipeline-rule",
        name: "Label WIP PRs",
        enabled: true,
        trigger: { event: "pull_request.opened" },
        conditions: {
            type: "leaf",
            path: "pullRequest.title",
            op: "contains",
            value: "[WIP]",
        },
        actions: [
            { type: "addLabel", params: { label: "wip" } },
        ],
        evaluation: { mode: "allMatches" },
    };

    await store.upsertRulesForRepo(
        { installationId: 99, repositoryId: 42 },
        [rule]
    );

    // 4. Evaluate — should not throw, should match the rule
    const evalResult = await evaluateRules(store, { ctx });

    assert.deepEqual(evalResult.matchedRuleIds, ["test-pipeline-rule"]);
    assert.equal(evalResult.actions.length, 1);

    const matchedAction = evalResult.actions[0];
    assert.ok(matchedAction, "Expected actions[0] to exist");
    assert.equal(matchedAction.type, "addLabel");
    assert.equal(matchedAction.ruleId, "test-pipeline-rule");

    // 5. Execute action stubs — should not throw, should succeed
    const actionResults = await executeActionStubs({
        ctx,
        actions: evalResult.actions,
    });

    assert.equal(actionResults.length, 1);

    const stubResult = actionResults[0];
    assert.ok(stubResult, "Expected actionResults[0] to exist");
    assert.equal(stubResult.ok, true);
    assert.equal(stubResult.actionType, "addLabel");
    assert.equal(stubResult.ruleId, "test-pipeline-rule");
});

test("pipeline: normalize → evaluate with no matching rules produces empty results", async () => {
    const headers: Record<string, string> = {
        "x-github-event": "push",
        "x-github-delivery": "test-delivery-002",
    };

    const payload = {
        installation: { id: 99 },
        repository: {
            id: 42,
            full_name: "octo/repo",
        },
        sender: { login: "testuser", id: 7 },
        ref: "refs/heads/main",
        before: "000000",
        after: "aaaaaa",
        commits: [],
    };

    // Normalize
    const ctx = normalizeWebhookEvent({ headers, payload });
    assert.equal(ctx.event.name, "push");

    // Evaluate against empty store
    const store = new InMemoryRuleStore();
    const evalResult = await evaluateRules(store, { ctx });

    assert.deepEqual(evalResult.matchedRuleIds, []);
    assert.deepEqual(evalResult.actions, []);
});