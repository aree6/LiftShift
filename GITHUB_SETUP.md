# GitHub Repository Setup Instructions

After creating your GitHub repository, follow these steps to complete the setup:

## 1. Repository Description

**Short Description:**
```
A comprehensive workout visualizer that transforms Hevy app CSV exports into powerful insights.
```

**Full Description:**
```
LiftShift transforms your Hevy app workout CSV exports into comprehensive analytics and visualizations. Track your training volume, monitor personal records, analyze exercise performance, and get real-time feedback on your workout sets.

✨ Features:
- Dashboard with volume trends and workout distribution
- Exercise-level analytics with PR tracking
- 1RM calculations using standard formulas
- Set-by-set analysis with training recommendations
- Temporal filtering by month or date
- Local storage for privacy
- Beautiful dark mode UI

```

## 2. Repository Topics

Add these topics to improve discoverability (GitHub → Settings → Topics):

- `fitness`
- `workout`
- `analytics`
- `hevy`
- `training`
- `visualization`
- `react`
- `typescript`
- `vite`
- `personal-records`

## 3. Links to Add

### About Section (GitHub → Settings → Options):
- **Website:** Your deployed URL (https://liftshift.app)
- **Discussions:** Enable GitHub Discussions for community support

### Repository Links (in README):
Update the following placeholders with your actual GitHub username:

## 4. Enable Features

In GitHub repository settings:

### Features to Enable:
- [x] Discussions (for community support)
- [x] Issues (for bug reports and feature requests)
- [x] Pull Requests (for contributions)
- [ ] Wiki (optional)
- [x] Packages (if publishing to npm)

### Branch Protection (Optional but Recommended):
- Go to Settings → Branches
- Add rule for `main` branch
- Require pull request reviews before merging
- Require status checks to pass

## 5. Add Badge to README (Optional)

Add a build status badge. For GitHub Actions, add to README:

```markdown
![Build Status](https://github.com/YOUR_USERNAME/LiftShift/workflows/Build%20and%20Deploy/badge.svg)
```

## 6. Environment Secrets (Optional)

If you later add CI/CD, store any deployment tokens in GitHub Settings → Secrets.

## 7. Update All Documentation

Search for and replace in these files:

**Files to update:**
- README.md
- CONTRIBUTING.md
- DEPLOYMENT.md
- QUICKSTART.md
- .github/workflows/build-deploy.yml


## 8. First Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the recommended split deployment:

- Backend on Render/Railway
- Frontend on Netlify

## 9. Add GitHub Badges (Optional)

Popular badges to add to README:

```markdown
[![GitHub stars](https://img.shields.io/github/stars/aree6/LiftShift.svg?style=flat-square)](https://github.com/aree6/LiftShift)
[![GitHub forks](https://img.shields.io/github/forks/aree6/LiftShift.svg?style=flat-square)](https://github.com/aree6/LiftShift)
[![GitHub issues](https://img.shields.io/github/issues/aree6/LiftShift.svg?style=flat-square)](https://github.com/aree6/LiftShift/issues)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/aree6/LiftShift/blob/main/LICENSE)
```

## 10. Publish to npm (Optional)

If you want to publish as an npm package:

1. Update package.json with `repository` and `homepage` (already done)
2. Ensure `.npmignore` exists (exclude frontend/, tests, etc.)
3. Run `npm publish`

Note: Currently this is an app, not a package, so this is optional.

## 11. Create Initial Release (Optional)

1. Go to GitHub → Releases
2. Click "Create a new release"
3. Tag version: `v1.0.0`
4. Title: `Version 1.0.0 - Initial Release`
5. Description: Key features and what's included
6. Publish release

## 12. Set Up Branch Strategy (Optional but Recommended)

Default branches:
- `main` - production-ready code
- `develop` - development branch

Branch protection for `main`:
- Require pull requests for changes
- Require status checks to pass
- Dismiss stale PR approvals

## 13. Add Collaborators (Optional)

If you want others to contribute:
1. Go to Settings → Collaborators
2. Add GitHub usernames
3. Set appropriate permissions

## Quick Checklist

- [ ] Repository description added
- [ ] Topics added (fitness, workout, analytics, etc.)
- [ ] Homepage URL added to About
- [ ] Discussions enabled
- [ ] All documentation updated with GitHub username
- [ ] All documentation updated with your name
- [ ] Deployed backend + frontend
- [ ] Added deployed URL to About section
- [ ] Secrets configured for CI/CD (if using GitHub Actions)
- [ ] Branch protection set up for main (optional)
- [ ] Release created (optional)

## Support

For GitHub-specific help:
- [GitHub Docs](https://docs.github.com)
- [GitHub Community Forum](https://github.community)

For deployment help:
- [Netlify Docs](https://docs.netlify.com)
- [Render Docs](https://render.com/docs)
- [Railway Docs](https://docs.railway.com)

---

You're all set! Your GitHub repository is ready to go live! 🚀
