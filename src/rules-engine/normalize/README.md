# Webhook Event Normalization

This module converts raw GitHub webhook payloads into a **normalized internal
event format** (`RuleContext`) used by the rules engine.

The rules engine **must never consume raw GitHub webhook payloads directly**.
All GitHub-specific structure is isolated here.

---

## Responsibility

- Accept raw webhook headers + payloads
- Produce a stable `RuleContext` object
- Normalize event naming and key fields
- Strip GitHub-specific noise from downstream logic

This layer is intentionally minimal and opinionated.

---

## Supported Events (MVP)

Currently supported GitHub webhook events:

- `push`
- `pull_request.*`
    - Example: `pull_request.opened`

Unsupported events are ignored or mapped to a fallback name and produce
minimal normalized data.

---

## Normalized Output

All normalization outputs conform to:

- `RuleContext`
- `RuleEventName`

Defined in `src/rules-engine/types.ts`.

### Core fields provided
- `event.name` (normalized event name)
- `event.receivedAt`
- `event.deliveryId` (when available)
- `repository` (id, owner, name, fullName)
- `actor` (only when both login + id are available)
- `data` (event-specific normalized fields)

---

## Design Notes

- Normalization is **lossy by design** — only fields useful for rule evaluation
  are preserved.
- Optional fields are omitted entirely when unavailable
  (`exactOptionalPropertyTypes` compliant).
- This module does not validate rules or execute actions.

---

## Future Expansion (Non-MVP)

- Additional webhook event types
- Strongly typed payload guards per event
- Schema validation for normalized data

These are intentionally out of scope for the MVP.
