// src/workflows/storage/__tests__/inMemoryWorkflowStore.test.ts

import test from "node:test";
import assert from "node:assert/strict";

import { InMemoryWorkflowStore } from "../inMemoryWorkflowStore.js";
import type { Workflow} from "../../workflowTypes.js";

const keyA = { installationId: 1, repositoryId: 100 };
const keyB = { installationId: 1, repositoryId: 200 };

function wf(id: string, createdAt?: string, repoKey = keyA): Workflow {
    return {
        id,
        name: `WF ${id}`,
        enabled: true,
        scope: {
            installationId: repoKey.installationId,
            repositoryId: repoKey.repositoryId,
        },
        trigger: { event: "pull_request.opened" as any },
        steps: [
            {
                id: "s1",
                name: "Step 1",
                action: { type: "addLabel" as any, params: { label: "x" } },
            },
        ],
        ...(createdAt ? { metadata: { createdAt } } : {}),
    };
}

test("InMemoryWorkflowStore: create + get", async () => {
    const store = new InMemoryWorkflowStore();

    const created = await store.createWorkflow(keyA, wf("a"));
    assert.equal(created.id, "a");
    assert.ok(created.metadata?.createdAt);
    assert.ok(created.metadata?.updatedAt);

    const read = await store.getWorkflow(keyA, "a");
    assert.ok(read);
    assert.equal(read!.id, "a");
});

test("InMemoryWorkflowStore: create throws on duplicate id within same scope", async () => {
    const store = new InMemoryWorkflowStore();

    await store.createWorkflow(keyA, wf("dup"));

    await assert.rejects(
        async () => store.createWorkflow(keyA, wf("dup")),
        /already exists/i
    );
});

test("InMemoryWorkflowStore: same workflow id allowed in different repo scopes", async () => {
    const store = new InMemoryWorkflowStore();

    await store.createWorkflow(keyA, wf("same"));
    await store.createWorkflow(keyB, wf("same", undefined, keyB));

    const a = await store.getWorkflow(keyA, "same");
    const b = await store.getWorkflow(keyB, "same");

    assert.ok(a);
    assert.ok(b);
    assert.equal(a!.scope.repositoryId, 100);
    assert.equal(b!.scope.repositoryId, 200);
});

test("InMemoryWorkflowStore: update", async () => {
    const store = new InMemoryWorkflowStore();

    const created = await store.createWorkflow(keyA, wf("u1"));
    const updated = await store.updateWorkflow(keyA, {
        ...created,
        name: "Updated Name",
    });

    assert.equal(updated.name, "Updated Name");
    assert.equal(updated.metadata?.createdAt, created.metadata?.createdAt);
    assert.notEqual(updated.metadata?.updatedAt, created.metadata?.updatedAt);
});

test("InMemoryWorkflowStore: update throws if missing", async () => {
    const store = new InMemoryWorkflowStore();

    await assert.rejects(
        async () => store.updateWorkflow(keyA, wf("missing")),
        /does not exist/i
    );
});

test("InMemoryWorkflowStore: delete returns boolean + removes item", async () => {
    const store = new InMemoryWorkflowStore();

    await store.createWorkflow(keyA, wf("d1"));

    const removed = await store.deleteWorkflow(keyA, "d1");
    assert.equal(removed, true);

    const read = await store.getWorkflow(keyA, "d1");
    assert.equal(read, undefined);

    const removedAgain = await store.deleteWorkflow(keyA, "d1");
    assert.equal(removedAgain, false);
});

test("InMemoryWorkflowStore: list is deterministic by createdAt asc then id asc", async () => {
    const store = new InMemoryWorkflowStore();

    // Intentionally create out of order
    await store.createWorkflow(keyA, wf("c", "2026-01-01T00:00:00.000Z"));
    await store.createWorkflow(keyA, wf("a", "2026-01-01T00:00:00.000Z")); // same createdAt, id tie-break
    await store.createWorkflow(keyA, wf("b", "2025-12-31T23:59:59.000Z"));

    const listed = await store.listWorkflowsForRepo(keyA);
    assert.deepEqual(listed.map((x) => x.id), ["b", "a", "c"]);
});

test("InMemoryWorkflowStore: list is scoped by installationId + repositoryId", async () => {
    const store = new InMemoryWorkflowStore();

    await store.createWorkflow(keyA, wf("a1"));
    await store.createWorkflow(keyB, wf("b1", undefined, keyB));

    const listA = await store.listWorkflowsForRepo(keyA);
    const listB = await store.listWorkflowsForRepo(keyB);

    assert.deepEqual(listA.map((x) => x.id), ["a1"]);
    assert.deepEqual(listB.map((x) => x.id), ["b1"]);
});
