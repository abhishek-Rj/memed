"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import type { Campaign, Submission } from "../../lib/types";

const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
const number = (n: number) => new Intl.NumberFormat("en-IN").format(n);
type CampaignPage = {
    campaigns: Campaign[];
    page: number;
    pages: number;
    total: number;
};
type Mine = { submissions: Submission[]; totalEarnings: number };

export function CreatorDashboard() {
    const { user, loading: sessionLoading } = useSession();
    const [campaignPage, setCampaignPage] = useState<CampaignPage | null>(null);
    const [mine, setMine] = useState<Mine | null>(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busy, setBusy] = useState("");
    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [c, s] = await Promise.all([
                api<CampaignPage>(`/api/campaigns?page=${page}&limit=6`),
                api<Mine>("/api/submissions/mine"),
            ]);
            setCampaignPage(c);
            setMine(s);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to load creator workspace",
            );
        } finally {
            setLoading(false);
        }
    }, [page]);
    useEffect(() => {
        if (user?.role !== "creator") return;
        let alive = true;
        Promise.all([
            api<CampaignPage>(`/api/campaigns?page=${page}&limit=6`),
            api<Mine>("/api/submissions/mine"),
        ])
            .then(([c, s]) => {
                if (alive) {
                    setCampaignPage(c);
                    setMine(s);
                }
            })
            .catch((e) => {
                if (alive)
                    setError(
                        e instanceof Error
                            ? e.message
                            : "Unable to load creator workspace",
                    );
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, [page, user]);
    async function submitPost(
        event: FormEvent<HTMLFormElement>,
        campaign: Campaign,
    ) {
        event.preventDefault();
        setBusy(campaign.id);
        setError("");
        setNotice("");
        const form = event.currentTarget;
        const data = new FormData(form);
        try {
            await api(`/api/campaigns/${campaign.id}/submissions`, {
                method: "POST",
                body: JSON.stringify({ postUrl: data.get("postUrl") }),
            });
            form.reset();
            setNotice(`Your post was added to ${campaign.name}.`);
            await load();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to submit this post",
            );
        } finally {
            setBusy("");
        }
    }
    async function updateViews(
        event: FormEvent<HTMLFormElement>,
        submission: Submission,
    ) {
        event.preventDefault();
        const form = event.currentTarget;
        const views = Number(new FormData(form).get("views"));
        setBusy(submission.id);
        setError("");
        setNotice("");
        try {
            const result = await api<{ submission: { payout: number } }>(
                `/api/submissions/${submission.id}/views`,
                { method: "PATCH", body: JSON.stringify({ views }) },
            );
            setNotice(
                `Simulated views updated. Current payout: ${money(result.submission.payout)}.`,
            );
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to update views");
        } finally {
            setBusy("");
        }
    }
    if (sessionLoading || (user?.role === "creator" && loading))
        return (
            <div className="shell dashboard">
                <div className="empty">Loading your creator workspace…</div>
            </div>
        );
    if (!user)
        return (
            <div className="shell dashboard">
                <div className="empty">
                    Sign in to browse campaigns and track your posts.{" "}
                    <Link className="table-link" href="/login">
                        Log in →
                    </Link>
                </div>
            </div>
        );
    if (user.role !== "creator")
        return (
            <div className="shell dashboard">
                <div className="empty">
                    This is a creator workspace.{" "}
                    <Link className="table-link" href="/brand">
                        Go to brand dashboard →
                    </Link>
                </div>
            </div>
        );
    const campaigns = campaignPage?.campaigns ?? [];
    const submissions = mine?.submissions ?? [];
    const submittedCampaigns = new Set(
        submissions
            .map((submission) => {
                if (submission.campaignId) return submission.campaignId;
                if (typeof submission.campaign === "object")
                    return (
                        submission.campaign.id ??
                        ("_id" in submission.campaign
                            ? submission.campaign._id
                            : undefined)
                    );
                return undefined;
            })
            .filter((id): id is string => Boolean(id)),
    );
    return (
        <main className="shell dashboard">
            <div className="dash-head">
                <div>
                    <div className="eyebrow">Creator workspace</div>
                    <h1>Your work, in motion.</h1>
                    <p>
                        Browse open briefs, add your post, and keep an eye on
                        every view.
                    </p>
                </div>
                <span className="badge">
                    {campaignPage?.total ?? 0} live campaigns
                </span>
            </div>
            {error && (
                <div className="form-error" role="alert">
                    {error}
                </div>
            )}
            {notice && (
                <p className="success-note" role="status">
                    {notice}
                </p>
            )}
            <div className="stat-grid">
                <div className="stat">
                    <span>Current simulated earnings</span>
                    <strong>{money(mine?.totalEarnings ?? 0)}</strong>
                </div>
                <div className="stat">
                    <span>Your posts</span>
                    <strong>{submissions.length}</strong>
                </div>
                <div className="stat">
                    <span>Open campaigns</span>
                    <strong>{campaignPage?.total ?? 0}</strong>
                </div>
            </div>
            <div className="dash-grid">
                <section className="panel">
                    <div className="panel-head">
                        <h2>Find your next brief</h2>
                        <span className="muted" style={{ fontSize: 11 }}>
                            Live campaigns with available budget
                        </span>
                    </div>
                    {campaigns.length === 0 ? (
                        <div className="empty">
                            No campaigns are open right now. Check back soon for
                            a new brief.
                        </div>
                    ) : (
                        <div className="campaign-list">
                            {campaigns.map((c) => (
                                <article className="campaign-card" key={c.id}>
                                    <div className="campaign-card-top">
                                        <div>
                                            <h3>{c.name}</h3>
                                            <p>
                                                {c.platform} ·{" "}
                                                {money(c.remainingBudget)}{" "}
                                                remaining
                                            </p>
                                        </div>
                                        <span className="badge">Live</span>
                                    </div>
                                    <div className="milestones">
                                        {c.milestones.map((m) => (
                                            <span
                                                className="milestone-pill"
                                                key={`${m.views}-${m.payout}`}
                                            >
                                                {number(m.views)} views →{" "}
                                                {money(m.payout)}
                                            </span>
                                        ))}
                                    </div>
                                    {submittedCampaigns.has(c.id) ? (
                                        <p className="success-note" role="status">
                                            You’ve already submitted to this campaign. One post is allowed per creator.
                                        </p>
                                    ) : (
                                    <form
                                        className="row-actions"
                                        onSubmit={(e) => void submitPost(e, c)}
                                    >
                                        <label
                                            className="field"
                                            style={{ flex: 1, minWidth: 170 }}
                                        >
                                            Your post URL
                                            <input
                                                className="input"
                                                name="postUrl"
                                                type="url"
                                                required
                                                placeholder={
                                                    c.platform === "instagram"
                                                        ? "https://www.instagram.com/p/…"
                                                        : "https://youtu.be/…"
                                                }
                                            />
                                        </label>
                                        <button
                                            className="btn btn-lime"
                                            type="submit"
                                            disabled={busy === c.id}
                                        >
                                            {busy === c.id
                                                ? "Adding…"
                                                : "Submit post"}{" "}
                                            <span aria-hidden="true">↗</span>
                                        </button>
                                    </form>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                    {(campaignPage?.pages ?? 0) > 1 && (
                        <div
                            className="row-actions"
                            style={{ justifyContent: "space-between" }}
                        >
                            <button
                                className="small-btn"
                                disabled={page <= 1}
                                onClick={() => setPage((v) => v - 1)}
                            >
                                ← Previous
                            </button>
                            <span className="muted" style={{ fontSize: 10 }}>
                                Page {page} of {campaignPage?.pages}
                            </span>
                            <button
                                className="small-btn"
                                disabled={page >= (campaignPage?.pages ?? 1)}
                                onClick={() => setPage((v) => v + 1)}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </section>
                <aside className="panel">
                    <div className="panel-head">
                        <h2>Your posts</h2>
                        <span className="badge">{submissions.length}</span>
                    </div>
                    {submissions.length === 0 ? (
                        <div className="empty">
                            Your submitted posts will appear here with their
                            views and current payout.
                        </div>
                    ) : (
                        <div className="campaign-list">
                            {submissions.map((s) => {
                                const campaign =
                                    typeof s.campaign === "object"
                                        ? s.campaign
                                        : null;
                                return (
                                    <article
                                        className="campaign-card"
                                        key={s.id}
                                    >
                                        <div className="campaign-card-top">
                                            <div>
                                                <h3>
                                                    {campaign?.name ??
                                                        "Campaign"}
                                                </h3>
                                                <p>
                                                    {campaign?.platform ??
                                                        "Post"}{" "}
                                                    ·{" "}
                                                    {new Date(
                                                        s.createdAt,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <strong>{money(s.payout)}</strong>
                                        </div>
                                        <div className="metrics">
                                            <div>
                                                <span>Views</span>
                                                <strong>
                                                    {number(s.views)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>Current payout</span>
                                                <strong>
                                                    {money(s.payout)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>Type</span>
                                                <strong>Simulated</strong>
                                            </div>
                                        </div>
                                        <a
                                            className="table-link"
                                            href={s.postUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ fontSize: 10 }}
                                        >
                                            Open your post ↗
                                        </a>
                                        <form
                                            className="row-actions"
                                            onSubmit={(e) =>
                                                void updateViews(e, s)
                                            }
                                        >
                                            <label
                                                className="field"
                                                style={{ flex: 1 }}
                                            >
                                                Simulate view count
                                                <input
                                                    className="input"
                                                    name="views"
                                                    type="number"
                                                    min="0"
                                                    max="10000000000"
                                                    step="1"
                                                    required
                                                    defaultValue={s.views}
                                                />
                                            </label>
                                            <button
                                                className="small-btn"
                                                type="submit"
                                                disabled={busy === s.id}
                                            >
                                                {busy === s.id
                                                    ? "Updating…"
                                                    : "Update views"}
                                            </button>
                                        </form>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </aside>
            </div>
            <p className="muted" style={{ fontSize: 10, marginTop: 18 }}>
                Current simulated payout is a tracker value, not a payment or
                transfer. View controls are included for assignment simulation
                only.
            </p>
        </main>
    );
}
