export type Milestone = { views: number; payout: number };
export type PayoutDecision = {
    payout: number;
    budgetDelta: number;
    targetPayout: number;
};

export function calculatePayout(input: {
    milestones: Milestone[];
    updatedViews: number;
    currentPayout: number;
    availableBudget: number;
}): PayoutDecision {
    const { milestones, updatedViews, currentPayout, availableBudget } = input;
    if (
        !Number.isSafeInteger(updatedViews) ||
        updatedViews < 0 ||
        !Number.isSafeInteger(currentPayout) ||
        currentPayout < 0 ||
        !Number.isSafeInteger(availableBudget) ||
        availableBudget < 0
    )
        throw new Error("Payout inputs must be nonnegative safe integers");
    if (!Array.isArray(milestones) || milestones.length === 0)
        throw new Error("At least one milestone is required");
    let prevViews = 0;
    let prevPayout = 0;
    for (const milestone of milestones) {
        if (
            !Number.isSafeInteger(milestone.views) ||
            milestone.views <= prevViews ||
            !Number.isSafeInteger(milestone.payout) ||
            milestone.payout < prevPayout
        )
            throw new Error(
                "Milestones must have increasing positive views and nondecreasing nonnegative payouts",
            );
        prevViews = milestone.views;
        prevPayout = milestone.payout;
    }
    const targetPayout =
        milestones.filter((m) => m.views <= updatedViews).at(-1)?.payout ?? 0;
    if (targetPayout <= currentPayout)
        return {
            payout: targetPayout,
            budgetDelta: targetPayout - currentPayout,
            targetPayout,
        };
    const affordable = milestones
        .filter(
            (m) =>
                m.views <= updatedViews &&
                m.payout > currentPayout &&
                m.payout - currentPayout <= availableBudget,
        )
        .at(-1);
    const payout = affordable?.payout ?? currentPayout;
    return { payout, budgetDelta: payout - currentPayout, targetPayout };
}
