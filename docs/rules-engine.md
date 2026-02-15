# Rules Engine (MVP)

> This document reflects the current MVP implementation.  
> Behavior may expand in future milestones.

This document defines the Rules Engine behavior for the AD490 Workflow Automator API.

The Rules Engine evaluates condition-based rules against normalized GitHub events and executes actions (stubbed in MVP).

It operates entirely on normalized RuleContext data.

---

# 1. Purpose

The Rules Engine enables conditional automation logic based on repository events.

It is responsible for:

- Loading repository-scoped rules
- Matching rules by trigger event
- Evaluating conditions
- Executing rule actions
- Logging structured results

It does not:

- Access raw GitHub webhook payloads
- Persist rules
- Mutate GitHub directly (MVP uses stubs)
- Perform retries or rollback

---

# 2. Rule Lifecycle

When a webhook is received:

1. Payload is normalized → RuleContext
2. Rules are loaded by:
    - installationId
    - repositoryId
3. Rules are filtered:
    - rule.enabled === true
    - rule.trigger.event === ctx.event.name
4. Conditions are evaluated
5. Matching rules produce actions
6. Actions are executed sequentially
7. Structured logs are emitted

---

# 3. Rule Shape (MVP)

A rule contains:

- id (string)
- name (string)
- description? (optional string)
- enabled (boolean)
- trigger.event (RuleEventName)
- conditions (ConditionNode)
- actions (array of Action)
- evaluation.mode? ("firstMatch" | "allMatches")

---

# 4. Trigger Matching

Rules execute only if:

- rule.enabled === true
- rule.trigger.event === ctx.event.name

Matching is strict string equality.

Supported normalized events include:

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
- push (demo/testing)

---

# 5. Condition System (MVP)

Conditions are evaluated against ctx.data.

There are two node types:

## Leaf

A leaf condition includes:

- type: "leaf"
- path: string
- op: operator
- value? (optional)

Supported operators:

- equals
- notEquals
- exists
- contains
- in
- gt
- gte
- lt
- lte
- matchesRegex

Paths may reference:

- root-prefixed properties (for example repository.name)
- ctx.data properties (default lookup)

---

## Group

A group condition includes:

- type: "group"
- all? (AND)
- any? (OR)
- not? (NOT)

Groups may be nested.

Semantics:

- all → every child must evaluate true
- any → at least one child must evaluate true
- not → child must evaluate false

---

# 6. Evaluation Modes

Rules may specify evaluation mode:

- firstMatch
- allMatches

## firstMatch

- Stop after first rule whose conditions evaluate true
- Execute only that rule’s actions

## allMatches

- Execute actions for every matching rule
- Rules evaluated in deterministic order

If unspecified, the engine default applies.

---

# 7. Deterministic Ordering

Rules are evaluated in deterministic order.

Storage layer guarantees:

1. Deterministic rule retrieval
2. Stable ordering

Given the same RuleContext and same rule set:

- Same matchedRuleIds
- Same action sequence
- Same log output

No randomness exists in evaluation.

---

# 8. Action Execution (MVP)

Each matched rule produces one or more actions.

Actions are executed sequentially in array order.

If a rule defines actions [A, B, C], execution order is:

A → B → C

There is:

- No parallelism
- No batching
- No retry logic
- No rollback

---

# 9. Stub Execution Model

In MVP, actions are executed via stubs.

Supported stubbed action types:

- addLabel
- addComment
- removeLabel (stub placeholder)
- setProjectStatus (stub placeholder)

Stub behavior:

- Produces structured result object
- Does not mutate GitHub
- Logs outcome
- Returns ok: true or ok: false

If a stub handler is not implemented:

- Execution returns ok: false
- Processing continues to next action

---

# 10. Error Behavior

During rule evaluation:

- Condition failures do not throw
- Action failures do not stop execution
- Engine continues processing

Webhook route behavior:

- Always returns 200 after successful normalization
- Execution runs asynchronously

There are no retries or compensation strategies in MVP.

---

# 11. Scope Model

Rules are scoped by:

- installationId
- repositoryId

Rules are loaded only for the repository associated with:

- ctx.installationId
- ctx.repository.id

There is no cross-repository rule execution.

---

# 12. Logging Model

The engine logs structured output including:

- installationId
- event name
- repository
- matchedRuleIds
- action types executed
- action results

This supports deterministic demo output and debugging.

---

# 13. Out of Scope (MVP)

The following are intentionally not supported:

- Real GitHub mutations (Octokit integration pending)
- Retry policies
- Rule prioritization UI
- Rule versioning
- Cross-repository rules
- Time-based rules
- Async background job queues
- Partial action rollback
- Dynamic rule mutation at runtime

These may be introduced in future milestones.

---

# 14. Relationship to Other Documents

See also:

- [architecture](architecture.md)
- [normalization](normalization.md)
- [workflow-builder-mvp](workflow-builder-mvp.md)
- [api-contract](api-contract.md)
- [storage](storage.md)
