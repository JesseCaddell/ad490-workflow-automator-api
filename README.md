# AD490 Workflow Automator — API

> 📘 Part of the **AD490 Capstone Project**  
> Project hub / documentation: https://github.com/JesseCaddell/AD490-Capstone

This repository contains the **backend API** and **GitHub App integration layer** for the AD490 Workflow Automator.

## Current MVP Capabilities

- GitHub App webhook receiver + signature verification
- Normalization layer
- Deterministic rules engine (stub actions)
- Workflow Builder MVP (sequential execution, repo-scoped)
- Structured execution logging

## Planned (Future Milestones)

- JSON → YAML workflow generation
- Commit workflow files via GitHub API
- Octokit-backed real action execution
- Persistent database storage
- Audit log persistence

---

# MVP Scope (Current Implementation)

The current MVP includes:

- GitHub webhook receiver (`/webhooks/github`)
- Signature verification
- Normalization layer → `RuleContext`
- Rules engine (deterministic evaluation)
- Workflow Builder API:
  - Repository-scoped workflows
  - Single-trigger workflows
  - Sequential step execution
  - Stub action execution (no live GitHub mutations)
- In-memory storage adapter (replaceable)

The MVP prioritizes:

- Determinism
- Strict scoping
- Clean architectural boundaries
- Safe demo execution
- Test coverage across engine + workflow layers

---

# Documentation

All architectural and behavioral contracts are documented in `/docs`.

See:

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/workflow-builder-mvp.md`
- `docs/rules-engine.md`
- `docs/normalization.md`
- `docs/storage.md`

These documents define:

- System architecture boundaries
- Workflow shape + constraints
- Supported trigger events
- Supported actions (stub vs real)
- Deterministic execution model
- Error behavior
- Explicit MVP limitations

---

# Tech Stack (Current)

- Node.js
- TypeScript
- Express
- Native Node test runner
- In-memory storage adapter (MVP)

Future milestones may introduce:

- Octokit (live GitHub mutations)
- Persistent database storage
- Authentication / RBAC
- Real workflow orchestration

---

# Local Development

## Start the API server

```bash
npm install
npm run dev
```

Server default:

```
http://localhost:3001
```

Health check:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{ "ok": true }
```

---

# Testing GitHub Webhooks Locally (ngrok)

To receive real GitHub webhook traffic locally:

## 1️⃣ Start ngrok

```bash
ngrok http 3001
```

Use the HTTPS URL provided.

## 2️⃣ Configure GitHub App webhook

Webhook URL:

```
https://<your-ngrok-url>/webhooks/github
```

Content type:

```
application/json
```

Webhook secret must match:

```
GITHUB_WEBHOOK_SECRET
```

in your `.env` file.

## 3️⃣ Redeliver a test webhook

GitHub App → Advanced → Webhooks → Redeliver

Expected:

- GitHub returns 200
- API logs structured execution output
- Deterministic rule/workflow behavior

---

# Notes

- Webhook route requires **raw body access** for signature verification.
- JSON middleware must remain scoped to non-webhook routes.
- In-memory storage does not persist across server restarts.
- Workflow actions are stubbed in the MVP (no live GitHub mutations).

---

# Related Repositories

- Project hub: https://github.com/JesseCaddell/AD490-Capstone
- Frontend UI: https://github.com/JesseCaddell/ad490-workflow-automator-web
