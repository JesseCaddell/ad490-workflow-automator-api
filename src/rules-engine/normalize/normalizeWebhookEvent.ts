import type { RuleContext, RuleEventName } from "../types.js";

type GithubWebhookHeaders = Record<string, string | string[] | undefined>;

interface NormalizeInput {
    headers: GithubWebhookHeaders;
    payload: any;
    receivedAtIso?: string;
}

/**
 * Convert GitHub webhook headers + raw payload into a RuleContext.
 * The rest of the rules engine should only ever see RuleContext.
 */
export function normalizeWebhookEvent(input: NormalizeInput): RuleContext {
    const receivedAt = input.receivedAtIso ?? new Date().toISOString();

    const installationId: number | undefined = input.payload?.installation?.id;
    if (!installationId) {
        throw new Error("normalizeWebhookEvent: missing installation.id in payload");
    }

    const event = readHeader(input.headers, "x-github-event");
    const action = input.payload?.action as string | undefined;

    const eventName = toRuleEventName(event, action);

    const repo = input.payload?.repository;
    if (!repo?.id || !repo?.full_name) {
        throw new Error("normalizeWebhookEvent: missing repository in payload");
    }

    const fullName = String(repo.full_name);
    const parts = fullName.split("/");

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(
            `normalizeWebhookEvent: invalid repository.full_name: ${fullName}`
        );
    }

    const owner = parts[0];
    const name = parts[1];

    const actorLogin =
        input.payload?.sender?.login ??
        input.payload?.pusher?.name ??
        input.payload?.sender?.name;

    const actorId = input.payload?.sender?.id;

    const actor =
        typeof actorLogin === "string" && actorLogin.length > 0 && typeof actorId === "number"
            ? { login: actorLogin, id: actorId }
            : undefined;

    const deliveryId = readHeader(input.headers, "x-github-delivery");

    return {
        installationId,
        event: {
            name: eventName,
            receivedAt,
            ...(deliveryId ? { deliveryId } : {}),
        },
        repository: {
            id: repo.id,
            owner,
            name,
            fullName: repo.full_name,
        },
        ...(actor ? { actor } : {}),
        data: buildNormalizedData(eventName, input.payload),
    };
}


function readHeader(headers: GithubWebhookHeaders, key: string): string | undefined {
    const v = headers[key] ?? headers[key.toLowerCase()];
    if (Array.isArray(v)) return v[0];
    return v;
}

function toRuleEventName(event: string | undefined, action?: string): RuleEventName {
    if (!event) return "unknown";

    // MVP: push + pull_request actions
    if (event === "push") return "push";

    if (event === "pull_request") {
        if (!action) return "pull_request.unknown";
        return `pull_request.${action}` as RuleEventName;
    }

    // fallback for future expansion
    return event as RuleEventName;
}

function buildNormalizedData(eventName: RuleEventName, payload: any): Record<string, unknown> {
    switch (eventName) {
        case "push": {
            return {
                ref: payload?.ref,
                before: payload?.before,
                after: payload?.after,
                headCommit: payload?.head_commit
                    ? {
                        id: payload.head_commit.id,
                        message: payload.head_commit.message,
                        url: payload.head_commit.url,
                        timestamp: payload.head_commit.timestamp,
                    }
                    : null,
                commits: Array.isArray(payload?.commits)
                    ? payload.commits.map((c: any) => ({
                        id: c.id,
                        message: c.message,
                        url: c.url,
                        timestamp: c.timestamp,
                    }))
                    : [],
            };
        }

        default: {
            // pull_request.opened, pull_request.labeled, etc.
            if (String(eventName).startsWith("pull_request.")) {
                const pr = payload?.pull_request;
                return {
                    pullRequest: pr
                        ? {
                            id: pr.id,
                            number: pr.number,
                            title: pr.title,
                            body: pr.body,
                            state: pr.state,
                            draft: pr.draft,
                            url: pr.html_url,
                            author: pr.user?.login,
                            base: { ref: pr.base?.ref, sha: pr.base?.sha },
                            head: { ref: pr.head?.ref, sha: pr.head?.sha },
                            labels: Array.isArray(pr.labels) ? pr.labels.map((l: any) => l.name) : [],
                        }
                        : null,
                    // include label name for labeled/unlabeled events
                    label: payload?.label?.name ?? null,
                };
            }

            return {};
        }
    }
}
