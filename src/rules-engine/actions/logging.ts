export function logActionStub(payload: {
    ruleId: string;
    actionType: string;
    target?: Record<string, unknown>;
    message: string;
    data?: Record<string, unknown>;
}) {
    // Structured log for safe E2E testing (no GitHub mutations)
    console.info("[action-stub]", {
        ruleId: payload.ruleId,
        actionType: payload.actionType,
        target: payload.target ?? {},
        message: payload.message,
        ...(payload.data ? { data: payload.data } : {}),
    });
}
