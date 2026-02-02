// src/workflows/storage/workflowStore.ts

import type { Workflow} from "../workflowTypes.js";

export interface WorkflowOwnerKey {
    installationId: number;
    repositoryId: number;
}

/**
 * Storage contract for workflows.
 * The engine / API depends on this interface only.
 */
export interface WorkflowStore {
    /**
     * Create a new workflow in a repo scope.
     * Throws if an id already exists in that scope.
     */
    createWorkflow(key: WorkflowOwnerKey, workflow: Workflow): Promise<Workflow>;

    /**
     * Read a workflow by id within a repo scope.
     */
    getWorkflow(key: WorkflowOwnerKey, workflowId: string): Promise<Workflow | undefined>;

    /**
     * Update an existing workflow within a repo scope.
     * Throws if the workflow does not exist.
     */
    updateWorkflow(key: WorkflowOwnerKey, workflow: Workflow): Promise<Workflow>;

    /**
     * Delete a workflow by id within a repo scope.
     * Returns true if it existed and was deleted.
     */
    deleteWorkflow(key: WorkflowOwnerKey, workflowId: string): Promise<boolean>;

    /**
     * List workflows for a repo scope in deterministic order.
     */
    listWorkflowsForRepo(key: WorkflowOwnerKey): Promise<Workflow[]>;
}
