# Deployment Guide

This guide covers deploying HevyAnalytics to various platforms.

## Table of Contents

- [Vercel (Recommended)](#vercel-recommended)
- [Netlify](#netlify)
- [GitHub Pages](#github-pages)
- [Docker](#docker)
- [Environment Variables](#environment-variables)

---

## Vercel (Recommended)

Vercel is the official Vite deployment platform with built-in optimization and global CDN.

### Prerequisites

- GitHub account with repository
- Vercel account (free tier available)

### Step-by-Step

1. **Go to [vercel.com](https://vercel.com)**
   - Click "New Project"
   - Choose "Import Git Repository"

2. **Connect GitHub**
   - Authorize Vercel
   - Select HevyAnalytics repository

3. **Configure Project**
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `dist` (auto-detected)
   - Install Command: `npm install` (auto-detected)

4. **Environment Variables**
   - No variables needed (client-side only)

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your live URL will appear

### Custom Domain

1. Go to Project Settings
2. Navigate to Domains
3. Add your custom domain
4. Follow DNS configuration instructions

### Preview Deployments

- Every pull request gets automatic preview deployment
- Share preview URL for feedback before merging

---

## Netlify

Alternative platform with similar features to Vercel.

### Step-by-Step

1. **Go to [netlify.com](https://app.netlify.com)**
   - Click "New site from Git"
   - Choose "GitHub"

2. **Authorize and Select**
   - Authorize Netlify
   - Select HevyAnalytics repository

3. **Configure**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

4. **Custom Domain**
   - Go to Site settings
   - Click "Change site name" for subdomain
   - Add custom domain under "Domain management"

### Continuous Deployment

- Push to `main` branch auto-deploys
- Pull requests get preview deployments

---

## GitHub Pages

Host directly from your GitHub repository.

### Prerequisites

- GitHub repository (public or private with paid plan)

### Step-by-Step

1. **Update package.json**
   ```json
   {
     "homepage": "https://aree6.github.io/HevyAnalytics"
   }
   ```

2. **Install gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Update package.json scripts**
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview",
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**
   - Go to repository Settings
   - Navigate to Pages
   - Select "Deploy from a branch"
   - Choose `gh-pages` branch
   - Click Save

6. **Access Your Site**
   - Visit `https://aree6.github.io/HevyAnalytics`

### Update Deployments

- `npm run deploy` to update
- Changes live in seconds

---

## Docker

Deploy using Docker containers.

### Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install a simple HTTP server
RUN npm install -g http-server

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["http-server", "dist", "-p", "3000", "--gzip", "-c-1", "--cors"]
```

### Create .dockerignore

```
node_modules
npm-debug.log
dist
.git
.gitignore
README.md
.env
.env.local
.DS_Store
```

### Build and Run Locally

```bash
# Build image
docker build -t hevyanalytics:latest .

# Run container
docker run -p 3000:3000 hevyanalytics:latest
```

### Deploy to Cloud Services

#### Docker Hub

```bash
# Login
docker login

# Tag image
docker tag hevyanalytics:latest aree6/hevyanalytics:latest

# Push
docker push aree6/hevyanalytics:latest
```

#### AWS (ECS)

1. Create ECR repository
2. Push image to ECR
3. Create ECS task definition
4. Launch service from task definition

#### Google Cloud Run

```bash
# Authenticate
gcloud auth login

# Build and push to Cloud Run
gcloud run deploy hevyanalytics \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## Environment Variables

### Client-Side Only

HevyAnalytics is a client-side application. No sensitive data is processed on servers.

### Optional Future Use

For future API integrations, create `.env.local`:

```env
# Example for future features
VITE_API_URL=https://api.example.com
VITE_PUBLIC_KEY=your_public_key
```

**Important:** Only expose variables prefixed with `VITE_` in Vite apps.

---

## Performance Optimization

### Build Optimization

The Vite build automatically:
- Minifies code
- Tree-shakes unused code
- Code splits for optimal loading
- Compresses assets

### Runtime Optimization

- Service Worker for offline support (optional)
- Lazy loading of heavy components
- Image optimization
- CSS purging

---

## Monitoring & Analytics

### Add Analytics

#### Google Analytics

1. Create Google Analytics property
2. Add tracking ID
3. Install analytics library:
   ```bash
   npm install react-ga
   ```

4. Update `App.tsx`:
   ```typescript
   import GA from 'react-ga';
   
   GA.initialize('GA_MEASUREMENT_ID');
   GA.pageview(window.location.pathname);
   ```

#### Sentry (Error Tracking)

1. Create Sentry account
2. Get DSN
3. Install Sentry:
   ```bash
   npm install @sentry/react
   ```

4. Initialize:
   ```typescript
   import * as Sentry from '@sentry/react';
   
   Sentry.init({
     dsn: 'YOUR_DSN',
     environment: 'production'
   });
   ```

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### 404 on Refresh (GitHub Pages)

Add `_redirects` file in `public/`:
```
/* /index.html 200
```

### CORS Issues

Ensure API calls use relative URLs for same-origin requests.

### Performance Issues

1. Check bundle size: `npm run build` and view dist folder
2. Use Chrome DevTools Performance tab
3. Check Lighthouse scores

---

## Rollback

### Vercel
- Click "Deployments"
- Select previous deployment
- Click "Redeploy"

### Netlify
- Click "Deploys"
- Select previous deployment
- Click "Publish deploy"

### GitHub Pages
```bash
git revert <commit-hash>
npm run deploy
```

---

## Support

- Check Vercel/Netlify documentation
- Review build logs for errors
- Open issue on GitHub repository

---

**Last Updated:** December 2025
