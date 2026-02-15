# Routes (MVP Boundary Guide)

This folder contains the HTTP routing layer for the API.

This document exists to protect architectural boundaries.

For full system documentation, see:
- [workflow-builder-mvp](../../docs/workflow-builder-mvp.md)
- [api-contract](../../docs/api-contract.md)
- [architecture](../../docs/architecture.md)

---

## Purpose of This Layer

Routes must remain **thin**.

Routes are responsible for:

- Parsing and validating request input
- Enforcing scope headers (`installationId`, `repositoryId`)
- Calling the appropriate store/service
- Returning consistent response envelopes

Routes must NOT:

- Contain business logic
- Access raw GitHub payloads directly (except webhook signature verification)
- Perform rule evaluation or workflow execution

---

## Middleware Rule (Critical)

Do NOT add global `express.json()` in `src/index.ts`.

Reason:
The GitHub webhook route requires access to the raw request body for
signature verification.

JSON parsing must be applied locally per router.

---

## Response Envelope Contract

All non-204 responses must follow this shape.

### Success
```json
{ "ok": true, "data": <payload> }
```

### Error
```json
{
  "ok": false,
  "error": {
    "code": "<ERROR_CODE>",
    "message": "<human readable message>"
  }
}
```

---

## Scope Model (MVP)

Workflow routes require explicit scope headers:

- `x-installation-id`
- `x-repository-id`

Missing headers:
- 401 UNAUTHORIZED

Invalid headers:
- 400 BAD_REQUEST

This mechanism is temporary until user/session auth is introduced.

---

## Webhook Route

`POST /webhooks/github`

Responsibilities:

- Verify GitHub webhook signature
- Normalize payload
- Delegate to rules engine
- Return 200 immediately after receipt

This route must always use raw body middleware.

---

> This document reflects the current MVP implementation.
> Behavior may expand in future milestones.

---

