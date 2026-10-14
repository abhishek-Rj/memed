export type Role = "brand" | "creator";
export type User = { id: string; name: string; email: string; role: Role };
export type Milestone = { views: number; payout: number };
export type Campaign = {
    id: string;
    name: string;
    platform: "instagram" | "youtube";
    totalBudget: number;
    spentBudget: number;
    remainingBudget: number;
    milestones: Milestone[];
    status: "live" | "paused";
    createdAt: string;
};
export type Submission = {
    id: string;
    campaign:
        | Campaign
        | { id?: string; _id?: string; name: string; platform: string; status?: string }
        | string;
    campaignId?: string;
    creator?: User | string;
    postUrl: string;
    views: number;
    payout: number;
    createdAt: string;
};
