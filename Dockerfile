# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

# Build stage
FROM node:24.12.0-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy prisma schema for generate
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Run tests
# RUN pnpm test

# Accept SITE as build argument and set as environment variable
ARG SITE
ENV SITE=$SITE
ENV ASTRO_TELEMETRY_DISABLED=1

# Placeholder env vars for build (will be overridden at runtime)
ENV STRIPE_SECRET_KEY=placeholder
ENV STRIPE_SIGNING_SECRET=placeholder
ENV DATABASE_URL=placeholder

# Build the application (includes prisma generate)
RUN pnpm build

# Production stage
FROM node:24.12.0-alpine AS runner

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 astro

# Copy built application
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/prisma ./prisma
COPY --from=builder --chown=astro:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

# Switch to non-root user
USER astro

# Expose the port Astro runs on
EXPOSE 4321

# Set environment variables for runtime
ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_ENV=production

# Start the application
CMD ["pnpm", "start:prod"]
