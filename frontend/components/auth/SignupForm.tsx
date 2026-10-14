"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useSession } from "../../context/SessionContext";
import type { User } from "../../lib/types";

export function SignupForm() {
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
            const result = await api<{ user: User }>("/api/auth/signup", {
                method: "POST",
                body: JSON.stringify({
                    name: data.get("name"),
                    email: data.get("email"),
                    password: data.get("password"),
                    role: data.get("role"),
                }),
            });
            setUser(result.user);
            router.push(result.user.role === "brand" ? "/brand" : "/creator");
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : "Unable to create your account",
            );
        } finally {
            setPending(false);
        }
    }
    return (
        <form className="form-stack" onSubmit={submit}>
            <label className="field">
                Your name
                <input
                    className="input"
                    name="name"
                    minLength={2}
                    maxLength={80}
                    required
                    autoComplete="name"
                    placeholder="Your name"
                />
            </label>
            <label className="field">
                Email
                <input
                    className="input"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                />
            </label>
            <label className="field">
                Password
                <input
                    className="input"
                    name="password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                    placeholder="At least 10 characters"
                />
            </label>
            <label className="field">
                I’m here as
                <select className="input" name="role" defaultValue="creator">
                    <option value="creator">
                        Creator — share my work and track earnings
                    </option>
                    <option value="brand">
                        Brand — run a creator campaign
                    </option>
                </select>
            </label>
            {error && (
                <div className="form-error" role="alert">
                    {error}
                </div>
            )}
            <button className="btn" type="submit" disabled={pending}>
                {pending ? "Creating account…" : "Create account"}{" "}
                <span aria-hidden="true">↗</span>
            </button>
            <div className="auth-switch">
                Already have an account? <Link href="/login">Log in</Link>
            </div>
        </form>
    );
}
