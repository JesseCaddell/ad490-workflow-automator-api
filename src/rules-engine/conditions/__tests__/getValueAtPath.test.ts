import test from "node:test";
import assert from "node:assert/strict";
import { getValueAtPath } from "../getValueAtPath.js";
import type { RuleContext } from "../../types.js";

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
                labels: ["bug", "help wanted"],
            },
            number: 123,
        },
    };
}

test("getValueAtPath: empty path returns undefined", () => {
    const ctx = makeCtx();
    assert.equal(getValueAtPath(ctx, ""), undefined);
    assert.equal(getValueAtPath(ctx, "   "), undefined);
});

test("getValueAtPath: resolves root paths when prefixed", () => {
    const ctx = makeCtx();
    assert.equal(getValueAtPath(ctx, "event.deliveryId"), "deliv_123");
    assert.equal(getValueAtPath(ctx, "repository.fullName"), "octo/repo");
    assert.equal(getValueAtPath(ctx, "actor.login"), "me");
});

test("getValueAtPath: defaults to ctx.data when not root-prefixed", () => {
    const ctx = makeCtx();
    assert.equal(getValueAtPath(ctx, "pullRequest.base.ref"), "main");
    assert.equal(getValueAtPath(ctx, "number"), 123);
});

test("getValueAtPath: missing path returns undefined", () => {
    const ctx = makeCtx();
    assert.equal(getValueAtPath(ctx, "pullRequest.missing.field"), undefined);
    assert.equal(getValueAtPath(ctx, "repository.missing"), undefined);
});
