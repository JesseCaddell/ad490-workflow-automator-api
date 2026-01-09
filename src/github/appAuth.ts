import fs from "fs";
import { Octokit } from "@octokit/core";
import { createAppAuth } from "@octokit/auth-app";
import { env } from "../config/env.js";

export function makeAppOctokit() {
    const privateKey = fs.readFileSync(env.GITHUB_PRIVATE_KEY_PATH, "utf8");

    return new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId: Number(env.GITHUB_APP_ID),
            privateKey,
        },
    });
}
