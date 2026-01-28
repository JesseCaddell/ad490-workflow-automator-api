// src/rules-engine/actions/__tests__/executeActionStubs.test.ts

import test from "node:test";
import assert from "node:assert/strict";

import { executeActionStubs } from "../executeActionStubs.js";
import type { RuleContext, ActionType } from "../../types.js";
import type { ActionStubResult, EvaluatedActionInput } from "../types.js";

function makeCtx(): RuleContext {
    // Minimal mock; keep it aligned with RuleContext fields used by the engine.
    return {
        event: {
            name: "push",
            deliveryId: "test-delivery-id",
        },
        repository: {
            id: 123,
            fullName: "owner/repo",
        },
        data: {}, // RuleContext includes `data` in your repo
    } as unknown as RuleContext;
}

function assertDefined<T>(value: T | undefined, message = "Expected value to be defined"): asserts value is T {
    assert.ok(value, message);
}

function assertOk(result: ActionStubResult): asserts result is Extract<ActionStubResult, { ok: true }> {
    assert.equal(result.ok, true);
}

function assertErr(result: ActionStubResult): asserts result is Extract<ActionStubResult, { ok: false }> {
    assert.equal(result.ok, false);
}

test("executeActionStubs: addLabel + addComment succeed; unknown action fails", async () => {
    const ctx = makeCtx();

    // IMPORTANT: type the array so ActionType stays literal (no widening to `string`)
    const actions: EvaluatedActionInput[] = [
        {
            ruleId: "r1",
            type: "addLabel",
            params: { label: "wip" },
        },
        {
            ruleId: "r2",
            type: "addComment",
            params: { body: "hello" },
        },
        {
            ruleId: "r3",
            type: "setProjectStatus" as ActionType, // keep union type; stub executor should reject it
            params: { status: "In Review" },
        },
    ];

    const results = await executeActionStubs({ ctx, actions });

    assert.equal(results.length, 3);

    const r1 = results[0];
    const r2 = results[1];
    const r3 = results[2];

    assertDefined(r1, "Expected results[0]");
    assertDefined(r2, "Expected results[1]");
    assertDefined(r3, "Expected results[2]");

    assertOk(r1);
    assert.equal(r1.actionType, "addLabel");
    assert.equal(r1.ruleId, "r1");
    assert.deepEqual(r1.target, { label: "wip" });

    assertOk(r2);
    assert.equal(r2.actionType, "addComment");
    assert.equal(r2.ruleId, "r2");
    assert.ok(r2.target);
    assert.equal(typeof (r2.target as any).bodyPreview, "string");

    assertErr(r3);
    assert.equal(r3.actionType, "setProjectStatus");
    assert.equal(r3.ruleId, "r3");
    assert.match(r3.error, /No stub handler implemented/i);
});

test("executeActionStubs: addLabel fails when params.label is missing", async () => {
    const ctx = makeCtx();

    const actions: EvaluatedActionInput[] = [
        {
            ruleId: "r_missing_label",
            type: "addLabel",
            params: {},
        },
    ];

    const results = await executeActionStubs({ ctx, actions });

    assert.equal(results.length, 1);

    const r = results[0];
    assertDefined(r, "Expected results[0]");

    assertErr(r);
    assert.equal(r.actionType, "addLabel");
    assert.equal(r.ruleId, "r_missing_label");
    assert.match(r.error, /params\.label/i);
});

test("executeActionStubs: addComment fails when params.body is missing", async () => {
    const ctx = makeCtx();

    const actions: EvaluatedActionInput[] = [
        {
            ruleId: "r_missing_body",
            type: "addComment",
            params: {},
        },
    ];

    const results = await executeActionStubs({ ctx, actions });

    assert.equal(results.length, 1);

    const r = results[0];
    assertDefined(r, "Expected results[0]");

    assertErr(r);
    assert.equal(r.actionType, "addComment");
    assert.equal(r.ruleId, "r_missing_body");
    assert.match(r.error, /params\.body/i);
});
