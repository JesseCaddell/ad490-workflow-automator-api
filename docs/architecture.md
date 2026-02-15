# Architecture Overview (MVP)

> This document reflects the current MVP implementation.  
> Behavior may expand in future milestones.

This document provides a system-level overview of the AD490 Workflow Automator API.

It explains:

- Major components and boundaries
- Data flow from webhook receipt to execution
- Scoping and determinism guarantees
- What is intentionally out of scope in the MVP

---

# 1. System Goal

The API exists to automate repository workflow operations by responding to GitHub events.

At a high level it supports two automation paths:

1. Rules Engine (condition-based rules)
2. Workflow Builder (user-defined sequential workflows)

Both are driven by the same normalized event context.

---

# 2. High-Level Data Flow

Webhook deliveries are received from GitHub and processed in this order:

1. Webhook receipt + signature verification
2. Normalization into an internal event format (RuleContext)
3. Rules engine evaluation and action execution (stubbed)
4. Workflow execution (trigger match + sequential steps, stubbed)

Only normalized data is passed into engines.

Raw GitHub payloads are isolated to the webhook boundary and normalization layer.

---

# 3. Component Map

## 3.1 Routes Layer (HTTP)

Responsibilities:

- Define public HTTP endpoints
- Parse and validate request bodies
- Enforce scope headers for API routes
- Return consistent response envelopes

Important constraint:

- Global JSON middleware is not used at the app root
- Webhook verification requires raw body access

Reference:

- docs/api-contract.md

---

## 3.2 Webhook Receiver

Responsibilities:

- Receive GitHub webhook deliveries
- Verify signature using shared secret
- Parse JSON only after signature verification
- Normalize payload into RuleContext
- Acknowledge receipt with 200 immediately
- Execute engines asynchronously

Important behavior:

- Receipt returns 200 after normalization succeeds
- Engine execution is not awaited by the HTTP response

---

## 3.3 Normalization Layer

Responsibilities:

- Convert raw GitHub webhook payload into RuleContext
- Assign stable normalized event names (ctx.event.name)
- Extract repository identity and installation identity
- Produce a stable, lossy `ctx.data` used by rule evaluation

Guarantees:

- Downstream logic never depends on raw GitHub payloads
- Normalization is the only GitHub-structure-aware layer

Reference:

- docs/normalization.md

---

## 3.4 Rules Engine (Condition-Based)

Responsibilities:

- Load repository-scoped rules from storage
- Select enabled rules matching ctx.event.name
- Evaluate conditions against ctx.data
- Produce a list of actions to execute
- Execute actions sequentially (stubs for MVP)
- Emit structured logs

Evaluation model:

- Deterministic rule ordering
- Supports evaluation modes (firstMatch / allMatches)
- Continues on action failure (no retries)

Reference:

- docs/rules-engine.md

---

## 3.5 Workflow Engine (Workflow Builder)

Responsibilities:

- Load repository-scoped workflows from storage
- Filter enabled workflows where:
  workflow.trigger.event === ctx.event.name
- Execute steps sequentially in array order
- Execute step actions via action stubs
- Continue on step failure (no retries)
- Emit structured execution logs

Constraints:

- Single trigger per workflow
- No branching
- No conditional logic
- Maximum 25 steps
- Steps run sequentially and deterministically

Reference:

- docs/workflow-builder-mvp.md

---

## 3.6 Storage Layer (MVP)

The MVP uses in-memory storage adapters for both rules and workflows.

Responsibilities:

- Provide deterministic read/list behavior
- Enforce repository scoping using:
  installationId + repositoryId
- Maintain workflow metadata timestamps (createdAt/updatedAt)
- Support swapping to persistent storage later via interfaces

Guarantees:

- No cross-repo leakage
- Deterministic ordering on list operations

Reference:

- docs/storage.md

---

# 4. Key Contracts

## 4.1 RuleContext (Normalized Event Contract)

Both engines consume the same normalized structure:

- ctx.installationId
- ctx.event.name
- ctx.repository.id (repositoryId)
- ctx.repository.fullName
- ctx.data (normalized fields used by conditions)

Raw payloads are not used past normalization.

---

## 4.2 Scope Contract

Repository scope is defined by:

- installationId (GitHub App installation)
- repositoryId (GitHub repository)

Workflow CRUD routes enforce scope via headers:

- x-installation-id
- x-repository-id

Webhook execution derives the same identity from RuleContext:

- ctx.installationId
- ctx.repository.id

This ensures consistent scoping between API usage and webhook execution.

---

# 5. Determinism Guarantees (MVP)

The system is intentionally deterministic to support testing and demo reliability.

Given:

- same RuleContext
- same stored rules/workflows

The API guarantees:

- deterministic selection of matching rules/workflows
- deterministic evaluation order
- deterministic execution order
- sequential action/step execution in array order
- action failures do not stop evaluation or execution

There are no retries or background queues in MVP.

---

# 6. Logging Model (Demo-Friendly)

Logging is designed for visibility during demo runs.

The system logs:

- webhook receipt metadata
- normalized event info (ctx.event.name, repo, installationId)
- rules engine results (matched rules, actions attempted, action results)
- workflow execution results (matched workflows, step results)

Logs are structured JSON where feasible to allow easy scanning.

---

# 7. Out of Scope (MVP)

Intentionally excluded from MVP:

- user authentication and RBAC
- persistent database storage
- real GitHub mutations (Octokit execution)
- retry/backoff and job queues
- rollback/transaction semantics
- workflow branching or conditional logic
- scheduled or time-based automation
- cross-repo workflows or organization-level automation
- workflow versioning and migration tooling

These features may be introduced in later milestones.

---

# 8. Relationship to Other Documents

See also:

- [api-contract](api-contract.md)
- [workflow-builder-mvp](workflow-builder-mvp.md)
- [rules-engine](rules-engine.md)
- [normalization](normalization.md)
- [storage](storage.md)
