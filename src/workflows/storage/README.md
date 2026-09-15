# Workflow Storage (Local Notes)

This directory contains the storage adapter for the Workflow Builder.

For full system documentation, see:

- [workflow-builder](../../../docs/workflow-builder-mvp.md)
- [storage](../../../docs/storage.md)
- [architecture](../../../docs/architecture.md)

---

## Current Implementation

This currently uses an **in-memory Map-based storage adapter**.

Characteristics:

- Scoped by `(installationId, repositoryId)`
- Deterministic ordering
- Metadata stamping (`createdAt`, `updatedAt`)
- No persistence across restarts
- Designed to be swappable with a database implementation later

The Workflow execution layer depends only on the `WorkflowStore` interface.
It does not depend on storage implementation details.

---

## Scope Model

Workflows are scoped to a repository within an installation:

- `installationId`
- `repositoryId`

Primary lookup:

(installationId, repositoryId) → list/read/write workflows for that repo

This prevents cross-repository leakage when the same GitHub App
installation is installed on multiple repositories.

---

## Deterministic Ordering

`listWorkflowsForRepo()` returns workflows in deterministic order:

1. `workflow.metadata.createdAt` ascending
2. tie-break: `workflow.id` ascending

An explicit ordering field is not yet supported.

---

## Metadata Guarantees

The storage layer is responsible for enforcing workflow metadata:

- `metadata.createdAt` is set on creation
- `metadata.updatedAt` is set on creation and updated on every update
- `updatedAt` is guaranteed to monotonically increase per workflow

Callers SHOULD NOT attempt to manage timestamps themselves.

---

## Current Constraints

- No database persistence
- No migrations
- No versioning
- No concurrency guarantees
- No audit history

This is intentional for now.

---

> This document reflects the current implementation. It evolves as development continues.
