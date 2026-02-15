// src/workflows/__tests__/executeWorkflowsForContext.test.ts

import test from "node:test";
import assert from "node:assert/strict";

import { InMemoryWorkflowStore } from "../storage/inMemoryWorkflowStore.js";
import { executeWorkflowsForContext } from "../executeWorkflowsForContext.js";

import type { RuleContext } from "../../rules-engine/ruleTypes.js";
import type { Workflow } from "../workflowTypes.js";

function makeCtx(eventName: string): RuleContext {
    return {
        installationId: 1,
        event: {
            name: eventName as any,
            deliveryId: "d1",
            receivedAt: new Date().toISOString(),
        },
        repository: {
            id: 2,
            owner: "owner",
            name: "repo",
            fullName: "owner/repo",
        },
        actor: { login: "bot", id: 10 },
        data: {},
    };
}

function makeWorkflow(overrides: Partial<Workflow>): Workflow {
    return {
        id: overrides.id ?? "wf1",
        name: overrides.name ?? "Test Workflow",
        enabled: overrides.enabled ?? true,
        scope: overrides.scope ?? { installationId: 1, repositoryId: 2 },
        trigger: overrides.trigger ?? { event: "issue.opened" as any },
        steps:
            overrides.steps ??
            [
                {
                    id: "s1",
                    name: "Add label",
                    action: { type: "addLabel", params: { label: "triage" } },
                },
            ],
        metadata: overrides.metadata ?? { createdBy: "api" },
    };
}

test("executeWorkflowsForContext: trigger match executes steps in order", async () => {
    const store = new InMemoryWorkflowStore();

    const wf = makeWorkflow({
        id: "wf_match",
        trigger: { event: "issue.opened" as any },
        steps: [
            {
                id: "s1",
                name: "Add label",
                action: { type: "addLabel", params: { label: "triage" } },
            },
            {
                id: "s2",
                name: "Add comment",
                action: { type: "addComment", params: { body: "hello" } },
            },
        ],
    });

    await store.createWorkflow({ installationId: 1, repositoryId: 2 }, wf);

    const ctx = makeCtx("issue.opened");

    const results = await executeWorkflowsForContext({ workflowStore: store, ctx });

    assert.equal(results.length, 1);

    const first = results[0];
    assert.ok(first);

    assert.equal(first.workflowId, "wf_match");
    assert.equal(first.stepsAttempted, 2);
    assert.equal(first.stepResults.length, 2);

    const step1 = first.stepResults[0];
    const step2 = first.stepResults[1];

    assert.ok(step1);
    assert.ok(step2);

    assert.equal(step1.stepId, "s1");
    assert.equal(step1.actionType, "addLabel");
    assert.equal(step1.ok, true);

    assert.equal(step2.stepId, "s2");
    assert.equal(step2.actionType, "addComment");
    assert.equal(step2.ok, true);
});


test("executeWorkflowsForContext: trigger no-match executes nothing", async () => {
    const store = new InMemoryWorkflowStore();

    const wf = makeWorkflow({
        id: "wf_nomatch",
        trigger: { event: "issue.opened" as any },
    });

    await store.createWorkflow({ installationId: 1, repositoryId: 2 }, wf);

    const ctx = makeCtx("issue.closed");

    const results = await executeWorkflowsForContext({ workflowStore: store, ctx });

    assert.deepEqual(results, []);
});

test("executeWorkflowsForContext: disabled workflow is ignored", async () => {
    const store = new InMemoryWorkflowStore();

    const wf = makeWorkflow({
        id: "wf_disabled",
        enabled: false,
        trigger: { event: "issue.opened" as any },
    });

    await store.createWorkflow({ installationId: 1, repositoryId: 2 }, wf);

    const ctx = makeCtx("issue.opened");

    const results = await executeWorkflowsForContext({ workflowStore: store, ctx });

    assert.deepEqual(results, []);
});
