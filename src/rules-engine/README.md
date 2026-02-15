# Rules Engine (MVP)

This folder contains the deterministic rule evaluation engine.

The rules engine evaluates normalized GitHub events (`RuleContext`)
against repository-scoped rules and executes action stubs.

It does **not**:
- Access raw webhook payloads
- Manage persistence
- Perform real GitHub mutations (MVP uses stubs)

---
For full system documentation, see:
- [architecture](../../docs/architecture.md)
- [api-contract](../../docs/api-contract.md)
- [workflow-builder-mvp](../../docs/workflow-builder-mvp.md)
- [normalization](../../docs/normalization.md)
- [storage](../../docs/storage.md)

# Rule Lifecycle (High-Level)

1. Webhook received
2. Payload normalized → `RuleContext`
3. Repository-scoped rules loaded from storage
4. Enabled rules filtered by `rule.trigger.event`
5. Conditions evaluated
6. Actions executed sequentially
7. Structured results logged

---

# Core Guarantees (MVP)

- Evaluation uses only normalized `RuleContext`
- Deterministic behavior:
  - Same rules + same context = same results
- Rule lookup is scoped by:
  - `installationId`
  - `repositoryId`
- Condition evaluation is pure (no side effects)
- Action execution order is sequential and predictable
- Action failure does not halt rule evaluation

---

# Condition Operators (MVP)

Supported operators:

- `equals`, `notEquals`
- `exists`
- `contains`
- `in`
- `gt`, `gte`, `lt`, `lte`
- `matchesRegex`

Nested condition groups are supported:

- `all` (AND)
- `any` (OR)
- `not` (NOT)

---

# Action Types (Engine Layer)

The rules engine supports these action names:

- `addLabel`
- `removeLabel`
- `addComment`
- `requestReviewers`
- `setAssignees`
- `setProjectStatus`
- `addToProject`
- `setField`

Note:
- Only some are implemented as stubs in MVP.
- Real GitHub execution (Octokit) is future work.

---

# Explicitly Out of Scope (MVP)

The rules engine does NOT support:

- Dynamic rule mutation
- Cross-repo rules
- Action retries
- Rollbacks / transactions
- Time-based scheduling
- Branching execution logic
- User scripting or expressions

---

> This document reflects the current MVP implementation.
> Behavior may expand in future milestones.

---
