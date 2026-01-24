## MVP Storage Decision

**Choice:** In-memory storage (Map) + optional seed loader (JSON/TS) for dev.
**Rationale:** Unblocks engine integration quickly, keeps surface area small, and avoids DB/auth complexity while the schema + evaluator are still moving. The storage interface is designed so we can swap in DB later without refactoring the engine.

---

## Ownership Model (Keys)

Rules are scoped to a repo within an installation.

**Primary keys:**
- `installationId` (GitHub App installation)
- `repositoryId` (GitHub repo ID)

**Lookup behavior:**
- Primary: `(installationId, repositoryId)` returns rules for that repo
- Secondary (MVP convenience): `(installationId)` returns all rules under that installation (useful for tests/dev; engine should prefer repo-scoped lookup)

---

## Storage Interface (API Contract)

Create a storage abstraction used by the rules engine:

- `getRulesForRepo(installationId, repositoryId): Promise<Rule[]>`
- `getRulesForInstallation(installationId): Promise<Rule[]>` (optional, dev/tests)
- `upsertRulesForRepo(installationId, repositoryId, rules: Rule[]): Promise<void>` (MVP stub)
- `seed(...)` for dev bootstrapping

Engine code should depend only on this interface.

---

## Seed/Dev Rules

Add a small set of hardcoded or file-seeded rules for a known test repo:
- Example: on `pull_request.opened`, if title contains "[WIP]" then `addLabel: wip`
- Example: on `pull_request.labeled`, if label is "ready" then `setProjectStatus: In Review` (action stub for now)

---

## MVP Limitations (Document)

- Rules are not persisted across server restarts (unless seeded)
- No per-user RBAC / UI editing yet
- No versioning/migrations
- No concurrency guarantees
- No audit log/history

**Exit criteria for MVP:** engine can fetch repo-scoped rules deterministically and tests/dev seeds prove the lookup works.

> Note: Webhook signature verification requires the GitHub App webhook
> secret to be configured in both the GitHub App settings and the API
> environment. Unsigned deliveries will be rejected with 401.
