"use client";
import { SessionProvider } from "../../context/SessionContext";
import { SiteNav } from "./SiteNav";
export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <SiteNav />
            {children}
        </SessionProvider>
    );
}
