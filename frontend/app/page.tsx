import Link from "next/link";

export default function Home() {
    return (
        <main className="shell">
            <section className="hero">
                <div>
                    <div className="eyebrow">
                        Creators × culture × distribution
                    </div>
                    <h1>
                        Good ideas
                        <br />
                        travel <em>further.</em>
                    </h1>
                    <p className="hero-copy">
                        The campaign workspace for brands and creators who make
                        the internet worth watching. Set a brief, share a post,
                        and keep every view and payout in one place.
                    </p>
                    <div className="hero-ctas">
                        <Link className="btn" href="/signup">
                            Start a campaign <span aria-hidden="true">↗</span>
                        </Link>
                        <Link className="btn btn-light" href="/signup">
                            I’m a creator
                        </Link>
                    </div>
                    <div className="hero-note">
                        Payouts are tracked here. Transfers happen outside
                        Meme’d.
                    </div>
                </div>
                <div
                    className="visual-card"
                    aria-label="Campaign milestone tracker illustration"
                >
                    <div className="visual-top">
                        <div className="visual-label">
                            The attention economy, made clear
                        </div>
                        <div className="visual-title">
                            Make the work.
                            <br />
                            Watch it move.
                        </div>
                    </div>
                    <div className="visual-bottom">
                        <div className="visual-track">
                            <span>Campaign progress</span>
                            <span>Milestones, met</span>
                        </div>
                        <div className="track-line">
                            <span />
                        </div>
                        <div
                            className="visual-track"
                            style={{ margin: "13px 0 0", opacity: 0.75 }}
                        >
                            <span>Views turn into a current payout</span>
                            <span>↗</span>
                        </div>
                    </div>
                </div>
            </section>
            <div className="proof-row">
                <span>Built for the people who move culture</span>
                <strong>Brands</strong>
                <strong>Creators</strong>
                <strong>Short-form video</strong>
                <strong>Clear payouts</strong>
            </div>
            <section id="how-it-works" className="section">
                <div className="section-heading">
                    <div>
                        <div className="eyebrow">One shared scoreboard</div>
                        <h2>
                            From brief to
                            <br />
                            breakthrough.
                        </h2>
                    </div>
                    <p>
                        Campaigns should be easy to join and simple to track.
                        Meme’d keeps the collaboration and the numbers moving
                        together.
                    </p>
                </div>
                <div className="steps">
                    <article className="step-card">
                        <span className="step-no">01 / BRANDS</span>
                        <h3>Set the idea in motion</h3>
                        <p>
                            Build a campaign with a platform, a budget, and
                            clear view milestones.
                        </p>
                    </article>
                    <article className="step-card">
                        <span className="step-no">02 / CREATORS</span>
                        <h3>Make something worth sharing</h3>
                        <p>
                            Browse live briefs, post your work, and connect each
                            link to its campaign.
                        </p>
                    </article>
                    <article className="step-card">
                        <span className="step-no">03 / TOGETHER</span>
                        <h3>See what the work earns</h3>
                        <p>
                            Follow views and current simulated payout as
                            milestones are reached.
                        </p>
                    </article>
                </div>
            </section>
            <section id="for-teams" className="cta-band">
                <h2>
                    Make every view
                    <br />
                    part of the story.
                </h2>
                <Link className="btn" href="/signup">
                    Get started <span aria-hidden="true">↗</span>
                </Link>
            </section>
            <footer className="footer">
                <span className="brandmark">
                    <span className="brandmark-dot">m</span>Meme’d
                </span>
                <span>
                    Campaign payouts, clearly tracked. No money moves here.
                </span>
            </footer>
        </main>
    );
}
