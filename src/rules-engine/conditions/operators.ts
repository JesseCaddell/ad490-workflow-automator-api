import type { ConditionLeaf } from "../coreTypes.js";

function isPrimitive(v: unknown): v is string | number | boolean | null {
    return (
        v === null ||
        typeof v === "string" ||
        typeof v === "number" ||
        typeof v === "boolean"
    );
}

function asArray(v: unknown): unknown[] | null {
    return Array.isArray(v) ? v : null;
}

function tryParseDate(v: unknown): number | null {
    if (typeof v !== "string") return null;
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
}

function compare(a: unknown, b: unknown): number | null {
    // numbers
    if (typeof a === "number" && typeof b === "number") return a - b;

    // ISO-ish dates (string)
    const da = tryParseDate(a);
    const db = tryParseDate(b);
    if (da !== null && db !== null) return da - db;

    return null;
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
            // MVP: expected is primitive or array of primitives per coreTypes.ts
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
                if (!isPrimitive(expected) || expected === null) return false;
                return actual.includes(String(expected));
            }

            const arr = asArray(actual);
            if (!arr) return false;

            // if expected is an array, require all expected values exist in actual
            if (Array.isArray(expected)) {
                return expected.every((v) => arr.includes(v));
            }

            return arr.includes(expected);
        }

        case "in": {
            // "actual in expected[]"
            if (!Array.isArray(expected)) return false;
            return expected.includes(actual as any);
        }

        case "gt":
        case "gte":
        case "lt":
        case "lte": {
            if (expected === undefined) return false;
            const c = compare(actual, expected);
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
