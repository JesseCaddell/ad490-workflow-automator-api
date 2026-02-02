## Workflow Storage (MVP)

### Ownership Model (Keys)

Workflows are scoped to a repo within an installation using:

- `installationId` (GitHub App installation)
- `repositoryId` (GitHub repo ID)

**Primary lookup**
- `(installationId, repositoryId)` → list/read/write workflows for that repo scope

This prevents cross-repo leakage when the same GitHub App installation is installed on multiple repositories.

---

### Deterministic Ordering

`listWorkflowsForRepo()` returns workflows in deterministic order:

1. `workflow.metadata.createdAt` ascending
2. tie-break: `workflow.id` ascending

MVP does not define a user-configurable ordering field yet. If an explicit `order` field is introduced later, sorting should prefer that first.

