import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { validateWorkflow } from "../validateWorkflow.js";
import type { Workflow } from "../types.js";

test("validateWorkflow: fixture is valid", () => {
    const fixturePath = path.resolve(
        process.cwd(),
        "src/workflows/__tests__/fixtures/workflow.push.addLabel.json"
    );

    const raw = fs.readFileSync(fixturePath, "utf8");
    const wf = JSON.parse(raw) as Workflow;

    const errors = validateWorkflow(wf);
    assert.deepEqual(errors, []);
});
