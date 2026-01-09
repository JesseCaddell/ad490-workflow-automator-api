import fs from "fs";
import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "../config/env.js";

async function main() {
    const privateKey = fs.readFileSync(env.GITHUB_PRIVATE_KEY_PATH, "utf8");

    const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: Number(env.GITHUB_APP_ID),
            privateKey,
        },
    });

    const auth = await octokit.auth({ type: "app" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const token = (auth as any).token as string | undefined;

    console.log("✅ App auth OK:", Boolean(token));
}

main().catch((err) => {
    console.error("❌ App auth failed:", err);
    process.exit(1);
});
