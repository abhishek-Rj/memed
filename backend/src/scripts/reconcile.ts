import mongoose from "mongoose";
import "../models/Campaign.js";
import "../models/Submission.js";
import { connectDatabase } from "../config/db.js";

await connectDatabase();
const Campaign = mongoose.model("Campaign");
const Submission = mongoose.model("Submission");
const totals = await Submission.aggregate([
    { $group: { _id: "$campaignId", allocated: { $sum: "$payout" } } },
]);
const byCampaign = new Map(
    totals.map((row) => [String(row._id), row.allocated as number]),
);
const campaigns = await Campaign.find(
    {},
    "name totalBudget spentBudget",
).lean();
let drift = 0;
for (const campaign of campaigns) {
    const allocated = byCampaign.get(String(campaign._id)) ?? 0;
    const difference = allocated - campaign.spentBudget;
    if (difference !== 0 || allocated < 0 || allocated > campaign.totalBudget) {
        drift++;
        console.error(
            `${campaign._id} ${campaign.name}: spentBudget=${campaign.spentBudget}, submissionSum=${allocated}, delta=${difference}`,
        );
    }
}
console.log(
    `Reconciled ${campaigns.length} campaigns; ${drift} mismatch(es). No records were changed.`,
);
await mongoose.disconnect();
if (drift) process.exitCode = 1;
