# Routes (MVP)

This folder contains the HTTP routing layer for the API.

## Design Rules

- Routes should stay **thin**:
    - parse and validate input
    - enforce request scope / access checks
    - call the appropriate service or store
    - return consistent response shapes and status codes
- Do **not** add global `express.json()` in `src/index.ts`.
    - The GitHub webhook route requires access to the **raw request body** for signature verification.
    - JSON parsing must be applied **locally per router**.

---

## Standard Response Shape

All non-`204` responses follow a consistent envelope.

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

## Health Route

### `GET /health`

Basic liveness check.

**Response**
```json
{ "ok": true }
```

---

## GitHub Webhook Route

### `POST /webhooks/github`

Handles GitHub App webhook deliveries and evaluates rules against normalized events.

**Important Notes**
- This route requires **raw body** access for signature verification.
- Never apply global JSON middleware above this router.

---

## Workflows API (MVP)

Workflow CRUD endpoints used by the web UI.

### Scope / Access Model (MVP)

All workflow routes require explicit scope headers:

- `x-installation-id` — GitHub App installation ID
- `x-repository-id` — GitHub repository ID

If headers are missing:
- `401 UNAUTHORIZED`

If headers are invalid:
- `400 BAD_REQUEST`

> MVP note: This is a temporary mechanism until user/session auth is introduced.

---

### List Workflows

`GET /api/workflows`

**Response**
```json
{
  "ok": true,
  "data": [
    {
      "id": "uuid",
      "name": "My Workflow",
      "enabled": true,
      "scope": {
        "installationId": 1,
        "repositoryId": 2
      },
      "trigger": { "event": "push" },
      "steps": [],
      "metadata": {
        "createdBy": "api",
        "createdAt": "2026-02-07T00:00:00.000Z",
        "updatedAt": "2026-02-07T00:00:00.000Z"
      }
    }
  ]
}
```

**Example**
```bash
curl -i \
  -H "x-installation-id: 1" \
  -H "x-repository-id: 2" \
  http://localhost:3001/api/workflows
```

---

### Create Workflow

`POST /api/workflows`

**Request Body**
```json
{
  "name": "My Workflow",
  "description": "Optional description",
  "enabled": true,
  "trigger": { "event": "push" },
  "steps": []
}
```

**Response**
```json
{ "ok": true, "data": { "...workflow" } }
```

**Errors**
- `400 BAD_REQUEST` — invalid payload
- `409 CONFLICT` — duplicate workflow ID within scope

**Example**
```bash
curl -i \
  -H "content-type: application/json" \
  -H "x-installation-id: 1" \
  -H "x-repository-id: 2" \
  -d '{ "name":"My Workflow", "trigger": { "event":"push" }, "steps":[] }' \
  http://localhost:3001/api/workflows
```

---

### Get Workflow

`GET /api/workflows/:workflowId`

**Response**
```json
{ "ok": true, "data": { "...workflow" } }
```

**Errors**
- `404 NOT_FOUND`

**Example**
```bash
curl -i \
  -H "x-installation-id: 1" \
  -H "x-repository-id: 2" \
  http://localhost:3001/api/workflows/<workflowId>
```

---

### Update Workflow

`PATCH /api/workflows/:workflowId`

Supported fields:
- `name`
- `description`
- `enabled`

**Example Body**
```json
{ "name": "Updated Name" }
```

**Response**
```json
{ "ok": true, "data": { "...workflow" } }
```

**Errors**
- `400 BAD_REQUEST`
- `404 NOT_FOUND`

**Example**
```bash
curl -i \
  -X PATCH \
  -H "content-type: application/json" \
  -H "x-installation-id: 1" \
  -H "x-repository-id: 2" \
  -d '{ "enabled": false }' \
  http://localhost:3001/api/workflows/<workflowId>
```

---

### Delete Workflow

`DELETE /api/workflows/:workflowId`

**Response**
- `204 No Content`

**Errors**
- `404 NOT_FOUND`

**Example**
```bash
curl -i \
  -X DELETE \
  -H "x-installation-id: 1" \
  -H "x-repository-id: 2" \
  http://localhost:3001/api/workflows/<workflowId>
```

---

## Error Codes

| Code | Meaning |
|-----|--------|
| `UNAUTHORIZED` | Missing scope headers |
| `BAD_REQUEST` | Invalid headers or request body |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Duplicate resource |
| `INTERNAL` | Unexpected server error |
