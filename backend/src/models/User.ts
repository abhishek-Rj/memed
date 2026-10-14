import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        passwordHash: { type: String, required: true, select: false },
        role: {
            type: String,
            enum: ["brand", "creator"],
            required: true,
            index: true,
        },
        refreshTokenHash: { type: String, select: false },
    },
    { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> &
    mongoose.Document;
export const User: mongoose.Model<any> =
    (mongoose.models.User as mongoose.Model<any> | undefined) ??
    mongoose.model("User", userSchema);
