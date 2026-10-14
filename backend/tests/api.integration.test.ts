import { MongoMemoryReplSet } from "mongodb-memory-server";
import request from "supertest";
import type { Express } from "express";

let repl: MongoMemoryReplSet;
let app: Express;
let disconnect: () => Promise<void>;

beforeAll(async () => {
    process.env.NODE_ENV = "test";
    process.env.PORT = "4000";
    process.env.ACCESS_TOKEN_SECRET =
        "test-access-secret-that-is-more-than-32-chars";
    process.env.REFRESH_TOKEN_SECRET =
        "test-refresh-secret-that-is-different-32";
    process.env.FRONTEND_ORIGIN = "http://localhost:3000";
    process.env.COOKIE_DOMAIN = "";
    repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = repl.getUri();
    const [appModule, dbModule] = await Promise.all([
        import("../src/app.js"),
        import("../src/config/db.js"),
    ]);
    app = appModule.app;
    await dbModule.connectDatabase();
    const mongoose = await import("mongoose");
    disconnect = async () => {
        await mongoose.default.disconnect();
        await repl.stop();
    };
}, 120_000);

afterAll(async () => {
    if (disconnect) await disconnect();
});

async function register(role: "brand" | "creator", email: string) {
    const client = request.agent(app);
    const csrf = await client.get("/api/auth/csrf");
    const response = await client
        .post("/api/auth/signup")
        .set("X-CSRF-Token", csrf.body.csrfToken)
        .send({
            name: "Test User",
            email,
            password: "a-safe-password-123",
            role,
        });
    expect(response.status).toBe(201);
    return client;
}

describe("campaign and submission API", () => {
    it("enforces roles and campaign ownership, submits a post, and accounts for repeated and concurrent updates", async () => {
        const brand = await register("brand", "brand@example.test");
        const otherBrand = await register("brand", "other@example.test");
        const creator = await register("creator", "creator@example.test");
        const brandCsrf = await brand.get("/api/auth/csrf");
        const creatorCsrf = await creator.get("/api/auth/csrf");
        const me = await brand.get("/api/auth/me");
        expect(me.body.user.passwordHash).toBeUndefined();
        const refresh = await brand
            .post("/api/auth/refresh")
            .set("X-CSRF-Token", brandCsrf.body.csrfToken);
        expect(refresh.status).toBe(200);
        const denied = await creator
            .post("/api/campaigns")
            .set("X-CSRF-Token", creatorCsrf.body.csrfToken)
            .send({});
        expect(denied.status).toBe(403);
        const created = await brand
            .post("/api/campaigns")
            .set("X-CSRF-Token", brandCsrf.body.csrfToken)
            .send({
                name: "Creator launch",
                platform: "instagram",
                totalBudget: 2500,
                milestones: [
                    { views: 10000, payout: 500 },
                    { views: 50000, payout: 2000 },
                    { views: 100000, payout: 5000 },
                ],
            });
        expect(created.status).toBe(201);
        const id = created.body.campaign.id as string;
        expect(
            (await brand.get("/api/campaigns/mine")).body.campaigns,
        ).toHaveLength(1);
        expect(
            (await otherBrand.get(`/api/campaigns/${id}/stats`)).status,
        ).toBe(404);
        const post = await creator
            .post(`/api/campaigns/${id}/submissions`)
            .set("X-CSRF-Token", creatorCsrf.body.csrfToken)
            .send({ postUrl: "https://www.instagram.com/p/abc123/" });
        expect(post.status).toBe(201);
        const secondPost = await creator
            .post(`/api/campaigns/${id}/submissions`)
            .set("X-CSRF-Token", creatorCsrf.body.csrfToken)
            .send({ postUrl: "https://www.instagram.com/reel/another123/" });
        expect(secondPost.status).toBe(409);
        expect(secondPost.body.error).toMatch(/already submitted/i);
        const submissionId = post.body.submission.id as string;
        const updated = await brand
            .patch(`/api/submissions/${submissionId}/views`)
            .set("X-CSRF-Token", brandCsrf.body.csrfToken)
            .send({ views: 75000 });
        expect(updated.status).toBe(200);
        expect(updated.body.submission.payout).toBe(2000);
        const repeated = await brand
            .patch(`/api/submissions/${submissionId}/views`)
            .set("X-CSRF-Token", brandCsrf.body.csrfToken)
            .send({ views: 75000 });
        expect(repeated.body.budgetDelta).toBe(0);
        const decreases = await brand
            .patch(`/api/submissions/${submissionId}/views`)
            .set("X-CSRF-Token", brandCsrf.body.csrfToken)
            .send({ views: 10000 });
        expect(decreases.body).toMatchObject({
            budgetDelta: -1500,
            campaign: { spentBudget: 500 },
        });
        const concurrent = await Promise.all(
            [120000, 40000, 90000, 100000].map((views) =>
                brand
                    .patch(`/api/submissions/${submissionId}/views`)
                    .set("X-CSRF-Token", brandCsrf.body.csrfToken)
                    .send({ views }),
            ),
        );
        expect(
            concurrent.every((r) => r.status === 200 || r.status === 409),
        ).toBe(true);
        const stats = await brand.get(`/api/campaigns/${id}/stats`);
        expect(stats.body.submissions).toHaveLength(1);
        const sum = stats.body.submissions.reduce(
            (n: number, s: { payout: number }) => n + s.payout,
            0,
        );
        expect(stats.body.campaign.spentBudget).toBe(sum);
        expect(stats.body.campaign.spentBudget).toBeGreaterThanOrEqual(0);
        expect(stats.body.campaign.spentBudget).toBeLessThanOrEqual(2500);
    }, 120_000);
});
