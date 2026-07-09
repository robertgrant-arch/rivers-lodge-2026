# Deployment Configuration

**Production host: Render** (`render.yaml` is source of truth)

**Vercel is NOT used.** Do not add `vercel.json` or connect the Vercel GitHub app.

All deployments flow through Render.com auto-deploy from the `main` branch.

---

## Verify Deployment (No Dashboard Required)

### Automatic verification (GitHub Actions)

When you merge a PR to `main`, the `verify-deploy` workflow automatically polls the `/api/health` endpoint and:
- ✓ On success: comments on the commit with the deployed SHA
- ✗ On timeout (10 min): opens an issue with diagnostic info

### Manual verification

```bash
# Check deployed commit without opening Render dashboard
curl -s https://riverslodgehunt.com/api/health | jq '.commit'

# Compare to local HEAD
git rev-parse HEAD

# Bash script to verify match
curl -s https://riverslodgehunt.com/api/health | jq -r '.commit' | \
  xargs -I {} bash -c 'git rev-parse HEAD | grep -q {} && echo "✓ Deployed" || echo "✗ Not deployed"'
```

The `/api/health` endpoint returns:
```json
{
  "ok": true,
  "commit": "abc123def456...",
  "builtAt": "2026-07-09T20:15:00.000Z",
  "node": "v22.0.0",
  "db": "up"
}
```

### Using the Makefile

```bash
make verify-live
```

Exits 0 if deployed, 1 if not.

---

## Manual Deploy (Render Dashboard Fallback)

If auto-deploy fails and you need to trigger manually:

1. Sign in to [Render dashboard](https://dashboard.render.com)
2. Service: `rivers-lodge-2026` (srv-d85rdondl75s7396bsjg)
3. Click "Manual Deploy" → "Deploy latest commit"

Or push an empty commit to trigger auto-deploy without code changes:

```bash
git commit --allow-empty -m "chore: trigger Render deploy"
git push origin main
```

---

## How Auto-Deploy Works

`render.yaml` specifies:
- `autoDeployTrigger: commit` — every push to `main` triggers a build
- `branch: main` — watches only the main branch
- `preDeployCommand: node scripts/run-migrations.mjs` — runs SQL migrations before build
- `buildCommand`, `startCommand` — how to build and run the app

The service listens for pushes and starts a new deploy automatically. No GitHub App integration needed.

---

## Troubleshooting

### Features silently fail to save (e.g., calendar events, blocked dates)

**Root cause:** SQL migrations didn't run on Render, leaving database schema incomplete.

**Check:**
1. Verify `/api/health` returns `"db": "up"`
2. Check that new columns exist on relevant tables:
   ```sql
   -- For calendar events (portal_blocked_dates table):
   \d portal_blocked_dates  -- psql command to show table schema
   -- Should have columns: title, kind, startAt, endAt, allDay
   ```
3. Review Render deploy logs — migrations run in `preDeployCommand`

**Fix:**
1. Push a new commit with migrations in `_core/db/migrations/0*.sql`
2. `preDeployCommand` will auto-run on next deploy
3. Verify with `/api/health` before testing features

### Deploy started but not rolled out after 10+ minutes

1. Check that `/api/health` is returning a valid response
2. Verify the commit SHA matches your expected push (from `git log` or GitHub)
3. If still stuck, open a Render dashboard issue (unfortunately required for rare cases)

### Build step fails silently

- Render logs are visible in the dashboard under "Deploy Logs"
- Check `pnpm build` output locally: `pnpm run build`
- CI workflow `verify-pr-preview.yml` also runs on PRs to catch issues early
