import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { campaignRouter } from "./routes/campaign.routes.js";
import { submissionRouter } from "./routes/submission.routes.js";
import { csrf } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./utils/errors.js";

export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || origin === env.FRONTEND_ORIGIN) callback(null, true);
            else callback(new AppError(403, "Origin is not allowed"));
        },
        credentials: true,
        methods: ["GET", "POST", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(
    rateLimit({
        windowMs: 60_000,
        limit: 180,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    }),
);
app.use(csrf);
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use(
    "/api/auth",
    rateLimit({
        windowMs: 15 * 60_000,
        limit: 30,
        standardHeaders: "draft-8",
        legacyHeaders: false,
    }),
    authRouter,
);
app.use("/api/campaigns", campaignRouter);
app.use("/api", submissionRouter);
app.use((_req, _res, next) => next(new AppError(404, "Endpoint not found")));
app.use(errorHandler);
