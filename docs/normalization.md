# Webhook Event Normalization (MVP)

> This document reflects the current MVP implementation.  
> Behavior may expand in future milestones.

This document defines the normalization boundary between raw GitHub webhook payloads and the internal automation engines.

Normalization converts GitHub-specific payloads into a stable internal format called `RuleContext`.

The rules engine and workflow engine consume only `RuleContext`.  
They never consume raw GitHub payloads.

---

# 1. Purpose of Normalization

The normalization layer exists to:

- Isolate GitHub-specific payload structure
- Provide a stable internal event contract
- Remove irrelevant fields
- Standardize event naming
- Guarantee deterministic downstream behavior

This ensures:

- Engines are GitHub-agnostic
- Raw payload changes do not ripple through the system
- Testing is simpler and deterministic

---

# 2. Normalization Boundary

Normalization occurs inside the webhook route after:

1. Signature verification
2. Raw body parsing
3. JSON parsing

Flow:

Webhook → Signature Verification → JSON Parse → Normalize → RuleContext → Engines

Raw webhook payloads must never pass beyond normalization.

---

# 3. RuleContext Contract

All normalized events conform to the `RuleContext` interface.

Core fields:

- installationId: number
- event:
    - name: RuleEventName
    - deliveryId?: string
    - receivedAt: string (ISO)
- repository:
    - id: number
    - owner: string
    - name: string
    - fullName: string
- actor?:
    - login: string
    - id: number
- data: Record<string, unknown>

The `data` field contains normalized fields required for rule evaluation.

It does not contain the full GitHub payload.

---

# 4. Event Naming

Normalization produces stable event names.

Examples:

- push
- issue.opened
- issue.assigned
- issue.closed
- issue.reopened
- pull_request.opened
- pull_request.draft
- pull_request.ready
- pull_request.closed
- pull_request.merged
- pull_request_review.changes_requested

These names are used by:

- rule.trigger.event
- workflow.trigger.event

Matching is exact string equality.

---

# 5. Supported Events (MVP)

The normalization layer currently supports:

- push (demo/testing)
- issue events
- pull_request events
- pull_request_review events

Unsupported webhook events may:

- be ignored
- map to minimal context
- or produce limited normalized data

Engines will only execute if a workflow or rule matches the normalized event name.

---

# 6. Lossy by Design

Normalization intentionally drops:

- Unused nested fields
- Full webhook payload structure
- GitHub-specific noise
- Unnecessary metadata

Only fields required for rule evaluation and workflow execution are preserved.

This design:

- Reduces coupling
- Simplifies tests
- Improves determinism
- Avoids schema drift

---

# 7. Determinism Guarantees

Given the same webhook payload:

- The same RuleContext will be produced
- The same event name will be assigned
- The same repository identity will be extracted
- The same normalized data will be present

Downstream engines rely on this determinism.

---

# 8. Demo Behavior (Push Event)

The `push` event exists primarily for demo/testing purposes.

It allows:

- Fast webhook triggering
- Immediate visibility of normalization and execution logs

It is not considered core business logic for the Workflow Builder MVP.

---

# 9. Responsibilities Excluded from Normalization

The normalization layer does NOT:

- Evaluate rules
- Execute actions
- Perform validation of workflows
- Access storage
- Perform retries
- Mutate GitHub

Its sole responsibility is transforming raw webhook payloads into RuleContext.

---

# 10. Relationship to Other Documents

See also:

- [architecture](architecture.md)
- [rules-engine](rules-engine.md)
- [workflow-builder-mvp](workflow-builder-mvp.md)
- [api-contract](api-contract.md)
