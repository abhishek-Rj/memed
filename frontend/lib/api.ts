const API_URL = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");
let csrfToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

async function getCsrf() {
    if (csrfToken) return csrfToken;
    const response = await fetch(`${API_URL}/api/auth/csrf`, {
        credentials: "include",
        cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok)
        throw new Error(body.error || "Unable to start a secure session");
    csrfToken = body.csrfToken;
    return csrfToken!;
}

async function refreshSession() {
    if (!refreshInFlight)
        refreshInFlight = (async () => {
            try {
                const csrf = await getCsrf();
                const response = await fetch(`${API_URL}/api/auth/refresh`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "X-CSRF-Token": csrf },
                });
                if (response.ok) return true;
                csrfToken = null;
                return false;
            } catch {
                return false;
            } finally {
                refreshInFlight = null;
            }
        })();
    return refreshInFlight;
}

export async function api<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
): Promise<T> {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers);
    if (options.body && !headers.has("Content-Type"))
        headers.set("Content-Type", "application/json");
    if (
        !["GET", "HEAD", "OPTIONS"].includes(method) &&
        path !== "/api/auth/csrf"
    )
        headers.set("X-CSRF-Token", await getCsrf());
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        method,
        headers,
        credentials: "include",
        cache: "no-store",
    });
    if (
        response.status === 401 &&
        retry &&
        !path.endsWith("/auth/refresh") &&
        !path.endsWith("/auth/login") &&
        !path.endsWith("/auth/signup")
    ) {
        if (await refreshSession()) return api<T>(path, options, false);
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(
            body.error || "Something went wrong. Please try again.",
        );
    return body as T;
}

export function apiOrigin() {
    return API_URL;
}
