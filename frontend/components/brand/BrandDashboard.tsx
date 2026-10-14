"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import type { Campaign, Milestone, User } from "../../lib/types";

type Stats = {
    campaign: Campaign;
    submissionCount: number;
    submissions: Array<{
        id: string;
        creator: User;
        postUrl: string;
        views: number;
        payout: number;
    }>;
};
const money = (n: number) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n);
const number = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function BrandDashboard() {
    const { user, loading: sessionLoading } = useSession();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [stats, setStats] = useState<Stats | null>(null);
    const statsCampaignId = useRef<string | null>(null);
    useEffect(() => {
        if (user?.role !== "brand") return;
        let alive = true;
        let firstLoad = true;
        const refresh = () => {
            api<{ campaigns: Campaign[] }>("/api/campaigns/mine")
                .then((r) => {
                    if (alive) setCampaigns(r.campaigns);
                })
                .catch((e) => {
                    if (alive && firstLoad)
                        setError(
                            e instanceof Error
                                ? e.message
                                : "Could not load campaigns",
                        );
                })
                .finally(() => {
                    if (alive && firstLoad) {
                        setLoading(false);
                        firstLoad = false;
                    }
                });
            const campaignId = statsCampaignId.current;
            if (campaignId)
                api<Stats>(`/api/campaigns/${campaignId}/stats`)
                    .then((r) => {
                        if (alive && statsCampaignId.current === campaignId)
                            setStats(r);
                    })
                    .catch(() => {});
        };
        const refreshWhenVisible = () => {
            if (document.visibilityState === "visible") refresh();
        };
        refresh();
        const interval = window.setInterval(refresh, 5_000);
        document.addEventListener("visibilitychange", refreshWhenVisible);
        window.addEventListener("focus", refresh);
        return () => {
            alive = false;
            window.clearInterval(interval);
            document.removeEventListener(
                "visibilitychange",
                refreshWhenVisible,
            );
            window.removeEventListener("focus", refresh);
        };
    }, [user]);
    async function toggle(c: Campaign) {
        setError("");
        setNotice("");
        try {
            const r = await api<{ campaign: Campaign }>(
                `/api/campaigns/${c.id}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: c.status === "live" ? "paused" : "live",
                    }),
                },
            );
            setCampaigns((items) =>
                items.map((item) => (item.id === c.id ? r.campaign : item)),
            );
            setNotice(`${r.campaign.name} is now ${r.campaign.status}.`);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Unable to update campaign",
            );
        }
    }
    async function openStats(c: Campaign) {
        setError("");
        try {
            const result = await api<Stats>(`/api/campaigns/${c.id}/stats`);
            statsCampaignId.current = c.id;
            setStats(result);
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to load campaign stats",
            );
        }
    }
    if (sessionLoading || (user?.role === "brand" && loading))
        return (
            <div className="shell dashboard">
                <div className="empty">Loading your workspace…</div>
            </div>
        );
    if (!user)
        return (
            <div className="shell dashboard">
                <div className="empty">
                    Sign in to view your brand workspace.{" "}
                    <Link className="table-link" href="/login">
                        Log in →
                    </Link>
                </div>
            </div>
        );
    if (user.role !== "brand")
        return (
            <div className="shell dashboard">
                <div className="empty">
                    This is a brand workspace.{" "}
                    <Link className="table-link" href="/creator">
                        Go to creator dashboard →
                    </Link>
                </div>
            </div>
        );
    const spent = campaigns.reduce((sum, c) => sum + c.spentBudget, 0);
    const budget = campaigns.reduce((sum, c) => sum + c.totalBudget, 0);
    const submissions = stats?.submissions ?? [];
    return (
        <main className="shell dashboard">
            <div className="dash-head">
                <div>
                    <div className="eyebrow">Brand workspace</div>
                    <h1>Campaign control.</h1>
                    <p>
                        Welcome, {user.name}. Everything your creator work has
                        earned, in one view.
                    </p>
                </div>
                <span className="badge">{campaigns.length} campaigns</span>
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
                    <span>Total allocated</span>
                    <strong>{money(budget)}</strong>
                </div>
                <div className="stat">
                    <span>Current simulated payout</span>
                    <strong>{money(spent)}</strong>
                </div>
                <div className="stat">
                    <span>Available across campaigns</span>
                    <strong>{money(Math.max(0, budget - spent))}</strong>
                </div>
            </div>
            <div className="dash-grid">
                <section className="panel">
                    <div className="panel-head">
                        <h2>Your campaigns</h2>
                        <span className="muted" style={{ fontSize: 11 }}>
                            Budgets refresh automatically every 5 seconds
                        </span>
                    </div>
                    {loading ? (
                        <div className="empty">Loading campaigns…</div>
                    ) : campaigns.length === 0 ? (
                        <div className="empty">
                            You haven’t created a campaign yet. Start with a
                            clear brief and a few view milestones.
                        </div>
                    ) : (
                        <div className="campaign-list">
                            {campaigns.map((c) => {
                                const percent =
                                    c.totalBudget > 0
                                        ? Math.max(
                                              0,
                                              Math.min(
                                                  100,
                                                  (c.spentBudget /
                                                      c.totalBudget) *
                                                      100,
                                              ),
                                          )
                                        : 0;
                                return (
                                    <article
                                        className="campaign-card"
                                        key={c.id}
                                    >
                                        <div className="campaign-card-top">
                                            <div>
                                                <h3>{c.name}</h3>
                                                <p>
                                                    {c.platform} · Created{" "}
                                                    {new Date(
                                                        c.createdAt,
                                                    ).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <span
                                                className={`badge ${c.status === "paused" ? "paused" : ""}`}
                                            >
                                                {c.status}
                                            </span>
                                        </div>
                                        <div className="metrics">
                                            <div>
                                                <span>Budget</span>
                                                <strong>
                                                    {money(c.totalBudget)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>Spent</span>
                                                <strong>
                                                    {money(c.spentBudget)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span>Available</span>
                                                <strong>
                                                    {money(c.remainingBudget)}
                                                </strong>
                                            </div>
                                        </div>
                                        <div className="progress-copy">
                                            <span>Budget spent</span>
                                            <span>{Math.round(percent)}%</span>
                                        </div>
                                        <div
                                            className="progress"
                                            role="progressbar"
                                            aria-label={`${c.name} budget spent`}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(percent)}
                                        >
                                            <span
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <div className="milestones">
                                            {c.milestones.map((m) => (
                                                <span
                                                    key={`${m.views}-${m.payout}`}
                                                    className="milestone-pill"
                                                >
                                                    {number(m.views)} views →{" "}
                                                    {money(m.payout)}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="row-actions">
                                            <button
                                                className="small-btn"
                                                onClick={() =>
                                                    void openStats(c)
                                                }
                                            >
                                                View submissions
                                            </button>
                                            <button
                                                className="small-btn"
                                                onClick={() => void toggle(c)}
                                            >
                                                {c.status === "live"
                                                    ? "Pause campaign"
                                                    : "Resume campaign"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
                <CreateCampaign
                    onCreated={(campaign) => {
                        setCampaigns((items) => [campaign, ...items]);
                        setNotice("Campaign created and live.");
                    }}
                    onError={setError}
                />
            </div>
            {stats && (
                <section className="panel" style={{ marginTop: 16 }}>
                    <div className="panel-head">
                        <div>
                            <h2>{stats.campaign.name} · submissions</h2>
                            <span className="muted" style={{ fontSize: 11 }}>
                                {stats.submissionCount} posts · current
                                simulated payout{" "}
                                {money(stats.campaign.spentBudget)}
                            </span>
                        </div>
                        <button
                            className="small-btn"
                            onClick={() => {
                                statsCampaignId.current = null;
                                setStats(null);
                            }}
                        >
                            Close
                        </button>
                    </div>
                    {submissions.length === 0 ? (
                        <div className="empty">
                            No creator posts have been submitted to this
                            campaign yet.
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Creator</th>
                                        <th>Post</th>
                                        <th>Views</th>
                                        <th>Current payout</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map((s) => (
                                        <tr key={s.id}>
                                            <td>
                                                {typeof s.creator === "object"
                                                    ? s.creator.name
                                                    : "Creator"}
                                            </td>
                                            <td>
                                                <a
                                                    className="table-link"
                                                    href={s.postUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open post ↗
                                                </a>
                                            </td>
                                            <td>{number(s.views)}</td>
                                            <td>{money(s.payout)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}
            <p className="muted" style={{ fontSize: 10, marginTop: 18 }}>
                Payouts shown are accounting records only. No money has been
                transferred.
            </p>
        </main>
    );
}

function CreateCampaign({
    onCreated,
    onError,
}: {
    onCreated: (c: Campaign) => void;
    onError: (e: string) => void;
}) {
    const [milestones, setMilestones] = useState<Milestone[]>([
        { views: 10_000, payout: 500 },
    ]);
    const [pending, setPending] = useState(false);
    const [localError, setLocalError] = useState("");
    function update(index: number, field: keyof Milestone, value: string) {
        setMilestones((items) =>
            items.map((item, i) =>
                i === index ? { ...item, [field]: Number(value) } : item,
            ),
        );
    }
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onError("");
        setLocalError("");
        setPending(true);
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
            const result = await api<{ campaign: Campaign }>("/api/campaigns", {
                method: "POST",
                body: JSON.stringify({
                    name: form.get("name"),
                    platform: form.get("platform"),
                    totalBudget: Number(form.get("budget")),
                    milestones,
                }),
            });
            onCreated(result.campaign);
            formElement.reset();
            setMilestones([{ views: 10_000, payout: 500 }]);
        } catch (e) {
            const message =
                e instanceof Error ? e.message : "Unable to create campaign";
            setLocalError(message);
            onError(message);
        } finally {
            setPending(false);
        }
    }
    return (
        <aside className="panel">
            <div className="panel-head">
                <h2>New campaign</h2>
                <span className="badge">Starts live</span>
            </div>
            <form className="form-stack" onSubmit={submit}>
                <label className="field">
                    Campaign name
                    <input
                        className="input"
                        name="name"
                        required
                        minLength={3}
                        maxLength={100}
                        placeholder="e.g. Summer creator drop"
                    />
                </label>
                <label className="field">
                    Platform
                    <select className="input" name="platform">
                        <option value="instagram">Instagram</option>
                        <option value="youtube">YouTube</option>
                    </select>
                </label>
                <label className="field">
                    Total budget (₹)
                    <input
                        className="input"
                        name="budget"
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="20000"
                    />
                </label>
                <div className="field">
                    View milestones
                    {milestones.map((m, index) => (
                        <div
                            key={index}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr auto",
                                gap: 6,
                                marginTop: 5,
                            }}
                        >
                            <label className="field">
                                <span className="muted">Views</span>
                                <input
                                    className="input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    value={m.views}
                                    onChange={(e) =>
                                        update(index, "views", e.target.value)
                                    }
                                />
                            </label>
                            <label className="field">
                                <span className="muted">Payout ₹</span>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    step="1"
                                    required
                                    value={m.payout}
                                    onChange={(e) =>
                                        update(index, "payout", e.target.value)
                                    }
                                />
                            </label>
                            <button
                                className="small-btn"
                                type="button"
                                aria-label="Remove milestone"
                                disabled={milestones.length === 1}
                                onClick={() =>
                                    setMilestones((items) =>
                                        items.filter((_, i) => i !== index),
                                    )
                                }
                            >
                                ×
                            </button>
                        </div>
                    ))}
                    <button
                        className="small-btn"
                        type="button"
                        style={{ marginTop: 9 }}
                        disabled={milestones.length >= 20}
                        onClick={() =>
                            setMilestones((items) => [
                                ...items,
                                {
                                    views: (items.at(-1)?.views ?? 0) + 10_000,
                                    payout: items.at(-1)?.payout ?? 0,
                                },
                            ])
                        }
                    >
                        + Add milestone
                    </button>
                </div>
                {localError && <div className="form-error">{localError}</div>}
                <p
                    className="muted"
                    style={{ fontSize: 10, lineHeight: 1.5, margin: 0 }}
                >
                    Enter milestones in increasing view order. Each payout is an
                    absolute amount.
                </p>
                <button
                    className="btn btn-lime"
                    type="submit"
                    disabled={pending}
                >
                    {pending ? "Creating…" : "Create campaign"}{" "}
                    <span aria-hidden="true">↗</span>
                </button>
            </form>
        </aside>
    );
}
