// src/workflows/storage/inMemoryWorkflowStore.ts

import type { Workflow } from "../workflowTypes.js";
import type { WorkflowOwnerKey, WorkflowStore } from "./workflowStore.js";

function makeRepoKey(key: WorkflowOwnerKey): string {
    return `${key.installationId}:${key.repositoryId}`;
}

function cloneWorkflow<T>(value: T): T {
    // Workflows are plain JSON-ish objects; this prevents accidental mutation by callers.
    // Node 18+ has structuredClone, but JSON clone is fine for MVP.
    return JSON.parse(JSON.stringify(value)) as T;
}

function ensureScopeMatches(key: WorkflowOwnerKey, wf: Workflow): void {
    if (wf.scope.installationId !== key.installationId) {
        throw new Error(
            `workflow.scope.installationId (${wf.scope.installationId}) does not match key.installationId (${key.installationId})`
        );
    }
    if (wf.scope.repositoryId !== key.repositoryId) {
        throw new Error(
            `workflow.scope.repositoryId (${wf.scope.repositoryId}) does not match key.repositoryId (${key.repositoryId})`
        );
    }
}

function sortDeterministically(items: Workflow[]): Workflow[] {
    // Requirement: deterministic ordering (stable sort by createdAt or explicit order).
    // MVP: no explicit order field exists, so we use createdAt (asc) then id (asc).
    return [...items].sort((a, b) => {
        const aCreated = a.metadata?.createdAt ?? "";
        const bCreated = b.metadata?.createdAt ?? "";

        if (aCreated < bCreated) return -1;
        if (aCreated > bCreated) return 1;

        // tie-break
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });
}

/**
 * MVP-only, process-memory store.
 * Not persisted across restarts.
 */
export class InMemoryWorkflowStore implements WorkflowStore {
    /**
     * repoKey -> (workflowId -> Workflow)
     */
    private readonly repoWorkflows = new Map<string, Map<string, Workflow>>();

    /**
     * Monotonic clock to avoid same-millisecond updatedAt collisions in tests.
     */
    private lastNowMs = 0;

    private nowIso(): string {
        const ms = Date.now();
        if (ms <= this.lastNowMs) {
            this.lastNowMs += 1;
        } else {
            this.lastNowMs = ms;
        }
        return new Date(this.lastNowMs).toISOString();
    }

    async createWorkflow(key: WorkflowOwnerKey, workflow: Workflow): Promise<Workflow> {
        ensureScopeMatches(key, workflow);

        const repoKey = makeRepoKey(key);
        const bucket = this.repoWorkflows.get(repoKey) ?? new Map<string, Workflow>();

        if (bucket.has(workflow.id)) {
            throw new Error(`workflow already exists: ${workflow.id}`);
        }

        const now = this.nowIso();

        const toStore: Workflow = {
            ...cloneWorkflow(workflow),
            metadata: {
                ...cloneWorkflow(workflow.metadata ?? {}),
                createdAt: workflow.metadata?.createdAt ?? now,
                updatedAt: now,
            },
        };

        bucket.set(toStore.id, toStore);
        this.repoWorkflows.set(repoKey, bucket);

        return cloneWorkflow(toStore);
    }

    async getWorkflow(key: WorkflowOwnerKey, workflowId: string): Promise<Workflow | undefined> {
        const repoKey = makeRepoKey(key);
        const bucket = this.repoWorkflows.get(repoKey);
        const wf = bucket?.get(workflowId);
        return wf ? cloneWorkflow(wf) : undefined;
    }

    async updateWorkflow(key: WorkflowOwnerKey, workflow: Workflow): Promise<Workflow> {
        ensureScopeMatches(key, workflow);

        const repoKey = makeRepoKey(key);
        const bucket = this.repoWorkflows.get(repoKey);

        if (!bucket || !bucket.has(workflow.id)) {
            throw new Error(`workflow does not exist: ${workflow.id}`);
        }

        const existing = bucket.get(workflow.id)!;
        const now = this.nowIso();

        const toStore: Workflow = {
            ...cloneWorkflow(workflow),
            metadata: {
                ...cloneWorkflow(existing.metadata ?? {}),
                ...cloneWorkflow(workflow.metadata ?? {}),
                createdAt: existing.metadata?.createdAt ?? workflow.metadata?.createdAt ?? now,
                updatedAt: now,
            },
        };

        bucket.set(toStore.id, toStore);
        return cloneWorkflow(toStore);
    }

    async deleteWorkflow(key: WorkflowOwnerKey, workflowId: string): Promise<boolean> {
        const repoKey = makeRepoKey(key);
        const bucket = this.repoWorkflows.get(repoKey);
        if (!bucket) return false;

        const existed = bucket.delete(workflowId);

        // cleanup empty buckets
        if (bucket.size === 0) this.repoWorkflows.delete(repoKey);

        return existed;
    }

    async listWorkflowsForRepo(key: WorkflowOwnerKey): Promise<Workflow[]> {
        const repoKey = makeRepoKey(key);
        const bucket = this.repoWorkflows.get(repoKey);

        const all = bucket ? [...bucket.values()] : [];
        const sorted = sortDeterministically(all);

        return sorted.map((wf) => cloneWorkflow(wf));
    }

    /**
     * Convenience method for tests/dev seeds (not part of interface).
     */
    clearAll(): void {
        this.repoWorkflows.clear();
    }
}
