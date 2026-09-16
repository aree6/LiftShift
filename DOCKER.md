# Run LiftShift with Docker

One command to self-host LiftShift locally. No Node, no `npm install`.

## Quick start (build locally)

```bash
git clone https://github.com/aree6/LiftShift.git
cd LiftShift
docker compose --env-file .env.docker.example up --build
```

Open `http://localhost:3000`. Backend health (via the frontend proxy): `http://localhost:3000/api/health`.

To stop: `Ctrl+C`, then `docker compose down`.

> Already have a `.env` for local dev (`npm run dev`)? Don't overwrite it.
> `--env-file` above leaves your `.env` untouched. If you prefer the classic
> flow, back yours up first: `cp .env .env.backup && cp .env.docker.example .env`
> (restore with `mv .env.backup .env` when done testing Docker).

## Quick start (prebuilt images, no build)

Images are published to GHCR on every merge to `main` (no release needed),
plus a version tag whenever a GitHub Release is cut.

```bash
git clone https://github.com/aree6/LiftShift.git
cd LiftShift
docker compose --env-file .env.docker.example -f docker-compose.pull.yml up
```

Pin a specific build instead of the moving `latest` tag:

```bash
# immutable release tag (whenever one exists)
LIFTSHIFT_TAG=v1.2.3 docker compose --env-file .env.docker.example -f docker-compose.pull.yml up
# or an exact commit build from any merge to main
LIFTSHIFT_TAG=sha-a1b2c3d docker compose --env-file .env.docker.example -f docker-compose.pull.yml up
```

## Commands you'll run (and how long they take)

| Command | When | Expected time |
|---|---|---|
| `docker compose --env-file .env.docker.example up --build` | First run ever | **~3–4 min.** One-time cost: pulls `node:22-slim` + `nginx:alpine`, installs system Chromium (~2 min), runs backend `npm ci` (~2 min) and frontend `npm ci + vike build` (~1 min). |
| `docker compose up` | Every run after that | **Seconds.** Images are cached; only containers start. Backend needs ~40s to become healthy (Chromium warm-up). |
| `docker compose up --build` | After `git pull` or changing a `VITE_*` value | **Seconds–1 min** if only app code changed (dependency layers cached); full ~3–4 min only if `package.json`/Dockerfiles changed. |
| `docker compose -f docker-compose.pull.yml up` | Using prebuilt GHCR images | **Download time only** (~1 min on first pull, seconds after). No build at all. |
| `docker compose down` | Stop everything | Seconds. |

Rule of thumb: if the log shows `CACHED` next to most steps, you're on the fast path. Only the first build (or dependency changes) pays full price.

## Privacy: self-host images are tracking-free

Community Docker images contain **no analytics, ads, or affiliate tags**:

- No PostHog, no Google Analytics (hard-disabled at image build; keys can't be baked in).
- No `ads.txt`, no affiliate verification meta. Both are stripped during the image build.
- The `/ingest` analytics proxy doesn't exist in self-host Nginx.

The official `liftshift.app` hosting still uses analytics to understand usage; your self-hosted copy phones home nowhere. Verify any time in devtools → Network: no requests to google/posthog/impact domains.

## What runs

| Service | Image | Host port | Notes |
|---|---|---|---|
| `frontend` | Nginx serving `dist/client` | `3000` (`FRONTEND_PORT`) | Single public entrypoint. Proxies `/api/*` to backend (same-origin, no CORS). |
| `backend` | Node + Express + Chromium | none (internal only) | Hevy/Lyfta proxy. Reached via the frontend; not published to your machine, so host port 5000 (often taken by macOS AirPlay Receiver) can never collide. |

No database or volumes. Workouts stay in your browser (`localStorage`); the backend is stateless.

To debug the backend directly, uncomment the `ports:` lines in `docker-compose.yml`
(then `curl -f http://localhost:5051/api/health`), or without exposing anything:

```bash
docker compose exec backend node -e "fetch('http://localhost:5000/api/health').then(r=>console.log(r.status))"
```

## CSV-only mode (skip the 1GB backend)

If you only import CSV/Excel and never use Hevy login or API sync, run the frontend alone:

```bash
docker compose --env-file .env.docker.example --profile frontend-only up frontend-only --build
```

Stop it with the same profile flag (plain `down` won't catch it):

```bash
docker compose --profile frontend-only down
```

## Configuration

Everything has sane defaults; you only need `.env` values for Hevy sync or custom ports.

| Var | Default | Meaning |
|---|---|---|
| `FRONTEND_PORT` | `3000` | Host port for the app. If your Vite dev server already uses 3000, set `FRONTEND_PORT=3001`. |
| `HEVY_X_API_KEY` | empty | Required for Hevy login / Pro sync. CSV-only can leave empty. |
| `CORS_ORIGINS` | `http://localhost:3000` | Only matters if the browser calls the backend directly. Same-origin `/api` (default) bypasses CORS. |
| `BACKEND_URL` | empty | Runtime backend override, no rebuild. Empty = same-origin via Nginx (recommended). Set to `https://your-backend.onrender.com` to use a hosted backend. |
| `VITE_BACKEND_URL` | empty | Build-time fallback for the same. Prefer `BACKEND_URL` at runtime. |

Change a `VITE_*` value? Rebuild: `docker compose up --build`. Change `BACKEND_URL`? Just restart, no rebuild.

## LAN / phone access

`http://<your-mac-ip>:3000` (e.g. `http://192.168.1.20:3000`). Same-origin `/api` keeps working; no `localhost` rewrites needed. If the browser calls a backend directly, add the LAN origin to `CORS_ORIGINS` and restart.

## Update

```bash
# local build
git pull
docker compose up --build

# prebuilt images
docker compose -f docker-compose.pull.yml pull
docker compose -f docker-compose.pull.yml up -d
```

Pin images to a `:v*` release or `:sha-*` tag in production instead of the
moving `latest` (see `LIFTSHIFT_TAG`).

## Validate before up

```bash
docker compose config
curl -f http://localhost:3000/api/health
```

## Troubleshooting

- **Frontend port busy (`address already in use` on 3000):** your Vite dev server or another app holds it. Set `FRONTEND_PORT=3001` in `.env` (or stop the other process).
- **Backend port busy:** no longer possible by default. The backend publishes no host port. If you uncommented `ports:` for debugging, pick a free host port.
- **Backend unhealthy / Chromium slow:** first start launches Chromium; allow 40s. Check `docker logs liftshift-backend`.
- **Hevy login 401:** upstream Hevy error; `HEVY_X_API_KEY` missing or wrong in `.env`.
- **Apple Silicon:** images are `amd64+arm64`; pull gets the right arch automatically.
- **Old images pile up:** `docker image prune`.

## Official hosting vs Docker

`liftshift.app` stays on native hosting (static frontend + Node backend). Docker Compose here is for local/community self-host and is byte-identical in behavior. See `DEPLOYMENT.md` for the hosted path.
