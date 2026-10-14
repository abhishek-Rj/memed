import { calculatePayout } from "../src/services/payout.service.js";
const milestones = [
    { views: 10_000, payout: 500 },
    { views: 50_000, payout: 2_000 },
    { views: 100_000, payout: 5_000 },
];
const decide = (
    updatedViews: number,
    currentPayout = 0,
    availableBudget = 20_000,
) =>
    calculatePayout({
        milestones,
        updatedViews,
        currentPayout,
        availableBudget,
    });

describe("calculatePayout", () => {
    test.each([
        [0, 0],
        [9999, 0],
        [10_000, 500],
        [49_999, 500],
        [50_000, 2_000],
        [75_000, 2_000],
        [100_000, 5_000],
        [150_000, 5_000],
    ])("views %i returns payout %i", (views, payout) =>
        expect(decide(views).payout).toBe(payout),
    );
    it("crosses multiple milestones and funds the highest target", () =>
        expect(decide(110_000)).toMatchObject({
            payout: 5_000,
            budgetDelta: 5_000,
        }));
    it("chooses the highest affordable eligible upgrade", () =>
        expect(decide(100_000, 500, 2_000)).toMatchObject({
            payout: 2_000,
            budgetDelta: 1_500,
            targetPayout: 5_000,
        }));
    it("preserves current payout when no upgrade is affordable", () =>
        expect(decide(100_000, 2_000, 1_000)).toMatchObject({
            payout: 2_000,
            budgetDelta: 0,
        }));
    it("releases budget when views decrease", () =>
        expect(decide(50_000, 5_000, 0)).toMatchObject({
            payout: 2_000,
            budgetDelta: -3_000,
        }));
    it("releases all payout below the first threshold", () =>
        expect(decide(0, 500, 0)).toMatchObject({
            payout: 0,
            budgetDelta: -500,
        }));
    it("spends zero at zero budget and returns a zero delta for repeated updates", () => {
        expect(decide(100_000, 0, 0)).toMatchObject({
            payout: 0,
            budgetDelta: 0,
        });
        expect(decide(50_000, 2_000, 0)).toMatchObject({
            payout: 2_000,
            budgetDelta: 0,
        });
    });
    it("rejects malformed inputs and milestones", () => {
        expect(() => decide(-1)).toThrow();
        expect(() =>
            calculatePayout({
                milestones: [
                    { views: 10, payout: 2 },
                    { views: 9, payout: 1 },
                ],
                updatedViews: 10,
                currentPayout: 0,
                availableBudget: 2,
            }),
        ).toThrow();
        expect(() =>
            calculatePayout({
                milestones: [],
                updatedViews: 10,
                currentPayout: -1,
                availableBudget: 2,
            }),
        ).toThrow();
    });
});
