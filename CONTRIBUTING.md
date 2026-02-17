# GitHub Quota Viz Contributor Workflow Guide

This document outlines the branching strategy, workflow, and best practices for contributing to GitHub Quota Viz.

> **⚠️ Important**: Always use Pull Requests to merge changes - never merge directly via command line. This ensures CI runs on your changes before they reach develop or main.

## Table of Contents

- [Branching Strategy](#branching-strategy)
- [Quick Reference](#quick-reference)
- [Working with Branches](#working-with-branches)
- [Release Process](#release-process)
- [Best Practices](#best-practices)
- [Common Commands](#common-commands)

---

## Branching Strategy

GitHub Quota Viz uses a Git Flow-inspired branching strategy:

```
main (production) ──────────────────────────────────────►
  ↑                              ↑
  │ Merge via PR + tag          │ Merge via PR + tag
  │                              │
develop (integration) ──────────►───────────────────────►
  ↑
  │
  ├─► feature/new-feature-name  ── PR ──► develop
  ├─► feature/another-feature   ── PR ──► develop
  │
  └─► bugfix/fix-description   ── PR ──► develop
```

### Branch Types

| Branch | Purpose | Base | Merges To |
|--------|---------|------|-----------|
| `main` | Production-ready code | - | Tags only |
| `develop` | Integration/testing | main | main |
| `feature/*` | New features | develop | develop |
| `bugfix/*` | Bug fixes | develop | develop |
| `hotfix/*` | Urgent production fixes | main | main + develop |

### Naming Conventions

- **Features**: `feature/short-description` (e.g., `feature/add-chart-export`)
- **Bugfixes**: `bugfix/short-description` (e.g., `bugfix/fix-tooltip-position`)
- **Hotfixes**: `hotfix/short-description` (e.g., `hotfix/security-patch`)
- **Releases**: `release/v1.0.0` (version tags only)

---

## Quick Reference

### Starting New Work

```bash
# Update develop
git checkout develop
git pull origin develop

# Create new feature branch
git checkout -b feature/my-new-feature develop

# Create new bugfix branch
git checkout -b bugfix/fix-something develop
```

### Working on Changes

```bash
# Make changes, then stage and commit
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/my-new-feature
```

### Merging Work

```bash
# When feature is complete, create a Pull Request (NOT direct merge!)

# Option A: GitHub CLI
gh pr create --base develop --head feature/my-new-feature \
  --title "feat: Description of changes" \
  --body "What this PR does"

# Option B: GitHub UI
# Visit: https://github.com/harrison-wallace/github-quota-viz/pull/new/feature/my-new-feature

# Wait for CI checks to pass in GitHub Actions
# Then merge PR on GitHub UI

# ⚠️ IMPORTANT: Sync your local develop branch!
git checkout develop
git pull origin develop

# Delete the feature branch (after merge)
git branch -d feature/my-new-feature
git push origin --delete feature/my-new-feature
```

### Creating Releases

```bash
# Update version, create release tag
git checkout develop
git pull origin develop

# Create Pull Request from develop to main

# Option A: GitHub CLI
gh pr create --base main --head develop \
  --title "Release v1.0.0" \
  --body "Release version 1.0.0"

# Option B: GitHub UI
# Go to: https://github.com/harrison-wallace/github-quota-viz/compare/main...develop
# Click "Create pull request"

# Wait for CI checks to pass
# Then merge PR on GitHub UI

# ⚠️ IMPORTANT: Sync local branches after GitHub merge!
# (Your local branches are still behind after GitHub merge)
git checkout main
git pull origin main    # This pulls the merged code from GitHub

# Now create the version tag (from main, which is now synced)
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0

# Also sync develop for next round of work
git checkout develop
git pull origin develop
```

## Automated Release Process

Our Jenkins pipeline automatically handles deployment when you create a version tag. Here's how it works:

### What Happens When You Create a Tag

When you push a tag matching `v*.*.*` (e.g., `v1.0.0`, `v2.1.0`):

1. **Jenkins automatically triggers** the deployment pipeline
2. **Runs full CI/CD**:
   - Validates branch name
   - Installs dependencies
   - Runs ESLint
   - Runs tests
   - Builds the React app
   - Builds Docker image
   - Updates `package.json` version automatically from the tag
   - Removes old production container
   - Deploys new container
   - Verifies deployment

### Benefits of Tag-Based Deployment

- **Only deployed code is production-ready** - No accidental deployments
- **Automatic version management** - Package.json updates automatically
- **Clean deployments** - Old container is removed before new one starts
- **Full CI validation** - Lint, tests, and build must pass before deployment
- **Audit trail** - Every deployment is tied to a specific version tag

### Release Checklist

Before creating a release tag:

- [ ] All tests pass locally: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Changes are merged to main via PR
- [ ] Local main is synced with origin: `git pull origin main`

Then create and push the tag:

```bash
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

Jenkins will handle the rest automatically!

---

## Working with Branches

### Feature Branch Workflow

1. **Start from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/add-signals develop
   ```

2. **Make regular commits**
   ```bash
   # Make changes
   git add changed_files.go
   git commit -m "Add signal detection logic"
   
   # Push regularly to backup work
   git push origin feature/add-signals
   ```

3. **Keep branch up-to-date** (if long-running)
   ```bash
   git fetch origin
   git merge origin/develop
   # Resolve any conflicts
   ```

4. **Complete the feature**
   ```bash
   # Push your branch
   git push origin feature/add-signals
   
   # Create Pull Request (choose ONE method):
   
   # Option A: GitHub CLI
   gh pr create --base develop --head feature/add-signals \
     --title "feat: Add signal detection" \
     --body "Adds signal detection logic for trading"
   
   # Option B: GitHub UI
   # Visit: https://github.com/harrison-wallace/github-quota-viz/pull/new/feature/add-signals
   
   # Wait for CI checks to pass in GitHub Actions
   # Then merge PR on GitHub UI
   
   # ⚠️ IMPORTANT: Sync your local develop branch!
   git checkout develop
   git pull origin develop
   
   # Cleanup
   git branch -d feature/add-signals
   git push origin --delete feature/add-signals
   ```

### Bugfix Branch Workflow

1. **Create from develop**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b bugfix/fix-api-timeout develop
   ```

2. **Fix and commit**
   ```bash
   git add fix_file.go
   git commit -m "Fix API timeout handling"
   ```

3. **Merge back**
   ```bash
   # Push your branch
   git push origin bugfix/fix-api-timeout
   
   # Create Pull Request
   gh pr create --base develop --head bugfix/fix-api-timeout \
     --title "bugfix: Fix API timeout" \
     --body "Fixes API timeout issue in Lambda"
   
   # Wait for CI checks
   # Merge PR on GitHub UI
   
   # ⚠️ IMPORTANT: Sync your local develop branch!
   git checkout develop
   git pull origin develop
   ```

### Hotfix Branch Workflow

For critical bugs in production:

1. **Create from main**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-fix main
   ```

2. **Fix and commit**
   ```bash
   git add critical_fix.go
   git commit -m "HOTFIX: Critical security patch"
   ```

3. **Merge to main and develop**
   ```bash
   # Push your hotfix branch
   git push origin hotfix/critical-fix
   
   # Create PR to main (for production fix)
   gh pr create --base main --head hotfix/critical-fix \
     --title "HOTFIX: Critical security patch" \
     --body "Emergency fix for production"
   
   # Wait for CI, merge on GitHub UI
   
   # ⚠️ IMPORTANT: Sync local main before tagging!
   git checkout main
   git pull origin main
   
   # Create hotfix tag
   git tag -a v1.0.1 -m "Hotfix version 1.0.1"
   git push origin v1.0.1
   
   # Now merge to develop (create another PR)
   gh pr create --base develop --head hotfix/critical-fix \
     --title "HOTFIX: Merge hotfix to develop" \
     --body "Sync hotfix to develop"
   
   # Merge on GitHub UI
   
   # ⚠️ IMPORTANT: Sync your local develop branch!
   git checkout develop
   git pull origin develop
   ```

---

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (v1.0.0 → v2.0.0): Breaking changes
- **MINOR** (v1.0.0 → v1.1.0): New features (backward compatible)
- **PATCH** (v1.0.0 → v1.0.1): Bug fixes

### Release Steps

1. **Prepare release branch** (optional, for larger releases)
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.1.0 develop
   ```

2. **Final testing and adjustments**
   ```bash
   # Make any final changes
   git add .
   git commit -m "Prepare for v1.1.0 release"
   ```

3. **Merge to main**
   ```bash
   # Push release branch
   git push origin release/v1.1.0
   
   # Create PR from release branch to main
   gh pr create --base main --head release/v1.1.0 \
     --title "Release v1.1.0" \
     --body "Release version 1.1.0"
   
   # Wait for CI checks
   # Merge PR on GitHub UI
   
   # ⚠️ IMPORTANT: Sync local main before tagging!
   git checkout main
   git pull origin main
   
   # Create version tag
   git tag -a v1.1.0 -m "Release version 1.1.0"
   git push origin v1.1.0
   ```

4. **Merge changes back to develop**
   ```bash
   # Create PR from release branch to develop
   gh pr create --base develop --head release/v1.1.0 \
     --title "Release v1.1.0: Merge to develop" \
     --body "Sync release changes back to develop"
   
   # Merge on GitHub UI
   
   # ⚠️ IMPORTANT: Sync your local develop branch!
   git checkout develop
   git pull origin develop
   ```

5. **Cleanup**
   ```bash
   git branch -d release/v1.1.0
   git push origin --delete release/v1.1.0
   ```

---

## Best Practices

### Commits

- **Write meaningful commit messages**
  - ✅ `Add chart export functionality for CSV downloads`
  - ❌ `Fixed stuff` or `Updates`

- **Commit often** - Small, focused commits are easier to review

- **Use present tense**: `Add feature` not `Added feature`

### Branching

- **One feature per branch** - Don't mix unrelated changes

- **Keep branches up-to-date** - Merge from develop regularly

- **Delete old branches** - Cleanup after merging

### Code Review

- **Pull Request before merge** - Even to develop

- **Keep PRs focused** - Smaller changes = faster review

- **Describe your changes** - Explain what and why

### Security

- **Never commit secrets** - Use `.gitignore` and environment variables
- **Don't push credentials** - Use environment variables
- **Review before pushing** - Check for sensitive data

---

## Common Commands

### Daily Workflow

```bash
# Start of day - sync with team
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/my-work develop

# Save work
git add .
git commit -m "My changes"
git push origin feature/my-work

# End of day
git push origin feature/my-work
```

### Checking Status

```bash
# See what changed
git status
git diff

# See commit history
git log --oneline -10

# See branches
git branch -a
```

### Undo Things

```bash
# Unstage a file
git reset HEAD file.txt

# Discard changes to a file
git checkout -- file.txt

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1
```

### Syncing

```bash
# Fetch all updates
git fetch origin

# Pull develop into current branch
git pull origin develop

# Push branch to remote
git push origin feature/my-work
```

---

## Important Notes

1. **Never commit directly to main** - Always use branches and PRs
2. **Always branch from develop** - Except for hotfixes
3. **Use --no-ff when merging** - Preserves feature branch history
4. **Tag releases** - Use semantic versioning tags
5. **Keep .gitignore updated** - Don't commit secrets or build artifacts

---

## Getting Help

- Check [Git documentation](https://git-scm.com/doc)
- Review your changes with `git log` and `git diff`
- Ask in project issues for clarification

---

**Last Updated**: February 2026
