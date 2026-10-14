import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Campaign } from "../models/Campaign.js";
import { Submission } from "../models/Submission.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { calculatePayout } from "../services/payout.service.js";
import { AppError } from "../utils/errors.js";

export const submissionRouter = Router();
const objectId = (v: string) => mongoose.isValidObjectId(v);
const viewSchema = z.object({
    views: z.number().int().min(0).max(10_000_000_000),
});
function validPostUrl(value: string, platform: string) {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.toLowerCase();
        if (parsed.protocol !== "https:") return false;
        return platform === "instagram"
            ? ["instagram.com", "www.instagram.com"].includes(host)
            : [
                  "youtube.com",
                  "www.youtube.com",
                  "youtu.be",
                  "m.youtube.com",
              ].includes(host);
    } catch {
        return false;
    }
}

submissionRouter.post(
    "/campaigns/:id/submissions",
    authenticate,
    authorize("creator"),
    async (req, res) => {
        const campaignId = String(req.params.id ?? "");
        if (!objectId(campaignId))
            throw new AppError(400, "Invalid campaign id");
        const { postUrl } = z
            .object({ postUrl: z.string().url().max(2048) })
            .parse(req.body);
        const session = await mongoose.startSession();
        let created: any;
        try {
            await session.withTransaction(async () => {
                const campaign =
                    await Campaign.findById(campaignId).session(session);
                if (
                    !campaign ||
                    campaign.status !== "live" ||
                    campaign.spentBudget >= campaign.totalBudget
                )
                    throw new AppError(
                        409,
                        "This campaign is not accepting submissions",
                    );
                const priorSubmission = await Submission.exists({
                    campaignId: campaign._id,
                    creatorId: req.user!.id,
                }).session(session);
                if (priorSubmission)
                    throw new AppError(
                        409,
                        "You have already submitted to this campaign",
                    );
                if (!validPostUrl(postUrl, campaign.platform))
                    throw new AppError(
                        400,
                        `Enter a valid ${campaign.platform} post URL`,
                    );
                const lock = await Campaign.updateOne(
                    {
                        _id: campaign._id,
                        __v: campaign.__v,
                        status: "live",
                        $expr: { $lt: ["$spentBudget", "$totalBudget"] },
                    },
                    { $inc: { __v: 1 } },
                    { session },
                );
                if (lock.modifiedCount !== 1)
                    throw new AppError(
                        409,
                        "Campaign changed concurrently; retry the submission",
                    );
                const [submission] = await Submission.create(
                    [
                        {
                            campaignId: campaign._id,
                            creatorId: req.user!.id,
                            postUrl,
                            views: 0,
                            payout: 0,
                        },
                    ],
                    { session },
                );
                created = submission;
            });
        } finally {
            await session.endSession();
        }
        res.status(201).json({
            submission: {
                id: String(created._id),
                campaignId,
                postUrl,
                views: 0,
                payout: 0,
                createdAt: created.createdAt,
            },
        });
    },
);

submissionRouter.get(
    "/submissions/mine",
    authenticate,
    authorize("creator"),
    async (req, res) => {
        const submissions = await Submission.find({ creatorId: req.user!.id })
            .populate("campaignId", "name platform status")
            .sort({ createdAt: -1 });
        res.json({
            submissions: submissions.map((s) => ({
                id: String(s._id),
                campaign: s.campaignId,
                postUrl: s.postUrl,
                views: s.views,
                payout: s.payout,
                createdAt: s.createdAt,
            })),
            totalEarnings: submissions.reduce((sum, s) => sum + s.payout, 0),
        });
    },
);

// This endpoint is intentionally public for the assignment's simulated view feed.
// A production platform must authenticate its ingestion service.
submissionRouter.patch("/submissions/:id/views", async (req, res) => {
    const submissionId = String(req.params.id ?? "");
    if (!objectId(submissionId))
        throw new AppError(400, "Invalid submission id");
    const { views } = viewSchema.parse(req.body);
    const session = await mongoose.startSession();
    let result: Record<string, unknown> | undefined;
    try {
        await session.withTransaction(async () => {
            const submission =
                await Submission.findById(submissionId).session(session);
            if (!submission) throw new AppError(404, "Submission not found");
            const campaign = await Campaign.findById(
                submission.campaignId,
            ).session(session);
            if (!campaign) throw new AppError(404, "Campaign not found");
            const remaining = campaign.totalBudget - campaign.spentBudget;
            const decision = calculatePayout({
                milestones: campaign.milestones,
                updatedViews: views,
                currentPayout: submission.payout,
                availableBudget: remaining,
            });
            const nextSpent = campaign.spentBudget + decision.budgetDelta;
            if (nextSpent < 0 || nextSpent > campaign.totalBudget)
                throw new AppError(
                    409,
                    "Campaign budget invariant would be violated",
                );
            const campaignWrite = await Campaign.updateOne(
                {
                    _id: campaign._id,
                    __v: campaign.__v,
                    spentBudget: campaign.spentBudget,
                },
                { $inc: { spentBudget: decision.budgetDelta, __v: 1 } },
                { session },
            );
            if (campaignWrite.modifiedCount !== 1)
                throw new AppError(
                    409,
                    "Campaign changed concurrently; retry the update",
                );
            submission.views = views;
            submission.payout = decision.payout;
            await submission.save({ session });
            result = {
                submission: {
                    id: String(submission._id),
                    campaignId: String(campaign._id),
                    views,
                    payout: decision.payout,
                },
                campaign: {
                    spentBudget: nextSpent,
                    remainingBudget: campaign.totalBudget - nextSpent,
                },
                budgetDelta: decision.budgetDelta,
            };
        });
    } finally {
        await session.endSession();
    }
    if (!result) throw new AppError(500, "View update did not complete");
    res.json(result);
});
