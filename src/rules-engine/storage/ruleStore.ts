import type { Rule } from "../types.js";

export interface RuleOwnerKey {
    installationId: number;
    repositoryId: number;
}

/**
 * Storage contract for rules.
 * The engine depends on this interface only.
 */
export interface RuleStore {
    /**
     * Return rules scoped to a repo within an installation.
     */
    getRulesForRepo(key: RuleOwnerKey): Promise<Rule[]>;

    /**
     * Optional convenience: return all rules in an installation.
     * Useful for dev/test workflows; avoid using this in production codepaths
     * unless you explicitly intend to evaluate across repos.
     */
    getRulesForInstallation(installationId: number): Promise<Rule[]>;

    /**
     * Replace the rules for a given repo scope.
     * MVP is "replace all" to keep it simple; add patching later if needed.
     */
    upsertRulesForRepo(key: RuleOwnerKey, rules: Rule[]): Promise<void>;

    /**
     * Remove all rules for a repo scope.
     */
    deleteRulesForRepo(key: RuleOwnerKey): Promise<void>;
}