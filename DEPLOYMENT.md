# Deployment Guide

This project uses a split deployment:

- Frontend: Netlify (static Vite build)
- Backend: Render or Railway (Node/Express proxy for the Hevy API)

The backend is required for Hevy login because:

- The Hevy API requires an `x-api-key` header.
- Browsers will block direct calls due to CORS.

Hevy users can authenticate either by:

- Email/username + password (proxied through the backend)
- Hevy Pro API key (from https://hevy.com/settings?developer) pasted directly in the UI (proxied through the backend for data fetch)


## 0) What you will deploy

You will deploy two things:

- Frontend (build from repo root; sources live under `frontend/`)
- Backend folder `backend/` (a separate service)

Note on environment files:

- `.env.example` files are templates and are committed to GitHub.
- Your real secrets belong in `.env` (local dev) or in the Render/Netlify environment variable UI.
- `.env` is gitignored in this repo (so you should not commit it).


## 1) Deploy the backend on Render (recommended)

### 1.1 Create a Render account

1. Open https://render.com
2. Click **Sign Up**
3. Sign in with GitHub (recommended)

### 1.2 Create a new Web Service

1. In the Render dashboard, click **New +**
2. Click **Web Service**
3. Connect your GitHub repo that contains this project
4. Choose the repository and click **Connect**

### 1.3 Configure the service

In the “Create a Web Service” form:

- **Name**: `liftshift-backend` (any name is fine)
- **Region**: pick closest to you
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: Node
- **Build Command**:
  - `npm install && npm run build`
- **Start Command**:
  - `npm start`

Important:

- If you leave **Root Directory** blank, Render will deploy the frontend from repo root.
- That will fail with: `npm error Missing script: "start"`
- Fix: set **Root Directory** to `backend` (or create a new Render service configured with `backend`).

### 1.4 Add environment variables (Render UI)

1. Scroll to the **Environment** section
2. Click **Add Environment Variable**
3. Add these:

- `HEVY_X_API_KEY` = `klean_kanteen_insulated`
- `CORS_ORIGINS` = `https://liftshift.app,http://localhost:3000`

4. Click **Create Web Service**

### 1.5 Copy your backend URL

After deploy finishes:

1. Open the service
2. Find the public URL (looks like `https://liftshift-backend.onrender.com`)
3. Copy it

### 1.6 Quick test

Open in browser:

- `https://YOUR_BACKEND_URL/api/health`

Expected:

- `{ "status": "ok" }`


## 2) Deploy the backend on Railway (alternative)

### 2.1 Create a Railway account

1. Open https://railway.app
2. Click **Login**
3. Sign in with GitHub

### 2.2 Create a project

1. Click **New Project**
2. Click **Deploy from GitHub repo**
3. Select your repository

### 2.3 Configure Root Directory

Railway will build from repo root by default.

To ensure it runs the backend:

1. Open the project
2. Go to **Settings**
3. Find the “Root Directory” setting
4. Set it to `backend`

### 2.4 Add environment variables

1. Go to **Variables**
2. Add:

- `HEVY_X_API_KEY` = `klean_kanteen_insulated`
- `CORS_ORIGINS` = `https://liftshift.app,http://localhost:3000`

### 2.5 Confirm start command

Railway usually detects Node projects automatically.

If it asks:

- Build: `npm run build`
- Start: `npm start`


## 3) Deploy the frontend on Netlify

### 3.1 Add frontend environment variables

Your frontend needs to know where the backend is.

1. Open https://app.netlify.com
2. Click your site (liftshift)
3. Go to **Site configuration**
4. Go to **Build & deploy**
5. Go to **Environment**
6. Click **Add a variable**

Add:

- `VITE_BACKEND_URL` = `https://YOUR_BACKEND_URL`

Notes:

- `VITE_BACKEND_URL` must be the public URL of your deployed backend (Render/Railway), not `localhost`.
- `VITE_BACKEND_URL` should be the backend *origin* (no trailing `/api`). The frontend will call `${VITE_BACKEND_URL}/api/...`.
- Example: `https://liftshift-backend.onrender.com`

### 3.2 Trigger a deploy

1. Go to **Deploys** tab
2. Click **Trigger deploy**
3. Choose **Deploy site**


## 4) First-run checklist

After both are deployed:

1. Open https://liftshift.app
2. You should see the platform selector
3. Choose:
   - Strong (CSV) or
   - Hevy (Login (email+password or Pro API key) or CSV)
4. After setup, you should see the dashboard

Backend verification (recommended):

- Open: `https://YOUR_BACKEND_URL/api/health`
- Expected: `{ "status": "ok" }`

If Hevy login fails in production, verify backend environment variables:

- `HEVY_X_API_KEY` is set
- `CORS_ORIGINS` includes your frontend origin (example: `https://liftshift.app`)

If you see Render logs mentioning `X-Forwarded-For` / `trust proxy` (from `express-rate-limit`), ensure your backend is deployed with the latest code (the backend enables `trust proxy` so rate limiting works correctly behind Render/Cloudflare).

If the frontend receives `401 Unauthorized` from `POST /api/hevy/login`, that status is typically coming from the upstream Hevy API and almost always indicates `HEVY_X_API_KEY` is missing or incorrect in your backend environment.

If you ever want to restart onboarding:

- Open DevTools
- Application → Local Storage
- Clear keys starting with `hevy_analytics_`
- Also clear:
  - `hevy_username_or_email`
  - `hevy_analytics_secret:hevy_password`
  - `hevy_auth_token`
  - `hevy_pro_api_key`
  - `lyfta_api_key`

If your browser is missing WebCrypto/IndexedDB support (or the page isn't a secure context), the app may fall back to storing passwords in Session Storage.


## 5) Notes

- Hevy login is proxied through your backend.
- Credential login stores a Hevy `auth_token` locally and uses it for subsequent syncs.
- Pro API key login stores a Hevy Pro `api-key` locally and uses it for subsequent syncs.
- The app stores the Hevy token in your browser (localStorage).
- If you choose to use Hevy/Lyfta sync, the app may also store your login inputs locally to prefill onboarding (for example: username/email and API keys). Passwords are stored locally and are encrypted when the browser supports WebCrypto + IndexedDB.
- Your workouts are processed client-side into `WorkoutSet[]`.


## Local development on your phone (LAN)

If the app works on your Mac but fails on your phone with a network error like “Load failed”, it’s almost always because the frontend is trying to call the backend at `http://localhost:...`.

On a phone, `localhost` means the phone itself (not your Mac).

Recommended setup:

1. Start the backend on your Mac (default `:5000`, or whatever `backend/.env` `PORT` is set to).
2. Start the frontend (Vite) on your Mac.
3. Open the Vite URL from your phone using your Mac’s LAN IP, for example:

   - `http://192.168.x.x:3000/`

Important notes:

- In development, the frontend calls the backend via same-origin `/api/...` and Vite proxies it to your backend.
- If you set `VITE_BACKEND_URL` locally and it points to `http://localhost:...`, the frontend will ignore it in dev and still use the proxy, so LAN devices work.
- If you want to bypass the proxy in dev, set `VITE_BACKEND_URL` to your Mac’s LAN IP instead (example: `http://192.168.x.x:5050`).
