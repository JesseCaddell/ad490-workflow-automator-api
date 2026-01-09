import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
    PORT: z.string().default("3001"),

    GITHUB_APP_ID: z.string().min(1),
    GITHUB_WEBHOOK_SECRET: z.string().min(1),
    GITHUB_PRIVATE_KEY_PATH: z.string().min(1),
});

export const env = EnvSchema.parse({
    PORT: process.env.PORT,

    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
    GITHUB_PRIVATE_KEY_PATH: process.env.GITHUB_PRIVATE_KEY_PATH,
});
