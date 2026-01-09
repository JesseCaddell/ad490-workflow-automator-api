# AD490 Workflow Automator — API

> 📘 Part of the **AD490 Capstone Project**  
> Project hub / documentation: https://github.com/JesseCaddell/AD490-Capstone

This repository contains the **backend API** and **GitHub App integration** for the GitHub Workflow Automation SaaS.

The API is responsible for:
- Handling GitHub App installation metadata
- Receiving and validating GitHub webhooks
- Evaluating automation rules and executing actions (labels, reviewers, comments, etc.)
- Generating GitHub Actions YAML from structured templates and committing workflow files to repos
- Persisting configuration and execution logs in a database

## Scope (MVP)
- GitHub App webhook receiver + signature validation
- Repo discovery for a GitHub App installation
- Rules engine:
  - Trigger: `pull_request.opened` (initial)
  - Actions: add label, request reviewers, post comment
- Workflow generation:
  - Template-based JSON → YAML
  - Commit `.github/workflows/*.yml` via GitHub API
- Basic audit/execution logs

## Tech Stack (planned)
- Node.js (TypeScript)
- Octokit (GitHub API + webhooks)
- Postgres (Supabase / Neon / etc.)
- Hosted on Render / Fly.io / DigitalOcean (TBD)

## Local Development

### Start the API server

```<bash>
npm install
npm run dev
```

The server runs on:

```<text>
http://localhost:3000
```

Health check:

```<bash>
curl http://localhost:3000/health
```

Expected response:

```<json>
{ "ok": true }
```

---

## Testing GitHub Webhooks Locally (ngrok)

During development, the API must receive **real GitHub webhook traffic**.  
This is done by exposing the local server using **ngrok**.

### Prerequisites
- Node.js (LTS)
- ngrok account (free tier is sufficient)
- Flowarden GitHub App created

---

### 1️⃣ Start ngrok

```<bash>
ngrok http 3000
```

Example output:

```<text>
https://lucy-plotful-daine.ngrok-free.dev
```

⚠️ Use the **HTTPS** URL only.

---

### 2️⃣ Configure the GitHub App webhook

Webhook URL:

```<text>
https://<your-ngrok-url>/webhooks/github
```

Example:

```<text>
https://lucy-plotful-daine.ngrok-free.dev/webhooks/github
```

Content type:

```<text>
application/json
```

Webhook secret:
- Must match `GITHUB_WEBHOOK_SECRET` in `.env`

---

### 3️⃣ Redeliver a test webhook

GitHub App → **Advanced → Webhooks**  
Select a delivery → **Redeliver**

Expected:
- GitHub returns **200**
- API logs the event
- Headers include `X-GitHub-Event`

---

### Common Issues

**404**
- Check `/webhooks/github`
- Confirm server is running

**Signature verification failed**
- Secret mismatch
- Raw body middleware missing

**ngrok not found**
- Install from https://ngrok.com/download

---

### Notes
- ngrok URLs change on restart
- Update webhook URL accordingly
- Local development only

## Related Repositories
- Project hub: https://github.com/JesseCaddell/AD490-Capstone
- Frontend UI: https://github.com/JesseCaddell/ad490-workflow-automator-web
