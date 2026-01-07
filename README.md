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
- Node.js (TypeScript recommended)
- Octokit (GitHub API + webhooks)
- Postgres (Supabase/Neon/etc.)
- Hosted on Render/Fly.io/DigitalOcean (TBD)

## Local Development (placeholder)
> Setup instructions will be added once the initial server skeleton is committed.

## Related Repositories
- **Project hub / docs:** https://github.com/JesseCaddell/AD490-Capstone
- **Frontend (Web UI):** https://github.com/JesseCaddell/ad490-workflow-automator-web
