# API Contract (MVP)

> This document reflects the current MVP implementation.
> Behavior may expand in future milestones.

This document defines the public HTTP contract for the AD490 Workflow Automator API.

It describes:

- Route structure
- Request/response envelopes
- Scoping model
- Validation behavior
- Error handling semantics
- Webhook integration boundaries

This document reflects the current MVP behavior and is intended to be demo-friendly and stable.

---

# Base URL

Local development:

http://localhost:3001

All API routes are mounted under:

/api

Webhook route is mounted separately under:

/webhooks/github

---

# Standard Response Envelope

All non-204 responses follow a consistent JSON envelope.

## Success

{
"ok": true,
"data": <payload>
}

## Error

{
"ok": false,
"error": {
"code": "<ERROR_CODE>",
"message": "<human readable message>",
"details": [ ...optional field-level validation errors ]
}
}

The `details` field is present only for validation failures.

---

# Error Codes

| Code          | Meaning                                      |
|---------------|----------------------------------------------|
| UNAUTHORIZED  | Missing required scope headers               |
| BAD_REQUEST   | Invalid headers or invalid request body      |
| NOT_FOUND     | Resource not found in scoped repository      |
| CONFLICT      | Duplicate resource within same scope         |
| INTERNAL      | Unexpected server error                      |

---

# Scope Model (MVP)

All workflow CRUD routes require explicit repository scope headers.

Required headers:

- x-installation-id
- x-repository-id

These represent:

- installationId: GitHub App installation ID
- repositoryId: GitHub repository ID

If headers are missing:
→ 401 UNAUTHORIZED

If headers are invalid (not numeric):
→ 400 BAD_REQUEST

This is a temporary mechanism until user authentication is introduced.

All workflows are strictly scoped to:

(installationId, repositoryId)

There is no cross-repository access.

---

# Health Route

GET /health

Purpose:
Basic liveness check.

Response:

{
"ok": true
}

---

# Workflow API (MVP)

Base path:

/api/workflows

All routes require scope headers.

---

## List Workflows

GET /api/workflows

Returns all workflows for the scoped repository.

Response:

{
"ok": true,
"data": [ Workflow[] ]
}

Ordering is deterministic:

1. metadata.createdAt ascending
2. id ascending

---

## Create Workflow

POST /api/workflows

Request body:

{
"name": "My Workflow",
"description": "Optional description",
"enabled": true,
"trigger": { "event": "issue.opened" },
"steps": [
{
"id": "step_1",
"name": "Add label",
"action": {
"type": "addLabel",
"params": { "label": "triage" }
}
}
]
}

Behavior:

- id is server-generated (UUID)
- metadata.createdAt and updatedAt are set automatically
- Validation runs before persistence
- Unsupported trigger events are rejected
- Unsupported action types are rejected

Success:

201 Created

Validation failure:

400 BAD_REQUEST
Includes field-level errors in error.details

Duplicate ID within same scope:

409 CONFLICT

---

## Get Workflow

GET /api/workflows/:workflowId

Returns workflow if found within scope.

If workflow does not exist in scope:
→ 404 NOT_FOUND

---

## Update Workflow

PATCH /api/workflows/:workflowId

Supported fields:

- name
- description
- enabled

Behavior:

- Partial updates allowed
- Validation runs after merge
- updatedAt is monotonically increased

If workflow not found:
→ 404 NOT_FOUND

If validation fails:
→ 400 BAD_REQUEST

---

## Delete Workflow

DELETE /api/workflows/:workflowId

Success:
204 No Content

If workflow not found:
404 NOT_FOUND

---

# Validation Model

Validation occurs in two phases:

1. Shape validation (route-level)
2. Workflow schema validation (validateWorkflow)

Validation includes:

- Required fields (name, trigger.event, steps)
- Non-empty strings
- Maximum length checks (name ≤ 80 chars)
- Supported trigger events
- Supported action types
- At least one step
- Maximum 25 steps

On failure:

400 BAD_REQUEST

Response includes:

error.details = [
{ "path": "trigger.event", "message": "Unsupported event: push" }
]

Validation is strict and MVP-scoped.

---

# Webhook Route

POST /webhooks/github

Purpose:
Receives GitHub App webhook deliveries.

Important:

- Uses raw body middleware
- Performs HMAC SHA-256 signature verification
- Rejects unsigned or invalid signatures (401)
- Parses JSON after verification
- Normalizes payload into RuleContext
- Executes rules engine
- Executes workflow engine

Returns 200 immediately after successful receipt.

Execution runs asynchronously.

---

# Engine Boundaries

The webhook route passes only normalized data (RuleContext) into:

- Rules engine
- Workflow execution engine

Raw GitHub webhook payloads are never consumed beyond normalization.

This guarantees:

- Deterministic evaluation
- Stable contracts
- Isolation of GitHub-specific structure

---

# Determinism Guarantees

Given:

- Same installationId
- Same repositoryId
- Same normalized event
- Same workflow set

The API guarantees:

- Deterministic workflow lookup
- Deterministic execution order
- Sequential action execution
- No branching
- No retries

---

# MVP Limitations

The following are intentionally out of scope:

- User authentication
- RBAC
- Persistent database storage
- Cross-repository workflows
- Branching workflows
- Conditional step logic
- Action retries or rollback
- Scheduled workflows
- Web UI authorization layer

These may be introduced in future milestones.

---

# Relationship to Other Documents

See also:

- [workflow-builder-mvp](workflow-builder-mvp.md)
- [rules-engine](rules-engine.md)
- [normalization](normalization.md)
- [storage](storage.md)
- [architecture](architecture.md)
