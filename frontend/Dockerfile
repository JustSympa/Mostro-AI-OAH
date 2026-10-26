FROM node:22-alpine AS base

# Install libc6-compat for Alpine compatibility with Turbopack / Next native bindings
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Step 1: Dependencies installation
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Step 2: Build the Next.js application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Inlined build-time environment variable for client-side API requests
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Step 3: Minimal production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set up permissions for Next.js prerender cache
RUN mkdir .next && chown nextjs:nodejs .next

# Leverage standalone output traces to minimize image footprint
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
