import { app } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";

await connectDatabase();
const server = app.listen(env.PORT, env.HOST, () =>
    console.log(`Meme'd API listening on ${env.HOST}:${env.PORT}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.on(signal, () =>
        server.close(async () => {
            const mongoose = await import("mongoose");
            await mongoose.default.disconnect();
            process.exit(0);
        }),
    );
