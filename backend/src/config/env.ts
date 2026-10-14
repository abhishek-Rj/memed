import "dotenv/config";
import { z } from "zod";

const schema = z
    .object({
        NODE_ENV: z
            .enum(["development", "test", "production"])
            .default("development"),
        PORT: z.coerce.number().int().positive().default(4000),
        HOST: z.string().min(1).default("127.0.0.1"),
        MONGODB_URI: z.string().min(1),
        ACCESS_TOKEN_SECRET: z.string().min(32),
        REFRESH_TOKEN_SECRET: z.string().min(32),
        FRONTEND_ORIGIN: z
            .string()
            .url()
            .transform((value) => new URL(value).origin),
        COOKIE_DOMAIN: z
            .string()
            .default("")
            .refine(
                (value) =>
                    !value ||
                    (/^[a-z0-9.-]+$/i.test(value) &&
                        !value.startsWith(".") &&
                        !value.endsWith(".") &&
                        !value.includes("..")),
                "COOKIE_DOMAIN must be a bare parent domain with no scheme or port",
            ),
    })
    .superRefine((value, ctx) => {
        if (value.ACCESS_TOKEN_SECRET === value.REFRESH_TOKEN_SECRET)
            ctx.addIssue({
                code: "custom",
                path: ["REFRESH_TOKEN_SECRET"],
                message: "Access and refresh JWT secrets must differ",
            });
        if (value.NODE_ENV === "production" && !value.COOKIE_DOMAIN)
            ctx.addIssue({
                code: "custom",
                path: ["COOKIE_DOMAIN"],
                message: "Set the shared parent domain in production",
            });
        if (
            value.NODE_ENV === "production" &&
            !value.FRONTEND_ORIGIN.startsWith("https://")
        )
            ctx.addIssue({
                code: "custom",
                path: ["FRONTEND_ORIGIN"],
                message: "Production frontend origin must use HTTPS",
            });
    });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error(
        "Invalid backend environment:",
        parsed.error.flatten().fieldErrors,
    );
    throw new Error(
        "Set the required backend environment variables from .env.example",
    );
}
export const env = parsed.data;
