import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase(uri = env.MONGODB_URI) {
    await mongoose.connect(uri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 10_000,
    });
    return mongoose.connection;
}
