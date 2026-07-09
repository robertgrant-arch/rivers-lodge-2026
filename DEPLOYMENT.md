# Deployment Documentation

## Production Environment

**Render Service:** `srv-d85rdondl75s7396bsjg` (rivers-lodge-2026)
**Domain:** `riverslodgehunt.com`
**Branch:** `main`
**Region:** Oregon (US)
**Plan:** Starter

## Auto-Deploy Pipeline

Auto-deploy is **enabled via `render.yaml`** with `autoDeployTrigger: commit`. This means:

- Every commit to `main` triggers a deployment automatically
- Deploys occur **regardless of CI status** (no GitHub Actions check gate)
- Build validation happens on Render's infrastructure (`pnpm build`)

### CI Safeguards

GitHub Actions workflow (`.github/workflows/build.yml`) runs on all commits and PRs:
- `pnpm install --frozen-lockfile` — validate dependencies
- `npx tsc --noEmit` — catch TypeScript errors before merge
- `pnpm build` — validate the production build

If CI fails, fix and force-push (or rebase) to unblock deploy.

## Manual Deploy (If Auto-Deploy Fails)

If a commit to `main` doesn't auto-deploy within 5 minutes:

1. SSH to Render dashboard or use Render CLI
2. Manually trigger deploy for service `srv-d85rdondl75s7396bsjg`

Or create an empty commit to re-trigger:
```bash
git commit --allow-empty -m "chore: trigger Render deploy"
git push origin main
```

## Never Use Vercel

Vercel is **NOT** used. The file `vercel.json` must never be re-added to the repo root.
Render is the only production host for this application.
