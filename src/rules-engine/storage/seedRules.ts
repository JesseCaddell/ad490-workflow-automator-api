// src/rules-engine/storage/seedRules.ts

import type { Rule } from "../coreTypes.js";
import type { RuleOwnerKey, RuleStore } from "./ruleStore.js";

export interface SeedSpec {
    owner: RuleOwnerKey;
    rules: Rule[];
}

/**
 * Minimal example seed rules.
 * Keep these aligned with your supported operators/action types.
 */
export const DEFAULT_SEED_SPECS: SeedSpec[] = [
    {
        owner: { installationId: 105808469, repositoryId: 1140915493 }, // replace with your dev install/repo IDs
        rules: [
            {
                id: "seed-pr-opened-wip-label",
                name: "Label WIP PRs on open",
                description: "If PR title includes [WIP], add wip label.",
                enabled: true,
                trigger: { event: "pull_request.opened" },
                conditions: {
                    type: "leaf",
                    path: "pullRequest.title",
                    op: "contains",
                    value: "[WIP]",
                },
                actions: [
                    {
                        type: "addLabel",
                        params: { label: "wip" },
                    },
                ],
                evaluation: { mode: "allMatches" },
                metadata: { version: 1 },
            },
            {
                id: "seed-pr-labeled-ready-set-status",
                name: "Move ready PRs to In Review",
                description: 'If PR is labeled "ready", set project status to In Review.',
                enabled: true,
                trigger: { event: "pull_request.labeled" },
                conditions: {
                    type: "leaf",
                    path: "pullRequest.labels",
                    op: "contains",
                    value: "ready",
                },
                actions: [
                    {
                        type: "setProjectStatus",
                        params: { status: "In Review" },
                    },
                ],
                evaluation: { mode: "allMatches" },
                metadata: { version: 1 },
            },
            {
                id: "seed-push-any-branch",
                name: "Log pushes (dev test)",
                description: "Dev-only rule to validate push normalization + lookup",
                enabled: true,
                trigger: { event: "push" },
                conditions: {
                    type: "leaf",
                    path: "ref",
                    op: "exists",
                },
                actions: [
                    {
                        type: "addComment",
                        params: {
                            body: "Push detected (dev seed rule)",
                        },
                    },
                ],
                evaluation: { mode: "allMatches" },
                metadata: { version: 1 },
            },
        ],
    },
];

/**
 * Applies seed specs to the store. Intended for dev/local boot.
 * This is "replace all rules for repo" to keep MVP deterministic.
 */
export async function applySeedSpecs(
    store: RuleStore,
    specs: SeedSpec[] = DEFAULT_SEED_SPECS
): Promise<void> {
    for (const spec of specs) {
        await store.upsertRulesForRepo(spec.owner, spec.rules);
    }
}

/**
 * Optional helper if you want to seed a single repo quickly.
 */
export async function seedRepo(
    store: RuleStore,
    owner: RuleOwnerKey,
    rules: Rule[]
): Promise<void> {
    await store.upsertRulesForRepo(owner, rules);
}
