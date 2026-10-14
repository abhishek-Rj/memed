import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { Campaign } from "../models/Campaign.js";
import { Submission } from "../models/Submission.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { AppError } from "../utils/errors.js";

export const campaignRouter = Router();
const milestonesSchema = z
    .array(
        z.object({
            views: z.number().int().positive(),
            payout: z.number().int().nonnegative(),
        }),
    )
    .min(1)
    .max(20)
    .superRefine((items, ctx) => {
        for (let i = 1; i < items.length; i++)
            if (
                items[i]!.views <= items[i - 1]!.views ||
                items[i]!.payout < items[i - 1]!.payout
            )
                ctx.addIssue({
                    code: "custom",
                    message:
                        "Milestones need increasing views and nondecreasing payouts",
                });
    });
const createSchema = z.object({
    name: z.string().trim().min(3).max(100),
    platform: z.enum(["instagram", "youtube"]),
    totalBudget: z.number().int().positive().max(2_000_000_000),
    milestones: milestonesSchema,
});
const id = (v: string) => mongoose.isValidObjectId(v);
const view = (c: any) => ({
    id: String(c._id),
    name: c.name,
    platform: c.platform,
    totalBudget: c.totalBudget,
    spentBudget: c.spentBudget,
    remainingBudget: c.totalBudget - c.spentBudget,
    milestones: c.milestones,
    status: c.status,
    createdAt: c.createdAt,
});

campaignRouter.post("/", authenticate, authorize("brand"), async (req, res) => {
    const input = createSchema.parse(req.body);
    const campaign = await Campaign.create({
        ...input,
        brandId: req.user!.id,
        status: "live",
        spentBudget: 0,
    });
    res.status(201).json({ campaign: view(campaign) });
});
campaignRouter.get("/", async (req, res) => {
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const limit = Math.max(1, Math.min(50, Number(req.query.limit) || 12));
    const filter: Record<string, unknown> = {
        status: "live",
        $expr: { $lt: ["$spentBudget", "$totalBudget"] },
    };
    if (req.query.platform === "instagram" || req.query.platform === "youtube")
        filter.platform = req.query.platform;
    const [campaigns, total] = await Promise.all([
        Campaign.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Campaign.countDocuments(filter),
    ]);
    res.json({
        campaigns: campaigns.map(view),
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
    });
});
campaignRouter.get(
    "/mine",
    authenticate,
    authorize("brand"),
    async (req, res) => {
        const campaigns = await Campaign.find({ brandId: req.user!.id })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ campaigns: campaigns.map(view) });
    },
);
campaignRouter.get(
    "/:id/stats",
    authenticate,
    authorize("brand"),
    async (req, res) => {
        const campaignId = String(req.params.id ?? "");
        if (!id(campaignId)) throw new AppError(400, "Invalid campaign id");
        const campaign = await Campaign.findOne({
            _id: campaignId,
            brandId: req.user!.id,
        });
        if (!campaign) throw new AppError(404, "Campaign not found");
        const submissions = await Submission.find({ campaignId: campaign._id })
            .populate("creatorId", "name email")
            .sort({ createdAt: -1 });
        res.json({
            campaign: view(campaign),
            submissionCount: submissions.length,
            submissions: submissions.map((s) => ({
                id: String(s._id),
                creator: s.creatorId,
                postUrl: s.postUrl,
                views: s.views,
                payout: s.payout,
                createdAt: s.createdAt,
            })),
        });
    },
);
campaignRouter.get("/:id", async (req, res) => {
    const campaignId = String(req.params.id ?? "");
    if (!id(campaignId)) throw new AppError(400, "Invalid campaign id");
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new AppError(404, "Campaign not found");
    if (
        campaign.status !== "live" ||
        campaign.spentBudget >= campaign.totalBudget
    ) {
        const owner =
            req.user?.role === "brand" &&
            String(campaign.brandId) === req.user.id;
        if (!owner) throw new AppError(404, "Campaign not found");
    }
    res.json({ campaign: view(campaign) });
});
campaignRouter.patch(
    "/:id/status",
    authenticate,
    authorize("brand"),
    async (req, res) => {
        const campaignId = String(req.params.id ?? "");
        if (!id(campaignId)) throw new AppError(400, "Invalid campaign id");
        const { status } = z
            .object({ status: z.enum(["live", "paused"]) })
            .parse(req.body);
        const campaign = await Campaign.findOneAndUpdate(
            { _id: campaignId, brandId: req.user!.id },
            { status },
            { new: true, runValidators: true },
        );
        if (!campaign) throw new AppError(404, "Campaign not found");
        res.json({ campaign: view(campaign) });
    },
);
