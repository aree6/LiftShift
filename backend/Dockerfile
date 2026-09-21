FROM node:22-slim AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=5000
# Browser binaries (full Chrome + chrome-headless-shell) are downloaded by
# Puppeteer's postinstall into PUPPETEER_CACHE_DIR (must be appuser-readable
# at runtime); the launch code auto-resolves the shell from this cache.
# Do NOT set PUPPETEER_EXECUTABLE_PATH here: any explicit executable forces
# Puppeteer to skip downloads and pins full Chromium. (Legacy
# PUPPETEER_SKIP_CHROMIUM_DOWNLOAD is ignored by Puppeteer 24+.)
ENV PUPPETEER_CACHE_DIR=/opt/pptr-cache

WORKDIR /app
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/dist ./dist
RUN npm ci --omit=dev && npm cache clean --force

RUN groupadd -r appuser && useradd -r -g appuser appuser \
  && mkdir -p /opt/pptr-cache \
  && chown -R appuser:appuser /app /opt/pptr-cache
USER appuser

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||'5000')+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
