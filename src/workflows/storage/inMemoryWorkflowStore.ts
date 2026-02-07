// src/workflows/storage/inMemoryWorkflowStore.ts

import type { Workflow } from "../workflowTypes.js";
import type { WorkflowOwnerKey, WorkflowStore } from "./workflowStore.js";

function makeKey(key: WorkflowOwnerKey): string {
    return `${key.installationId}:${key.repositoryId}`;
}

function nowIso(): string {
    return new Date().toISOString();
}

function ensureCreatedMetadata(wf: Workflow): Workflow {
    const createdAt = wf.metadata?.createdAt ?? nowIso();
    const createdBy = wf.metadata?.createdBy ?? "api";
    const updatedAt = wf.metadata?.updatedAt ?? createdAt;

    return {
        ...wf,
        metadata: {
            ...(wf.metadata ?? {}),
            createdAt,
            createdBy,
            updatedAt,
            // do NOT force updatedAt on create; tests expect it to exist later (update)
        },
    };
}

function setUpdatedMetadata(wf: Workflow): Workflow {
    const prev =
        wf.metadata?.updatedAt ??
        wf.metadata?.createdAt ??
        "1970-01-01T00:00:00.000Z";

    const prevMs = Date.parse(prev);
    const nowMs = Date.now();

    // Ensure monotonic increase even if updates happen within same millisecond.
    const nextMs = Number.isFinite(prevMs) ? Math.max(nowMs, prevMs + 1) : nowMs;
    const updatedAt = new Date(nextMs).toISOString();

    return {
        ...wf,
        metadata: {
            ...(wf.metadata ?? {}),
            // preserve createdAt/createdBy if present
            createdAt: wf.metadata?.createdAt ?? nowIso(),
            createdBy: wf.metadata?.createdBy ?? "api",
            updatedAt: nowIso(),
        },
    };
}

export class InMemoryWorkflowStore implements WorkflowStore {
    private data = new Map<string, Map<string, Workflow>>();

    private ensureRepoMap(key: WorkflowOwnerKey): Map<string, Workflow> {
        const k = makeKey(key);
        const existing = this.data.get(k);
        if (existing) return existing;

        const created = new Map<string, Workflow>();
        this.data.set(k, created);
        return created;
    }

    async createWorkflow(key: WorkflowOwnerKey, workflow: Workflow): Promise<Workflow> {
        const repoMap = this.ensureRepoMap(key);
        if (repoMap.has(workflow.id)) {
            throw new Error("workflow already exists");
        }

        const stamped = ensureCreatedMetadata(workflow);
        repoMap.set(stamped.id, stamped);
        return stamped;
    }

    async getWorkflow(key: WorkflowOwnerKey, workflowId: string): Promise<Workflow | undefined> {
        const repoMap = this.ensureRepoMap(key);
        return repoMap.get(workflowId);
    }

    async updateWorkflow(key: WorkflowOwnerKey, workflow: Workflow): Promise<Workflow> {
        const repoMap = this.ensureRepoMap(key);
        if (!repoMap.has(workflow.id)) {
            throw new Error("workflow does not exist");
        }

        const stamped = setUpdatedMetadata(workflow);
        repoMap.set(stamped.id, stamped);
        return stamped;
    }

    async deleteWorkflow(key: WorkflowOwnerKey, workflowId: string): Promise<boolean> {
        const repoMap = this.ensureRepoMap(key);
        return repoMap.delete(workflowId);
    }

    async listWorkflowsForRepo(key: WorkflowOwnerKey): Promise<Workflow[]> {
        const repoMap = this.ensureRepoMap(key);

        const items = [...repoMap.values()];

        // Deterministic ordering:
        // 1) createdAt asc
        // 2) id asc
        items.sort((a, b) => {
            const aCreated = a.metadata?.createdAt ?? "";
            const bCreated = b.metadata?.createdAt ?? "";
            if (aCreated < bCreated) return -1;
            if (aCreated > bCreated) return 1;
            return a.id.localeCompare(b.id);
        });

        return items;
    }
}
