import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ACCESS_COOKIE } from "../utils/tokens.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export type AuthUser = { id: string; role: "brand" | "creator" };
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export function authenticate(req: Request, _res: Response, next: NextFunction) {
    try {
        const token = req.cookies?.[ACCESS_COOKIE];
        if (!token) throw new AppError(401, "Sign in to continue");
        const claims = jwt.verify(
            token,
            env.ACCESS_TOKEN_SECRET,
        ) as jwt.JwtPayload;
        if (
            claims.type !== "access" ||
            typeof claims.sub !== "string" ||
            !["brand", "creator"].includes(String(claims.role))
        )
            throw new AppError(401, "Invalid access token");
        req.user = { id: claims.sub, role: claims.role as AuthUser["role"] };
        next();
    } catch (err) {
        next(
            err instanceof AppError
                ? err
                : new AppError(401, "Session expired or invalid"),
        );
    }
}
