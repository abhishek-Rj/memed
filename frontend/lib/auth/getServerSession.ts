import { cookies } from "next/headers";
import { apiOrigin } from "../api";
import type { User } from "../types";

export async function getServerSession(): Promise<User | null> {
    const jar = await cookies();
    const access = jar.get("memed_access")?.value;
    if (!access) return null;
    try {
        const response = await fetch(`${apiOrigin()}/api/auth/me`, {
            headers: { Cookie: `memed_access=${access}` },
            cache: "no-store",
        });
        if (!response.ok) return null;
        return (await response.json()).user as User;
    } catch {
        return null;
    }
}
