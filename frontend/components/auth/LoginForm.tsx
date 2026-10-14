"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import type { User } from "../../lib/types";

export function LoginForm() {
    const router = useRouter();
    const { setUser } = useSession();
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setPending(true);
        const data = new FormData(event.currentTarget);
        try {
            const result = await api<{ user: User }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email: data.get("email"),
                    password: data.get("password"),
                }),
            });
            setUser(result.user);
            router.push(result.user.role === "brand" ? "/brand" : "/creator");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Unable to log in");
        } finally {
            setPending(false);
        }
    }
    return (
        <form className="form-stack" onSubmit={submit}>
            <label className="field">
                Email
                <input
                    className="input"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@company.com"
                />
            </label>
            <label className="field">
                Password
                <input
                    className="input"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                />
            </label>
            {error && (
                <div className="form-error" role="alert">
                    {error}
                </div>
            )}
            <button className="btn" type="submit" disabled={pending}>
                {pending ? "Signing in…" : "Log in"}{" "}
                <span aria-hidden="true">↗</span>
            </button>
            <div className="auth-switch">
                New to Meme’d? <Link href="/signup">Create an account</Link>
            </div>
        </form>
    );
}
