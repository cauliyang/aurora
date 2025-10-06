# PR Preview Setup Guide

This guide explains how to set up automated preview deployments for pull requests.

## Overview

When you create a pull request, a preview website is automatically built and deployed so you can test your changes before merging. The preview URL is posted as a comment on the PR.

## Option 1: GitHub Pages (Default - Free)

**Pros:**
- ✅ Free (uses your existing GitHub Pages)
- ✅ No external services required
- ✅ Works out of the box
- ✅ Automatic cleanup when PR is closed

**Cons:**
- ⚠️ Slower deployment (~2-3 minutes)
- ⚠️ Uses same domain as production

**Setup:**

The workflow is already configured in `.github/workflows/preview.yml`. It works automatically for all PRs!

Preview URLs follow this pattern:
```
https://yangyangli.top/pr-123/
```

Where `123` is your PR number.

## Option 2: Vercel (Recommended for Heavy Usage)

**Pros:**
- ✅ Very fast deployment (~30 seconds)
- ✅ Unique preview URLs per PR
- ✅ Built-in preview features (comments, analytics)
- ✅ Automatic HTTPS

**Cons:**
- ⚠️ Requires Vercel account
- ⚠️ Limited free tier (100 GB bandwidth/month)

**Setup:**

1. **Create a Vercel account** at [vercel.com](https://vercel.com)

2. **Import your GitHub repository** to Vercel
   - Connect your GitHub account
   - Import the `aurora` repository
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Get your Vercel credentials:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Get your project info
   vercel link
   ```

4. **Add GitHub secrets:**
   Go to your repo → Settings → Secrets and variables → Actions
   
   Add these secrets:
   - `VERCEL_TOKEN`: Get from https://vercel.com/account/tokens
   - `VERCEL_ORG_ID`: Found in `.vercel/project.json` after running `vercel link`
   - `VERCEL_PROJECT_ID`: Found in `.vercel/project.json` after running `vercel link`

5. **Activate the workflow:**
   ```bash
   mv .github/workflows/preview-vercel.yml.example .github/workflows/preview-vercel.yml
   # Optionally disable GitHub Pages preview
   # rm .github/workflows/preview.yml
   ```

## Option 3: Netlify

**Setup:**

1. Create a `netlify.toml` file:
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
   
   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   netlify login
   netlify link
   ```

3. Add GitHub secrets:
   - `NETLIFY_AUTH_TOKEN`
   - `NETLIFY_SITE_ID`

4. Use the Netlify GitHub Action (see their docs)

## Testing Your Setup

1. Create a new branch:
   ```bash
   git checkout -b test-preview
   ```

2. Make a small change (e.g., update README)

3. Push and create a PR:
   ```bash
   git add .
   git commit -m "test: preview deployment"
   git push origin test-preview
   ```

4. Wait for the GitHub Action to complete (~2-3 minutes for GitHub Pages)

5. Check your PR for the preview URL comment!

## Troubleshooting

### GitHub Pages preview not working?

1. **Check GitHub Pages is enabled:**
   - Go to repo Settings → Pages
   - Source should be set to `gh-pages` branch

2. **Check workflow permissions:**
   - Go to Settings → Actions → General
   - Workflow permissions should be "Read and write permissions"

3. **Check the Action logs:**
   - Go to Actions tab
   - Click on the failed workflow
   - Review the logs for errors

### Build failing?

1. **Verify build works locally:**
   ```bash
   npm ci
   npm run build
   ```

2. **Check Node version:**
   The workflow uses Node 18. Make sure your code is compatible.

3. **Check dependencies:**
   Make sure `package-lock.json` is committed.

## Cleanup

### Manual cleanup of old previews:

```bash
# Clone the gh-pages branch
git clone -b gh-pages https://github.com/yourusername/aurora.git aurora-gh-pages
cd aurora-gh-pages

# Remove old PR previews
rm -rf pr-123  # Replace with PR number

# Commit and push
git add .
git commit -m "Clean up old preview"
git push
```

### Automatic cleanup:

The GitHub Pages workflow automatically removes previews when PRs are closed/merged.

## Cost Comparison

| Service | Free Tier | Paid Plans |
|---------|-----------|------------|
| GitHub Pages | Unlimited (1 GB storage, 100 GB/month bandwidth) | N/A |
| Vercel | 100 GB bandwidth/month, 100 deploys/day | $20/month (Pro) |
| Netlify | 100 GB bandwidth/month, 300 build minutes/month | $19/month (Pro) |

## Best Practices

1. **Clean up old branches** to avoid cluttering previews
2. **Use preview URLs** to test before merging
3. **Share preview links** with team members for review
4. **Check mobile responsiveness** on preview sites
5. **Test in different browsers** using preview URLs

## Security Notes

- Preview sites are **publicly accessible**
- Don't expose sensitive data in previews
- Use environment variables for API keys
- Review the build logs for any exposed secrets

## Support

If you encounter issues:
1. Check the [GitHub Actions documentation](https://docs.github.com/en/actions)
2. Review the workflow logs in the Actions tab
3. Open an issue in the repository

