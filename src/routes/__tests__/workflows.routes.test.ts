// src/routes/__tests__/workflows.routes.test.ts

import test from "node:test";
import assert from "node:assert/strict";
import express from "express";

import { workflowsRouter } from "../workflows.js";
import { InMemoryWorkflowStore } from "../../workflows/storage/inMemoryWorkflowStore.js";

function makeServer() {
    const app = express();
    const store = new InMemoryWorkflowStore();

    app.use("/api/workflows", workflowsRouter(store));

    const server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("Failed to bind test server");

    const baseUrl = `http://127.0.0.1:${addr.port}`;
    return { server, baseUrl };
}

function scopeHeaders(installationId: number, repositoryId: number) {
    return {
        "content-type": "application/json",
        "x-installation-id": String(installationId),
        "x-repository-id": String(repositoryId),
    };
}

function validWorkflowPayload(overrides?: Record<string, unknown>) {
    return {
        name: "My Workflow",
        description: "Test workflow",
        enabled: true,
        trigger: { event: "issue.opened" },
        steps: [
            {
                id: "s1",
                name: "Add triage label",
                action: { type: "addLabel", params: { label: "triage" } },
            },
        ],
        ...(overrides ?? {}),
    };
}

test("GET /api/workflows requires scope headers", async () => {
    const { server, baseUrl } = makeServer();
    try {
        const res = await fetch(`${baseUrl}/api/workflows`, { method: "GET" });
        assert.equal(res.status, 401);

        const json: any = await res.json();
        assert.equal(json.ok, false);
        assert.equal(json.error.code, "UNAUTHORIZED");
    } finally {
        server.close();
    }
});

test("CRUD happy path", async () => {
    const { server, baseUrl } = makeServer();
    try {
        const headers = scopeHeaders(1, 2);

        // CREATE
        const createRes = await fetch(`${baseUrl}/api/workflows`, {
            method: "POST",
            headers,
            body: JSON.stringify(validWorkflowPayload()),
        });
        assert.equal(createRes.status, 201);

        const createdJson: any = await createRes.json();
        assert.equal(createdJson.ok, true);
        assert.equal(createdJson.data.name, "My Workflow");
        assert.equal(createdJson.data.scope.installationId, 1);
        assert.equal(createdJson.data.scope.repositoryId, 2);

        const id = createdJson.data.id;
        assert.ok(typeof id === "string" && id.length > 0);

        // LIST
        const listRes = await fetch(`${baseUrl}/api/workflows`, {
            method: "GET",
            headers,
        });
        assert.equal(listRes.status, 200);

        const listJson: any = await listRes.json();
        assert.equal(listJson.ok, true);
        assert.equal(Array.isArray(listJson.data), true);
        assert.equal(listJson.data.length, 1);

        // GET
        const getRes = await fetch(`${baseUrl}/api/workflows/${id}`, {
            method: "GET",
            headers,
        });
        assert.equal(getRes.status, 200);

        const getJson: any = await getRes.json();
        assert.equal(getJson.ok, true);
        assert.equal(getJson.data.id, id);

        // PATCH
        const patchRes = await fetch(`${baseUrl}/api/workflows/${id}`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({ name: "Updated Name" }),
        });
        assert.equal(patchRes.status, 200);

        const patchJson: any = await patchRes.json();
        assert.equal(patchJson.ok, true);
        assert.equal(patchJson.data.name, "Updated Name");

        // DELETE
        const delRes = await fetch(`${baseUrl}/api/workflows/${id}`, {
            method: "DELETE",
            headers,
        });
        assert.equal(delRes.status, 204);

        // GET missing -> 404
        const missingRes = await fetch(`${baseUrl}/api/workflows/${id}`, {
            method: "GET",
            headers,
        });
        assert.equal(missingRes.status, 404);

        const missingJson: any = await missingRes.json();
        assert.equal(missingJson.ok, false);
        assert.equal(missingJson.error.code, "NOT_FOUND");
    } finally {
        server.close();
    }
});

test("repo scope isolation: workflow not visible across different repositoryId", async () => {
    const { server, baseUrl } = makeServer();
    try {
        const headersA = scopeHeaders(1, 111);
        const headersB = scopeHeaders(1, 222);

        // create in repo A
        const createRes = await fetch(`${baseUrl}/api/workflows`, {
            method: "POST",
            headers: headersA,
            body: JSON.stringify(
                validWorkflowPayload({
                    name: "Repo A Workflow",
                })
            ),
        });
        assert.equal(createRes.status, 201);

        const createdJson: any = await createRes.json();
        const id = createdJson.data.id;

        // try get from repo B -> 404
        const getOtherRepo = await fetch(`${baseUrl}/api/workflows/${id}`, {
            method: "GET",
            headers: headersB,
        });
        assert.equal(getOtherRepo.status, 404);
    } finally {
        server.close();
    }
});

test("POST /api/workflows rejects push workflow trigger (demo-only)", async () => {
    const { server, baseUrl } = makeServer();
    try {
        const headers = scopeHeaders(1, 2);

        const res = await fetch(`${baseUrl}/api/workflows`, {
            method: "POST",
            headers,
            body: JSON.stringify(
                validWorkflowPayload({
                    name: "Invalid Push Workflow",
                    trigger: { event: "push" },
                })
            ),
        });

        assert.equal(res.status, 400);

        const json: any = await res.json();
        assert.equal(json.ok, false);
        assert.equal(json.error.code, "BAD_REQUEST");
        assert.equal(json.error.message, "Invalid workflow payload.");

        assert.ok(Array.isArray(json.error.details));
        assert.ok(
            json.error.details.some(
                (e: any) => e.path === "trigger.event" && String(e.message).includes("push")
            )
        );
    } finally {
        server.close();
    }
});

test("POST /api/workflows rejects empty steps", async () => {
    const { server, baseUrl } = makeServer();
    try {
        const headers = scopeHeaders(1, 2);

        const res = await fetch(`${baseUrl}/api/workflows`, {
            method: "POST",
            headers,
            body: JSON.stringify(
                validWorkflowPayload({
                    name: "Invalid Steps Workflow",
                    steps: [],
                })
            ),
        });

        assert.equal(res.status, 400);

        const json: any = await res.json();
        assert.equal(json.ok, false);
        assert.equal(json.error.code, "BAD_REQUEST");

        assert.ok(Array.isArray(json.error.details));
        assert.ok(json.error.details.some((e: any) => e.path === "steps"));
    } finally {
        server.close();
    }
});
