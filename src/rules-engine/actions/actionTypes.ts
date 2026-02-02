//rules-engine/actions\actionTypes.ts

import type { Action, ActionType, RuleContext, RuleId } from "../coreTypes.js";

export interface EvaluatedActionInput extends Action {
    ruleId: RuleId;
}

export type ActionHandlerInput = {
    ctx: RuleContext;
    action: EvaluatedActionInput;
};

export type ActionTarget = Record<string, unknown>;

export type ActionStubResult =
    | {
    ok: true;
    actionType: ActionType;
    ruleId: RuleId;
    target?: ActionTarget;
}
    | {
    ok: false;
    actionType: ActionType;
    ruleId: RuleId;
    error: string;
    target?: ActionTarget;
};

export type ActionHandler = (input: ActionHandlerInput) => Promise<ActionStubResult>;
