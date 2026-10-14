"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "../../context/SessionContext";

export function SiteNav() {
    const { user, loading, signOut } = useSession();
    const router = useRouter();
    const dashboard = user?.role === "brand" ? "/brand" : "/creator";
    return (
        <header className="shell nav">
            <Link href="/" className="brandmark" aria-label="Meme’d home">
                <span className="brandmark-dot">m</span>Meme’d
            </Link>
            <nav className="nav-links" aria-label="Main navigation">
                <Link href="/#how-it-works">How it works</Link>
                <Link href="/#for-teams">For brands &amp; creators</Link>
            </nav>
            <div className="nav-actions">
                {loading ? (
                    <span className="link-muted">…</span>
                ) : user ? (
                    <>
                        <Link className="link-muted" href={dashboard}>
                            Dashboard
                        </Link>
                        <button
                            className="btn btn-light"
                            onClick={async () => {
                                await signOut();
                                router.push("/");
                            }}
                        >
                            Log out
                        </button>
                    </>
                ) : (
                    <>
                        <Link className="link-muted" href="/login">
                            Log in
                        </Link>
                        <Link className="btn" href="/signup">
                            Get started <span aria-hidden="true">↗</span>
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
