# syntax=docker/dockerfile:1.4
FROM node:20-bookworm-slim AS base
WORKDIR /app

# 1. Install dependencies (Cached Layer)
FROM base AS deps
COPY package.json package-lock.json ./
# Copy all package manifests for workspace resolution
COPY packages/shared/package.json ./packages/shared/
COPY packages/events/package.json ./packages/events/
COPY packages/memory/package.json ./packages/memory/
COPY packages/governance/package.json ./packages/governance/
COPY packages/billing/package.json ./packages/billing/
COPY packages/runtime/package.json ./packages/runtime/
COPY apps/control-plane/package.json ./apps/control-plane/

RUN npm ci

# 2. Build stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build internal packages followed by the app
RUN npm run build --workspaces

# 3. Production stage
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/control-plane ./apps/control-plane
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001
CMD ["npm", "run", "start", "-w", "apps/control-plane"]
