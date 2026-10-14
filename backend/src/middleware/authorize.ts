import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";
export function authorize(...roles: Array<"brand" | "creator">) {
    return (req: Request, _res: Response, next: NextFunction) =>
        req.user && roles.includes(req.user.role)
            ? next()
            : next(new AppError(403, "You do not have permission to do that"));
}
