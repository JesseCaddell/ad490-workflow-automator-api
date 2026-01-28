
### Rule lifecycle
1. Webhook received
2. Validate + normalize payload into a stable `RuleContext`
3. Select enabled rules where `rule.trigger.event` matches `context.event.name`
4. Evaluate conditions
5. Execute actions for matched rules (stubs for now)
6. Respect evaluation mode: `firstMatch` stops after first matching rule; `allMatches` runs all matches

### Event + context (normalized)
- `context.event.name` is a stable string like:
    - `pull_request.opened`
    - `pull_request.synchronize`
    - `pull_request.labeled`
    - `pull_request.unlabeled`
    - `pull_request.closed`
    - `pull_request.reopened`
    - `pull_request_review.submitted`
- `context.data` contains normalized fields used by conditions (not raw GitHub payloads).

### Condition operators (MVP)
- `equals`, `notEquals`
- `exists`
- `contains` (string/array contains)
- `in` (value is in list)
- `gt`, `gte`, `lt`, `lte` (numbers, dates as ISO strings if needed later)
- `matchesRegex` (string)

### Condition shape
- Support nested groups using `all` (AND), `any` (OR), and optional `not`

### Action types (names only for MVP)
- `addLabel`, `removeLabel`
- `addComment`
- `requestReviewers`
- `setAssignees`
- `setProjectStatus` (Project V2 field update)
- `addToProject`
- `setField` (generic Project V2 field update)

### Evaluation order
- `firstMatch`: run actions for first matching rule only
- `allMatches`: run actions for every matching rule
- Within a rule, actions run in array order (sequential)

### Error behavior (MVP)
- If an action fails, mark action as failed in logs and continue to next action (no retries yet)
- Rule evaluation is deterministic: same context + same rule set => same matched rules

### Rule Source & Storage (MVP)

The rules engine does not own persistence logic.

Rules are retrieved through a storage adapter that returns
repository-scoped rules using:

- Installation ID
- Repository ID

The engine assumes:
- Rules are already validated against the schema
- Rule ordering is deterministic
- Storage may be in-memory or persistent (implementation-dependent)

For MVP, an in-memory storage adapter is used.

---

## Rules Engine MVP Scope & Guarantees (Epic 3)

This rules engine is intentionally limited in scope for the MVP.
The goal is to provide **deterministic, testable rule evaluation**
based on normalized GitHub events — not full workflow orchestration.

### What the MVP Rules Engine Guarantees

- Rules are evaluated **only** against normalized `RuleContext` data
- Raw GitHub webhook payloads are never accessed during evaluation
- Rule matching is deterministic:
  - Same context + same rules = same results
- Rule selection is repository-scoped and installation-scoped
- Condition evaluation is pure (no side effects)
- Action execution order is predictable and sequential
- Failures in one action do **not** stop rule evaluation

### What Is Explicitly Out of Scope (MVP)

The following are intentionally **not supported** in the MVP:

- Direct access to raw GitHub webhook payloads
- Dynamic rule mutation at runtime
- Cross-repository or cross-installation rules
- Regex capture groups or computed condition values
- Conditional branching inside action execution
- Action retries, rollbacks, or transactional guarantees
- Workflow dependencies or multi-step orchestration
- Time-based or scheduled rule evaluation
- User-defined scripting or custom expressions

These features may be considered in future epics.

### Relationship to Other System Components

- **Normalization Layer**  
  Responsible for converting raw GitHub events into stable
  `RuleContext` objects. The rules engine assumes this has already occurred.

- **Storage Layer**  
  Responsible for persistence, validation, and ordering of rules.
  The rules engine does not validate schemas or manage storage state.

- **Workflow Builder (Future)**  
  Will be responsible for authoring rule definitions that conform
  to the contracts defined in this document.
