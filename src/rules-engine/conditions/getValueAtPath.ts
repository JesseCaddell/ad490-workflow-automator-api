import type { RuleContext } from "../types.js";

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Path resolution rules (MVP):
 * - If path starts with "event.", "repository.", "actor.", or "data.", read from ctx root.
 * - Otherwise, assume the path is rooted in ctx.data (so "pullRequest.base.ref" works).
 */
export function getValueAtPath(ctx: RuleContext, path: string): unknown {
    if (!path || typeof path !== "string") return undefined;

    const rootPrefixes = ["event.", "repository.", "actor.", "data."];

    const fromRoot = rootPrefixes.some((p) => path.startsWith(p));
    const effectivePath = fromRoot ? path : `data.${path}`;

    const parts = effectivePath.split(".").filter(Boolean);
    if (parts.length === 0) return undefined;

    let cur: unknown = ctx as unknown;

    for (const key of parts) {
        if (isRecord(cur) && key in cur) {
            cur = cur[key];
            continue;
        }
        return undefined;
    }

    return cur;
}
