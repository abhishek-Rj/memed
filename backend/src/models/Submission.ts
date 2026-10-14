import mongoose, { Schema, type InferSchemaType } from "mongoose";

const submissionSchema = new Schema(
    {
        campaignId: {
            type: Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
            index: true,
        },
        creatorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        postUrl: { type: String, required: true, maxlength: 2048 },
        views: { type: Number, required: true, min: 0, default: 0 },
        payout: { type: Number, required: true, min: 0, default: 0 },
    },
    { timestamps: true },
);
submissionSchema.index({ creatorId: 1, createdAt: -1 });
submissionSchema.index({ campaignId: 1, createdAt: -1 });
export type SubmissionDocument = InferSchemaType<typeof submissionSchema> &
    mongoose.Document;
export const Submission: mongoose.Model<any> =
    (mongoose.models.Submission as mongoose.Model<any> | undefined) ??
    mongoose.model("Submission", submissionSchema);
