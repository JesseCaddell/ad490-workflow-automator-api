# Workflow Builder MVP Contract (API)

> This document reflects the current MVP implementation.
> Behavior may expand in future milestones.

This document defines the **Workflow Builder MVP behavior** for the AD490 Workflow Automator API.

It describes:

- Workflow shape
- Scoping rules
- Supported triggers
- Supported actions
- Execution order
- Error behavior
- What is intentionally out of scope

This document is demo-facing and reflects the current API implementation.

---

# 1. Workflow Shape (MVP)

A workflow is a **single-trigger, sequential set of steps** scoped to one repository.

```ts
interface Workflow {
  id: string
  name: string
  description?: string
  enabled: boolean

  scope: {
    installationId: number
    repositoryId: number
  }

  trigger: {
    event: RuleEventName
  }

  steps: WorkflowStep[]
}
```

Constraints:

- Exactly one trigger
- Steps execute in array order
- No branching
- No conditions (MVP)
- No versioning
- Maximum 25 steps
- Workflow must contain at least 1 step

---

# 2. Scoping Model

Workflows are scoped by:

- `installationId`
- `repositoryId`

These are provided via headers on API routes:

```
x-installation-id
x-repository-id
```

This guarantees:

- Isolation across installations
- Isolation across repositories
- Same workflow ID may exist in different repo scopes

During webhook execution, the normalized `RuleContext` contains:

```ts
ctx.installationId
ctx.repository.id
```

These are used to look up workflows for that repository only.

---

# 3. Supported Trigger Events (MVP)

Workflow triggers must match normalized event names.

Supported workflow trigger events:

- `issue.opened`
- `issue.assigned`
- `issue.closed`
- `issue.reopened`

- `pull_request.opened`
- `pull_request.draft`
- `pull_request.ready`
- `pull_request.closed`
- `pull_request.merged`

- `pull_request_review.changes_requested`


A workflow executes only if:

```
workflow.enabled === true
AND
workflow.trigger.event === ctx.event.name
```
### Demo Event (Non-MVP Business Logic)

- `push`

This event exists only to allow quick webhook validation during live demos.

It is not considered part of the official Workflow Builder MVP surface area and should not be used in production workflows.


---

# 4. Supported Actions (MVP)

Supported workflow action types:

- `addLabel`
- `removeLabel`
- `addComment`
- `setProjectStatus`

Current execution behavior:

- `addLabel` → stub implemented
- `addComment` → stub implemented
- `removeLabel` → stub implemented (log-only; returns ok: false until real integration exists)
- `setProjectStatus` → stub implemented (log-only; returns ok: false until real integration exists)

Stub behavior:

- No real GitHub mutations occur
- Structured logs are produced
- Action results include `ok: true/false`

Example result:

```json
{
  "ok": true,
  "actionType": "addLabel",
  "ruleId": "workflow:abc123"
}
```

Unknown action types are rejected during workflow validation.

---

# 5. Execution Model (Deterministic & Sequential)

Execution flow on webhook receipt:

1. Webhook received
2. Payload normalized → `RuleContext`
3. Workflows loaded by (installationId, repositoryId)
4. Filter:
    - workflow.enabled === true
    - workflow.trigger.event === ctx.event.name
5. Execute steps sequentially in array order
6. For each step:
    - Convert to EvaluatedActionInput
    - Execute stub
    - Record result
7. Log structured execution output

There is:

- No parallel execution
- No concurrency model
- No retries
- No rollback

Order is deterministic.

---

# 6. Error Behavior

Validation errors (API create/update):

- HTTP 400
- Field-level error details returned

Execution errors (during webhook processing):

- Execution continues to next step
- Failures are logged
- No retry
- No compensation logic
- Webhook always returns 200 once received

Example:

If step 2 fails:
- Step 3 still executes
- Failure is recorded in structured log

---

# 7. Logging Model

On execution, the API logs:

- installationId
- event name
- repository
- matched workflows
- steps attempted
- action results

Logs are structured JSON for demo clarity.

---

# 8. Out of Scope (Intentional MVP Constraints)

The following are NOT supported:

- Multiple triggers per workflow
- Conditional logic
- Branching execution
- Retry policies
- Action batching
- Parallel execution
- Workflow versioning
- Cross-repository workflows
- Real GitHub mutations (Octokit integration pending)

---

# 9. Design Principles

This MVP prioritizes:

- Determinism
- Simplicity
- Demo clarity
- Strict validation
- Explicit scoping
- Safe stub execution

It is intentionally minimal to support milestone demonstration while preserving architectural correctness.

---

End of Workflow Builder MVP Contract.
