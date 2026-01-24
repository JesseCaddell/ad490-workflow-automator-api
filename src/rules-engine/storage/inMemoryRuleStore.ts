import type { Rule } from "../types.js";
import type { RuleOwnerKey, RuleStore } from "./ruleStore.js";

function makeRepoKey(key: RuleOwnerKey): string {
    return `${key.installationId}:${key.repositoryId}`;
}

function cloneRules(rules: Rule[]): Rule[] {
    // shallow clone is enough for MVP; rules should be treated as immutable.
    return rules.map((r) => ({ ...r }));
}

/**
 * MVP-only, process-memory store.
 * Not persisted across restarts.
 */
export class InMemoryRuleStore implements RuleStore {
    private readonly repoRules = new Map<string, Rule[]>();

    async getRulesForRepo(key: RuleOwnerKey): Promise<Rule[]> {
        const k = makeRepoKey(key);
        const rules = this.repoRules.get(k) ?? [];
        return cloneRules(rules);
    }

    async getRulesForInstallation(installationId: number): Promise<Rule[]> {
        const all: Rule[] = [];

        for (const [k, rules] of this.repoRules.entries()) {
            // key format: `${installationId}:${repositoryId}`
            if (k.startsWith(`${installationId}:`)) {
                all.push(...rules);
            }
        }

        // return cloned array to avoid accidental mutation from callers
        return cloneRules(all);
    }

    async upsertRulesForRepo(key: RuleOwnerKey, rules: Rule[]): Promise<void> {
        const k = makeRepoKey(key);

        // Ensure deterministic ordering (caller controls ordering).
        // Store cloned values to prevent shared references.
        this.repoRules.set(k, cloneRules(rules));
    }

    async deleteRulesForRepo(key: RuleOwnerKey): Promise<void> {
        const k = makeRepoKey(key);
        this.repoRules.delete(k);
    }

    /**
     * Convenience method for tests/dev seeds (not part of interface).
     */
    clearAll(): void {
        this.repoRules.clear();
    }
}
