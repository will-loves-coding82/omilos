# Install dependencies in their own layer so they're cached separately from source changes
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the app using the cached node_modules from the deps stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Final runtime image: only the standalone server output, no build toolchain or source
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Run as a non-root user rather than the default root
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Static assets aren't included in the standalone output, so copy them separately
COPY --from=builder /app/public ./public
# output: "standalone" (next.config.ts) traces only the files needed at runtime
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Bind to all interfaces so the port is reachable from outside the container
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
