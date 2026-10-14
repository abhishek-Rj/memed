"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { User } from "../lib/types";

type SessionValue = {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
    signOut: () => Promise<void>;
};
const SessionContext = createContext<SessionValue | null>(null);
export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let alive = true;
        api<{ user: User }>("/api/auth/me")
            .then((result) => {
                if (alive) setUser(result.user);
            })
            .catch(() => {
                if (alive) setUser(null);
            })
            .finally(() => {
                if (alive) setLoading(false);
            });
        return () => {
            alive = false;
        };
    }, []);
    const value = useMemo<SessionValue>(
        () => ({
            user,
            loading,
            setUser,
            async signOut() {
                try {
                    await api("/api/auth/logout", { method: "POST" });
                } finally {
                    setUser(null);
                }
            },
        }),
        [user, loading],
    );
    return (
        <SessionContext.Provider value={value}>
            {children}
        </SessionContext.Provider>
    );
}
export function useSession() {
    const context = useContext(SessionContext);
    if (!context)
        throw new Error("useSession must be used within SessionProvider");
    return context;
}
