
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
