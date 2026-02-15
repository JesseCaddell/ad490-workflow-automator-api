# Storage Model (MVP)

> This document reflects the current MVP implementation.  
> Behavior may expand in future milestones.

This document defines the storage contracts for the AD490 Workflow Automator API.

The system uses storage adapters for:

- Rules (Rules Engine)
- Workflows (Workflow Builder)

In the MVP, both use in-memory implementations.  
The system is intentionally designed so storage can be replaced later without refactoring engines.

---

# 1. Design Principles

The storage layer is responsible for:

- Repository scoping
- Deterministic ordering
- Metadata stamping
- Isolation between installations
- Isolation between repositories

The storage layer is NOT responsible for:

- Validation logic (handled upstream)
- Rule evaluation
- Workflow execution
- GitHub mutations
- Authentication

---

# 2. Scope Model

All stored entities are scoped by:

- installationId
- repositoryId

This composite scope guarantees:

- No cross-repository leakage
- Same ID may exist in different repositories
- Same installation may host multiple repositories
- Workflows and rules are isolated per repository

Scope is enforced using a composite key:

installationId + repositoryId

---

# 3. Rules Storage

The Rules Engine depends only on a storage interface.

Storage responsibilities:

- Retrieve rules by (installationId, repositoryId)
- Optionally retrieve by installationId (dev/testing only)
- Provide deterministic ordering

The engine assumes:

- Rules are already validated
- Rule ordering is stable
- Returned rule set is complete for that repository

MVP implementation:

- In-memory Map
- Optional seed rules for development

Limitations:

- Not persisted across restarts
- No versioning
- No migrations
- No concurrency guarantees

---

# 4. Workflow Storage

Workflow storage follows the same scoping model.

Primary interface operations:

- createWorkflow(scope, workflow)
- getWorkflow(scope, workflowId)
- updateWorkflow(scope, workflow)
- deleteWorkflow(scope, workflowId)
- listWorkflowsForRepo(scope)

Scope:

scope = {
installationId,
repositoryId
}

---

# 5. Deterministic Ordering

listWorkflowsForRepo returns workflows in deterministic order:

1. metadata.createdAt ascending
2. id ascending (tie-break)

This ensures:

- Stable test results
- Predictable execution ordering
- No non-deterministic iteration

Future enhancements may introduce explicit ordering fields.

---

# 6. Metadata Guarantees (Workflows)

Workflow storage is responsible for:

- Setting metadata.createdAt on creation
- Setting metadata.updatedAt on creation
- Updating metadata.updatedAt on every update
- Guaranteeing monotonic increase of updatedAt

Monotonic update ensures:

- Even rapid updates produce strictly increasing timestamps
- Deterministic ordering is preserved

Callers must not manually manage timestamps.

---

# 7. Isolation Guarantees

Storage guarantees:

- A workflow created under installation A / repository X
  cannot be accessed under installation A / repository Y
- A rule created under installation A / repository X
  cannot be accessed under installation B / repository X

Scope enforcement is strict.

---

# 8. Engine Assumptions

The engines assume:

- Storage retrieval is deterministic
- Scope enforcement is correct
- Returned entities are valid
- Storage does not mutate data unexpectedly
- No hidden reordering occurs

This separation allows:

- Engines to remain pure
- Storage to be swapped later (e.g., Postgres)
- No business logic embedded in persistence layer

---

# 9. MVP Implementation

Current implementation:

- In-memory Map keyed by installationId:repositoryId
- Nested Map keyed by entity ID
- No persistence beyond process lifetime

Advantages:

- Fast development
- Minimal infrastructure complexity
- Simplifies milestone demonstration

Trade-offs:

- Data loss on restart
- No multi-instance support
- No durability guarantees

---

# 10. Out of Scope (MVP)

Not supported in MVP:

- Persistent database storage
- Distributed locking
- Multi-instance synchronization
- Optimistic concurrency control
- Entity versioning
- Migration tooling
- Soft deletes
- Audit history

These may be introduced in future milestones.

---

# 11. Relationship to Other Documents

See also:

- [architecture](architecture.md)
- [api-contract](api-contract.md)
- [rules-engine](rules-engine.md)
- [workflow-builder-mvp](workflow-builder-mvp.md)
- [normalization](normalization.md)
