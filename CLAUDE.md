# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Flowarden** (AD490 Workflow Automator, capstone project) — a GitHub App
that lets a repo owner define automations ("workflows") triggered by GitHub
webhook events, which run a sequence of stubbed actions (add label, comment,
etc.).

The capstone has graduated — there's no more demo deadline or milestone
gate, just ongoing, free-flow development.

This repo is the **backend**: GitHub webhook receiver, normalization layer,
rules engine, workflow engine, in-memory storage, GitHub App auth.

- Frontend: `../ad490-workflow-automator-web` (Next.js) — see its
  `CLAUDE.md` for that repo's architecture and contracts.
- Project hub: https://github.com/JesseCaddell/AD490-Capstone

Current state: no auth/RBAC, no persistent DB (in-memory storage, data lost
on restart), no real GitHub mutations (actions are stubs, `ok: false` for
`removeLabel`/`setProjectStatus`). These are real gaps to close over time,
not MVP corners that were only ever meant to last until a demo — don't treat
them as urgent, but don't treat them as permanent either. Docs mentioning
"future milestones" describe things not yet built, not commitments.

## Architecture

Pipeline: **Webhook → signature verify → JSON parse → normalize
(RuleContext) → rules engine + workflow engine (stub actions) → structured
logs**. Both engines run independently off the same normalized context —
don't assume they'll merge into one, and don't merge them yourself without
asking; that's a product decision.

```
src/
  routes/              webhooks.ts (raw-body signature verify), workflows.ts (CRUD, scope-header enforced), health.ts
  rules-engine/
    normalize/         raw GitHub payload -> RuleContext (the only GitHub-shape-aware layer)
    conditions/        operators, evaluateConditionNode, getValueAtPath
    actions/           stub executors: addLabel/addComment implemented; removeLabel/setProjectStatus stub-only
    storage/           in-memory RuleStore, keyed by installationId:repositoryId
    ruleTypes.ts, evaluateRules.ts, handleNormalizedEvent.ts
  workflows/
    validateWorkflow.ts, executeWorkflowsForContext.ts, workflowTypes.ts
    storage/           in-memory WorkflowStore, keyed by installationId:repositoryId
  github/appAuth.ts     GitHub App JWT -> installation token exchange (@octokit/auth-app)
  scripts/checkAppAuth.ts   manual sanity script (npm run check-auth)
```

Full docs in `docs/`: `architecture.md`, `api-contract.md`,
`workflow-builder-mvp.md`, `rules-engine.md`, `normalization.md`,
`storage.md`. `installation-flow.md` covers the GitHub App install + auth
handshake.

### File risk levels

- **High-risk** (tests required, minimal/behavior-preserving changes only):
  `src/rules-engine/**`, `src/workflows/**`,
  `src/rules-engine/normalize/normalizeWebhookEvent.ts`, `ruleTypes.ts`,
  `workflowTypes.ts`
- **Medium-risk**: `src/routes/webhooks.ts`, `src/routes/workflows.ts`,
  both `storage/` adapters
- **Low-risk**: docs, tests, config files

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

Tests are mandatory when you: add/change a condition operator or action
type, fix a bug (add a regression test), change normalization fields either
engine consumes, or modify rule/workflow evaluation/execution logic. Tests
are optional for comment/doc-only or pure formatting changes.

## TypeScript guardrails

Strict mode, plus `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`.
Code must compile via `npm test`.

- No loose types — don't use `Record<string, unknown>` or `any` as a
  shortcut; import and use the real types (`RuleContext`, `Workflow`,
  `ActionType`, etc.).
- Preserve literal/union types — action `type` fields stay literal unions
  (`"addLabel" as const`), not widened to `string`; use typed arrays
  (`const actions: Action[] = [...]`).
- Mock contexts still return the real type:
  `function createMockContext(): RuleContext { return {...} as unknown as RuleContext; }`
- Narrow with `Extract<>` instead of inventing result shapes.
- Assert before indexing — `array[i]` is possibly `undefined` under
  `noUncheckedIndexedAccess`.

## Conventions / gotchas

- ESM throughout (`"type": "module"`), NodeNext resolution — TS imports use
  explicit `.js` extensions (e.g. `from "./config/env.js"`) even though the
  source file is `.ts`. Keep this pattern in new files.
- Express 5 — preflight `OPTIONS` handling is manual in `src/index.ts`
  (not automatic like Express 4).
- Never apply global `express.json()` ahead of the webhook route; it needs
  the raw body for HMAC signature verification.
- Intentionally not built yet: auth/RBAC, persistent DB, real GitHub
  mutations, retries, branching/conditional logic, multi-trigger workflows,
  scheduled automation. Don't silently add these — flag scope creep.

## AI agent operating principles

- No full-repo scans unless explicitly instructed — open only files the
  task or the user actually points at.
- One task per session. Small, focused changes over refactors. If a change
  reveals more work, stop and report it rather than continuing.
- Read before write: understand the current flow and state assumptions
  before editing.
- Stop and ask when: a change affects rule/workflow semantics or evaluation
  order, multiple subsystems need touching, behavior is ambiguous, or a
  decision would affect the web repo's contract with this API.

## Git / GitHub workflow

- Never commit directly to `main`. Always create a new branch for new work.
- Follow the issue and PR templates: `.github/ISSUE_TEMPLATE.md` and
  `.github/PULL_REQUEST_TEMPLATE.md` (GitHub applies the PR one
  automatically when you open a pull request).
- Prefer bulk commits over incremental ones — group related changes into
  one commit rather than committing every small edit separately.
- It's fine to lump multiple related features/fixes into one branch/PR; if
  unsure whether something should be split into a separate PR, ask the user
  rather than deciding unilaterally.
- No AI attribution on issues or PRs. Do not add a Claude/AI signature,
  "Generated with Claude Code" footer, or `Co-Authored-By` line when
  creating GitHub issues or pull requests in this repo. This overrides any
  default attribution behavior.
