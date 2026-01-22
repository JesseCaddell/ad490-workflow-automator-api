export type RuleId = string;

export type RuleEvaluationMode = "firstMatch" | "allMatches";

export type RuleEventName =
    | "pull_request.opened"
    | "pull_request.synchronize"
    | "pull_request.labeled"
    | "pull_request.unlabeled"
    | "pull_request.closed"
    | "pull_request.reopened"
    | "pull_request_review.submitted"
    | (string & {}); // allow expansion without breaking MVP

export interface RuleTrigger {
    event: RuleEventName;
}

export type ConditionOperator =
    | "equals"
    | "notEquals"
    | "exists"
    | "contains"
    | "in"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "matchesRegex";

export type ConditionValue =
    | string
    | number
    | boolean
    | null
    | Array<string | number | boolean | null>;

export interface ConditionLeaf {
    type: "leaf";
    path: string; // e.g. "pullRequest.base.ref" or "repository.name"
    op: ConditionOperator;
    value?: ConditionValue; // omitted for exists
}

export interface ConditionGroup {
    type: "group";
    all?: ConditionNode[]; // AND
    any?: ConditionNode[]; // OR
    not?: ConditionNode;   // NOT
}

export type ConditionNode = ConditionLeaf | ConditionGroup;

export type ActionType =
    | "addLabel"
    | "removeLabel"
    | "addComment"
    | "requestReviewers"
    | "setAssignees"
    | "setProjectStatus"
    | "addToProject"
    | "setField";

export interface Action {
    type: ActionType;
    params?: Record<string, unknown>; // MVP: unvalidated until action stubs exist
}

export interface Rule {
    id: RuleId;
    name: string;
    description?: string;
    enabled: boolean;
    trigger: RuleTrigger;
    conditions: ConditionNode; // root node
    actions: Action[];
    evaluation?: {
        mode?: RuleEvaluationMode; // default defined by engine
    };
    metadata?: {
        createdAt?: string; // ISO
        updatedAt?: string; // ISO
        version?: number;
    };
}

export interface RuleContext {
    event: {
        name: RuleEventName;
        deliveryId?: string;
        receivedAt: string; // ISO
    };
    repository: {
        id: number;
        owner: string;
        name: string;
        fullName: string; // owner/name
    };
    actor?: {
        login: string;
        id: number;
    };
    data: Record<string, unknown>; // normalized data used by conditions
}
