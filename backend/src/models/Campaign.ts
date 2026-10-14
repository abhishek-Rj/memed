import mongoose, { Schema, type InferSchemaType } from "mongoose";

const milestoneSchema = new Schema(
    {
        views: { type: Number, required: true, min: 1 },
        payout: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);
const campaignSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 100,
        },
        platform: {
            type: String,
            enum: ["instagram", "youtube"],
            required: true,
            index: true,
        },
        totalBudget: { type: Number, required: true, min: 1 },
        spentBudget: { type: Number, required: true, min: 0, default: 0 },
        milestones: {
            type: [milestoneSchema],
            required: true,
            validate: [
                (items: Array<{ views: number; payout: number }>) =>
                    items.length > 0 &&
                    items.every(
                        (item, index) =>
                            index === 0 ||
                            (item.views > items[index - 1]!.views &&
                                item.payout >= items[index - 1]!.payout),
                    ),
                "Milestones need increasing views and nondecreasing payouts",
            ],
        },
        brandId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ["live", "paused"],
            default: "live",
            required: true,
            index: true,
        },
    },
    { timestamps: true },
);
campaignSchema.path("spentBudget").validate(function (value: number) {
    return value >= 0 && value <= this.totalBudget;
}, "Spent budget must be between zero and total budget");
campaignSchema.index({ status: 1, createdAt: -1 });
export type CampaignDocument = InferSchemaType<typeof campaignSchema> &
    mongoose.Document;
export const Campaign: mongoose.Model<any> =
    (mongoose.models.Campaign as mongoose.Model<any> | undefined) ??
    mongoose.model("Campaign", campaignSchema);
