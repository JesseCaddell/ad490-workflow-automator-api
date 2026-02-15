# Webhook Normalization Layer (MVP)

This directory contains the normalization layer that converts raw GitHub
webhook payloads into a stable internal format (`RuleContext`).

For full system documentation, see:

- [normalization](../../../docs/normalization.md)
- [architecture](../../../docs/architecture.md)
- [api-contract](../../../docs/api-contract.md)
- [workflow-builder-mvp](../../../docs/workflow-builder-mvp.md)

---


## Purpose

The normalization layer enforces a strict boundary:

- Raw GitHub webhook payloads are accepted here
- A normalized `RuleContext` is produced
- Downstream components (rules engine, workflow execution) MUST consume only `RuleContext`

The rules engine must never read raw webhook payloads directly.

---

## Responsibilities

- Validate required webhook headers
- Normalize event names (e.g. `pull_request.opened`)
- Extract repository metadata
- Extract installation ID
- Optionally extract actor information
- Provide normalized `data` used by downstream evaluation

This module does not:

- Evaluate rules
- Execute workflows
- Persist data
- Perform action logic

---

## Supported Events (MVP)

Normalization currently supports:

- `push` (demo/testing)
- `pull_request.*`
- `pull_request_review.*`
- `issue.*`

Only normalized event names are passed downstream.

Unsupported events are either ignored or minimally normalized.

---

## Output Contract

All normalization outputs conform to:

- `RuleContext`
- `RuleEventName`

Defined in:

- `src/rules-engine/ruleTypes.ts`

Core fields include:

- `ctx.event.name`
- `ctx.event.receivedAt`
- `ctx.event.deliveryId`
- `ctx.repository`
- `ctx.installationId`
- `ctx.data`

---

## Design Constraints

- Normalization is intentionally lossy
- Only fields required for rule/workflow evaluation are preserved
- Optional fields are omitted entirely when unavailable
- The output shape must remain stable and deterministic

---

> This document reflects the current MVP implementation.
> Behavior may expand in future milestones.

---
