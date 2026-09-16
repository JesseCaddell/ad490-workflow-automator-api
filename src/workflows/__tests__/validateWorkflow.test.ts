// src/workflows/__tests__/validateWorkflow.test.ts

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { validateWorkflow } from "../validateWorkflow.js";
import type { Workflow } from "../workflowTypes.js";

test("validateWorkflow: fixture is valid", () => {
    const fixturePath = path.resolve(
        process.cwd(),
        "src/workflows/__tests__/fixtures/workflow.issue.opened.addLabel.json"
    );

    const raw = fs.readFileSync(fixturePath, "utf8");
    const wf = JSON.parse(raw) as Workflow;

    const errors = validateWorkflow(wf);
    assert.deepEqual(errors, []);
});

function baseWorkflow(steps: Workflow["steps"]): Workflow {
    return {
        id: "wf_test_conflict",
        name: "Conflict test",
        enabled: true,
        scope: { installationId: 1, repositoryId: 2 },
        trigger: { event: "issue.opened" },
        steps,
    } as Workflow;
}

test("validateWorkflow: rejects addLabel + removeLabel targeting the same label", () => {
    const wf = baseWorkflow([
        { id: "s1", action: { type: "addLabel", params: { label: "wip" } } },
        { id: "s2", action: { type: "removeLabel", params: { label: "WIP " } } },
    ] as unknown as Workflow["steps"]);

    const errors = validateWorkflow(wf);
    assert.ok(
        errors.some((e) => e.path === "steps[1]" && e.message.includes("Conflicting actions")),
        `expected a conflicting-actions error, got: ${JSON.stringify(errors)}`
    );
});

test("validateWorkflow: allows addLabel + removeLabel targeting different labels", () => {
    const wf = baseWorkflow([
        { id: "s1", action: { type: "addLabel", params: { label: "wip" } } },
        { id: "s2", action: { type: "removeLabel", params: { label: "stale" } } },
    ] as unknown as Workflow["steps"]);

    const errors = validateWorkflow(wf);
    assert.deepEqual(errors, []);
});

test("validateWorkflow: rejects duplicate steps (same type + same params)", () => {
    const wf = baseWorkflow([
        { id: "s1", action: { type: "addLabel", params: { label: "wip" } } },
        { id: "s2", action: { type: "addLabel", params: { label: "wip" } } },
    ] as unknown as Workflow["steps"]);

    const errors = validateWorkflow(wf);
    assert.ok(
        errors.some((e) => e.path === "steps[1]" && e.message.includes("Duplicate of steps[0]")),
        `expected a duplicate-step error, got: ${JSON.stringify(errors)}`
    );
});
