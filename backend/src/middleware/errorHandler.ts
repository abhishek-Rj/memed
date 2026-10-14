import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/errors.js";
import { env } from "../config/env.js";
import { ZodError } from "zod";
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError)
        return res
            .status(400)
            .json({
                error: "Request validation failed",
                details: err.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            });
    if (err?.name === "ValidationError")
        return res
            .status(400)
            .json({ error: "Validation failed", details: err.message });
    if (err?.code === 11000)
        return res
            .status(409)
            .json({ error: "A record with that value already exists" });
    const status = err instanceof AppError ? err.status : 500;
    if (status >= 500)
        console.error(
            "Request failed:",
            err instanceof Error ? err.message : "unknown error",
        );
    return res
        .status(status)
        .json({
            error:
                status >= 500 && env.NODE_ENV === "production"
                    ? "Internal server error"
                    : err?.message || "Internal server error",
        });
};
