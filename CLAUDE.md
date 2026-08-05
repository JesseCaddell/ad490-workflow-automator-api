# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Flowarden** (AD490 Workflow Automator, capstone project) — a GitHub App
that lets a repo owner define automations ("workflows") triggered by GitHub
webhook events, which run a sequence of stubbed actions (add label, comment,
etc.).

This repo is the **backend**: GitHub webhook receiver, normalization layer,
rules engine, workflow engine, in-memory storage, GitHub App auth.

- Frontend: `../ad490-workflow-automator-web` (Next.js) — see its
  `CLAUDE.md` for that repo's architecture and contracts.
- Project hub: https://github.com/JesseCaddell/AD490-Capstone

MVP-stage: no auth/RBAC, no persistent DB (in-memory storage, data lost on
restart), no real GitHub mutations (actions are stubs, `ok: false` for
`removeLabel`/`setProjectStatus`). Treat docs mentioning "future milestones"
as not built.

## Architecture

Pipeline: **Webhook → signature verify → JSON parse → normalize
(RuleContext) → rules engine + workflow engine (stub actions) → structured
logs**.

- `src/routes/` — `webhooks.ts` (raw-body signature verification, must stay
  outside global JSON middleware — see comment in `src/index.ts`),
  `workflows.ts` (CRUD, scope-header enforced), `health.ts`.
- `src/rules-engine/normalize/` — converts raw GitHub payloads into the
  stable `RuleContext`; the only GitHub-shape-aware layer.
- `src/rules-engine/` — condition-based rules engine (`evaluateRules.ts`,
  `conditions/`), deterministic, no retries.
- `src/rules-engine/actions/` — stub action executors (`addLabel`,
  `addComment` implemented; `removeLabel`/`setProjectStatus` stub-only).
- `src/workflows/` — workflow validation (`validateWorkflow.ts`) and
  sequential execution (`executeWorkflowsForContext.ts`).
- `src/workflows/storage/`, `src/rules-engine/storage/` — in-memory Map
  adapters keyed by `installationId:repositoryId`, swappable later.
- `src/github/appAuth.ts` — GitHub App JWT → installation token exchange
  (`@octokit/auth-app`); `src/scripts/checkAppAuth.ts` is a manual sanity
  script (`npm run check-auth`).

Full docs in `docs/`: `architecture.md`, `api-contract.md`,
`workflow-builder-mvp.md`, `rules-engine.md`, `normalization.md`,
`storage.md`. `installation-flow.md` covers the GitHub App install + auth
handshake.

## Key contracts (shared with the web repo — keep in sync with its CLAUDE.md)

- **Scope**: every workflow/rule is scoped by `(installationId,
  repositoryId)`, enforced via `x-installation-id` / `x-repository-id`
  headers (401 if missing, 400 if non-numeric). No cross-repo access, ever.
- **Workflow shape**: one trigger, `steps[]` executed in array order,
  1–25 steps, no branching/conditions. Trigger event must be one of the
  supported normalized event names (`rules-engine.md` §4).
- **Response envelope**: `{ ok: true, data }` or `{ ok: false, error:
  { code, message, details? } }`. Error codes: `UNAUTHORIZED`,
  `BAD_REQUEST`, `NOT_FOUND`, `CONFLICT`, `INTERNAL`.
- **Determinism**: same input ⇒ same rule/workflow selection, same
  execution order, same logs. No randomness, no retries, no rollback —
  don't add any without discussing scope first.

## Local development

```bash
npm install && npm run dev   # tsx watch, port 3001
```

Requires `.env` with `GITHUB_APP_ID`, `GITHUB_WEBHOOK_SECRET`,
`GITHUB_PRIVATE_KEY_PATH` (see `installation-flow.md`). Health check:
`curl http://localhost:3001/health`. ngrok is only needed for live webhook
delivery, not for smoke testing.

## Testing

```bash
npm run build && node --test "dist/**/*.test.js"
```

Native Node test runner (no Jest). Tests live in `__tests__/` next to the
code they cover. All tests must pass before considering a change done.

## Conventions / gotchas

- ESM throughout (`"type": "module"`), NodeNext resolution — TS imports use
  explicit `.js` extensions (e.g. `from "./config/env.js"`) even though the
  source file is `.ts`. Keep this pattern in new files.
- Express 5 — preflight `OPTIONS` handling is manual in `src/index.ts`
  (not automatic like Express 4).
- Never apply global `express.json()` ahead of the webhook route; it needs
  the raw body for HMAC signature verification.
- MVP intentionally excludes: auth/RBAC, persistent DB, real GitHub
  mutations, retries, branching/conditional logic, multi-trigger workflows,
  scheduled automation. Don't silently add these — flag scope creep.

## Git / GitHub workflow

- Never commit directly to `main`. Always create a new branch for new work.
- Before opening a PR, read `docs/PR_TEMPLATE.md` and fill it out.
- Commit in logical chunks — group related changes into one commit rather
  than committing every small edit separately.
- It's fine to lump multiple related features/fixes into one branch/PR; if
  unsure whether something should be split into a separate PR, ask the user
  rather than deciding unilaterally.
