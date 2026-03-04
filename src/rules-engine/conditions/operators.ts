import type { ConditionLeaf } from "../ruleTypes.js";

function asArray(v: unknown): unknown[] | null {
    return Array.isArray(v) ? v : null;
}

export function applyOperator(
    leaf: ConditionLeaf,
    actual: unknown
): boolean {
    const op = leaf.op;
    const expected = leaf.value;

    switch (op) {
        case "exists": {
            return actual !== undefined && actual !== null;
        }

        case "equals": {
            if (Array.isArray(expected) && Array.isArray(actual)) {
                if (expected.length !== actual.length) return false;
                return expected.every((v, i) => actual[i] === v);
            }
            return actual === expected;
        }

        case "notEquals": {
            if (Array.isArray(expected) && Array.isArray(actual)) {
                if (expected.length !== actual.length) return true;
                return !expected.every((v, i) => actual[i] === v);
            }
            return actual !== expected;
        }

        case "contains": {
            if (typeof actual === "string") {
                if (
                    expected === null ||
                    (typeof expected !== "string" &&
                        typeof expected !== "number" &&
                        typeof expected !== "boolean")
                ) {
                    return false;
                }
                return actual.includes(String(expected));
            }

            const arr = asArray(actual);
            if (!arr) return false;

            if (Array.isArray(expected)) {
                return expected.every((v) => arr.includes(v));
            }

            return arr.includes(expected);
        }

        case "in": {
            if (!Array.isArray(expected)) return false;
            return expected.includes(actual as any);
        }

        case "gt":
        case "gte":
        case "lt":
        case "lte": {
            if (expected === undefined) return false;

            // Inline comparison: numbers first, then ISO date strings
            let c: number | null = null;

            if (typeof actual === "number" && typeof expected === "number") {
                c = actual - expected;
            } else if (typeof actual === "string" && typeof expected === "string") {
                const da = Date.parse(actual);
                const db = Date.parse(expected);
                if (!Number.isNaN(da) && !Number.isNaN(db)) {
                    c = da - db;
                }
            }

            if (c === null) return false;

            if (op === "gt") return c > 0;
            if (op === "gte") return c >= 0;
            if (op === "lt") return c < 0;
            return c <= 0;
        }

        case "matchesRegex": {
            if (typeof actual !== "string") return false;
            if (typeof expected !== "string") return false;

            try {
                const re = new RegExp(expected);
                return re.test(actual);
            } catch {
                return false;
            }
        }

        default:
            return false;
    }
}