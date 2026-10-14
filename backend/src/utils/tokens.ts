import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export const ACCESS_COOKIE = "memed_access";
export const REFRESH_COOKIE = "memed_refresh";
export const CSRF_COOKIE = "memed_csrf";
export function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}
export function newCsrfToken() {
    return randomBytes(24).toString("hex");
}
export function signAccess(user: { id: string; role: string }) {
    return jwt.sign(
        { sub: user.id, role: user.role, type: "access" },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: "7d" },
    );
}
export function signRefresh(userId: string) {
    return jwt.sign(
        { sub: userId, type: "refresh", jti: randomBytes(16).toString("hex") },
        env.REFRESH_TOKEN_SECRET,
        { expiresIn: "30d" },
    );
}
export function cookieOptions(path: string, httpOnly = true) {
    return {
        httpOnly,
        secure: env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path,
        maxAge:
            path === "/api/auth"
                ? 30 * 24 * 60 * 60 * 1000
                : 7 * 24 * 60 * 60 * 1000,
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    };
}
