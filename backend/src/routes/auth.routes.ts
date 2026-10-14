import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { User } from "../models/User.js";
import { authenticate } from "../middleware/authenticate.js";
import { AppError } from "../utils/errors.js";
import {
    ACCESS_COOKIE,
    CSRF_COOKIE,
    REFRESH_COOKIE,
    cookieOptions,
    hashToken,
    newCsrfToken,
    signAccess,
    signRefresh,
} from "../utils/tokens.js";
import { env } from "../config/env.js";

export const authRouter = Router();
const signupSchema = z.object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(254),
    password: z.string().min(10).max(128),
    role: z.enum(["brand", "creator"]),
});
const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128),
});
function setSession(
    res: import("express").Response,
    user: { id: string; role: string },
    refresh: string,
) {
    res.cookie(ACCESS_COOKIE, signAccess(user), cookieOptions("/"));
    res.cookie(REFRESH_COOKIE, refresh, cookieOptions("/api/auth"));
}
function publicUser(user: {
    _id: unknown;
    name: string;
    email: string;
    role: string;
}) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
    };
}

authRouter.get("/csrf", (_req, res) => {
    const token = newCsrfToken();
    res.cookie(CSRF_COOKIE, token, {
        ...cookieOptions("/"),
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ csrfToken: token });
});
authRouter.post("/signup", async (req, res) => {
    const input = signupSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
    });
    const refresh = signRefresh(String(user._id));
    user.refreshTokenHash = hashToken(refresh);
    await user.save();
    setSession(res, { id: String(user._id), role: user.role }, refresh);
    res.status(201).json({ user: publicUser(user) });
});
authRouter.post("/login", async (req, res) => {
    const input = loginSchema.parse(req.body);
    const user = await User.findOne({
        email: input.email.toLowerCase(),
    }).select("+passwordHash +refreshTokenHash");
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)))
        throw new AppError(401, "Email or password is incorrect");
    const refresh = signRefresh(String(user._id));
    user.refreshTokenHash = hashToken(refresh);
    await user.save();
    setSession(res, { id: String(user._id), role: user.role }, refresh);
    res.json({ user: publicUser(user) });
});
authRouter.post("/refresh", async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new AppError(401, "Refresh session missing");
    let claims: jwt.JwtPayload;
    try {
        claims = jwt.verify(token, env.REFRESH_TOKEN_SECRET) as jwt.JwtPayload;
    } catch {
        throw new AppError(401, "Refresh session expired or invalid");
    }
    if (claims.type !== "refresh" || typeof claims.sub !== "string")
        throw new AppError(401, "Invalid refresh token");
    const user = await User.findById(claims.sub).select("+refreshTokenHash");
    if (!user?.refreshTokenHash || user.refreshTokenHash !== hashToken(token))
        throw new AppError(401, "Refresh session has been revoked");
    const refresh = signRefresh(String(user._id));
    user.refreshTokenHash = hashToken(refresh);
    await user.save();
    setSession(res, { id: String(user._id), role: user.role }, refresh);
    res.json({ user: publicUser(user) });
});
authRouter.post("/logout", async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) {
        try {
            const claims = jwt.verify(
                token,
                env.REFRESH_TOKEN_SECRET,
            ) as jwt.JwtPayload;
            if (claims.type === "refresh" && typeof claims.sub === "string")
                await User.updateOne(
                    { _id: claims.sub, refreshTokenHash: hashToken(token) },
                    { $unset: { refreshTokenHash: 1 } },
                );
        } catch {
            /* Expired token is still cleared below. */
        }
    }
    res.clearCookie(ACCESS_COOKIE, {
        ...cookieOptions("/"),
        maxAge: undefined,
    });
    res.clearCookie(REFRESH_COOKIE, {
        ...cookieOptions("/api/auth"),
        maxAge: undefined,
    });
    res.json({ ok: true });
});
authRouter.get("/me", authenticate, async (req, res) => {
    const user = await User.findById(req.user!.id).select("name email role");
    if (!user) throw new AppError(401, "Session is no longer valid");
    res.json({ user: publicUser(user) });
});
