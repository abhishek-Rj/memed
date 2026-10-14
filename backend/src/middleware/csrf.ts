import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { CSRF_COOKIE } from "../utils/tokens.js";

const safe = new Set(["GET", "HEAD", "OPTIONS"]);
export function csrf(req: Request, _res: Response, next: NextFunction) {
    if (safe.has(req.method) || req.path === "/api/auth/csrf") return next();
    const origin = req.get("origin");
    if (origin && origin !== env.FRONTEND_ORIGIN)
        return next(new AppError(403, "Unexpected request origin"));
    const cookie = req.cookies?.[CSRF_COOKIE];
    const header = req.get("x-csrf-token");
    if (!cookie || !header || cookie !== header)
        return next(new AppError(403, "CSRF token missing or invalid"));
    next();
}
