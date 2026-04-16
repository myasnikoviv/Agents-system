# syntax=docker/dockerfile:1.4
FROM node:20-bookworm-slim AS base
WORKDIR /app

# 1. Install dependencies (Cached Layer)
FROM base AS deps
COPY package.json package-lock.json ./
# Copy all package manifests for workspace resolution (Frontend might depend on shared)
COPY packages/shared/package.json ./packages/shared/
COPY apps/client-app/package.json ./apps/client-app/

RUN npm ci

# 2. Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build internal packages (like shared) followed by the app
RUN npm run build -w packages/shared
RUN npm run build -w apps/client-app

# 3. Production stage (Nginx)
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/client-app/dist /usr/share/nginx/html
# Custom nginx config if needed (e.g. for SPA routing)
# COPY apps/client-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
