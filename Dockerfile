# Multi-stage Docker build for CycloneSense AI platform
FROM node:22-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for building
RUN npm ci

# Copy source tree and configuration
COPY . .

# Build Vite client and bundle Express server.ts to dist/server.cjs
RUN npm run build

# Production runtime container
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled artifacts from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
