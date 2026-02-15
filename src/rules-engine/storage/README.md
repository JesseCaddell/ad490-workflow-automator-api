# Rules Engine Storage (Local Notes)

This directory contains the storage adapter used by the rules engine.

For full system documentation, see:

- [storage](../../docs/storage.md)
- [architecture](../../docs/architecture.md)
- [rules-engine](../../docs/rules-engine.md)

---

## Current Implementation (MVP)

The MVP uses an **in-memory Map-based storage adapter**.

Characteristics:

- Scoped by `(installationId, repositoryId)`
- Deterministic ordering
- No persistence across restarts
- Designed to be swappable with a database implementation later

The rules engine depends only on the `RuleStore` interface.
It does not depend on storage implementation details.

---

## Scope Model

Rules are scoped to a repository within an installation:

- `installationId`
- `repositoryId`

This prevents cross-repository rule leakage.

---

## MVP Constraints

- No database persistence
- No migrations
- No versioning
- No concurrency guarantees
- No audit history

This is intentional for the MVP.

---

## Dev Seed Notes

Development seeds may include demo rules (such as `push`)
to validate normalization and lookup behavior.

These are not part of the production trigger surface.

---

> This document reflects the current MVP implementation.
> Behavior may expand in future milestones.
