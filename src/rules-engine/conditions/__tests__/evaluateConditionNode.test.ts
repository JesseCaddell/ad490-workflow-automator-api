import test from "node:test";
import assert from "node:assert/strict";
import { evaluateConditionNode } from "../evaluateConditionNode.js";
import type { ConditionNode, RuleContext } from "../../types.js";

function makeCtx(): RuleContext {
    return {
        event: {
            name: "pull_request.opened" as any,
            deliveryId: "deliv_123",
            receivedAt: new Date().toISOString(),
        },
        repository: {
            id: 1,
            owner: "octo",
            name: "repo",
            fullName: "octo/repo",
        },
        actor: { id: 99, login: "me" },
        data: {
            pullRequest: {
                base: { ref: "main" },
                title: "Fix: bug in parser",
                labels: ["bug", "urgent"],
            },
        },
    };
}

test("evaluateConditionNode: leaf exists", () => {
    const ctx = makeCtx();

    const node: ConditionNode = {
        type: "leaf",
        path: "pullRequest.title",
        op: "exists",
    } as any;

    assert.equal(evaluateConditionNode(node, ctx), true);
});

test("evaluateConditionNode: leaf equals", () => {
    const ctx = makeCtx();

    const node: ConditionNode = {
        type: "leaf",
        path: "pullRequest.base.ref",
        op: "equals",
        value: "main",
    } as any;

    assert.equal(evaluateConditionNode(node, ctx), true);
});

test("evaluateConditionNode: leaf contains (string)", () => {
    const ctx = makeCtx();

    const node: ConditionNode = {
        type: "leaf",
        path: "pullRequest.title",
        op: "contains",
        value: "bug",
    } as any;

    assert.equal(evaluateConditionNode(node, ctx), true);
});

test("evaluateConditionNode: leaf contains (array)", () => {
    const ctx = makeCtx();

    const node: ConditionNode = {
        type: "leaf",
        path: "pullRequest.labels",
        op: "contains",
        value: "urgent",
    } as any;

    assert.equal(evaluateConditionNode(node, ctx), true);
});

test("evaluateConditionNode: leaf in", () => {
    const ctx = makeCtx();

    const node: ConditionNode = {
        type: "leaf",
        path: "pullRequest.base.ref",
        op: "in",
        value: ["main", "develop"],
    } as any;

    assert.equal(evaluateConditionNode(node, ctx), true);
});

test("evaluateConditionNode: group all/any/not", () => {
    const ctx = makeCtx();

    const node: ConditionNode = {
        type: "group",
        all: [
            {
                type: "leaf",
                path: "pullRequest.base.ref",
                op: "equals",
                value: "main",
            },
            {
                type: "group",
                any: [
                    {
                        type: "leaf",
                        path: "pullRequest.labels",
                        op: "contains",
                        value: "urgent",
                    },
                    {
                        type: "leaf",
                        path: "pullRequest.labels",
                        op: "contains",
                        value: "p0",
                    },
                ],
            },
        ],
        not: {
            type: "leaf",
            path: "pullRequest.title",
            op: "contains",
            value: "WIP",
        },
    } as any;

    assert.equal(evaluateConditionNode(node, ctx), true);
});
