# =============================================================================
# LiftShift Docker Image
# =============================================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./frontend/
COPY vite.config.ts tsconfig.json tailwind.config.cjs postcss.config.cjs ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/src/ ./src/
COPY backend/tsconfig.json ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
RUN apk add --no-cache nginx supervisor
WORKDIR /app

COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY backend/package.json ./backend/
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN mkdir -p /run/nginx /var/log/supervisor

ENV NODE_ENV=production \
    PORT=5000 \
    HEVY_X_API_KEY="" \
    HEVY_BASE_URL="https://api.hevyapp.com" \
    CORS_ORIGINS=""

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost/api/health || exit 1

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
