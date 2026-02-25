FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Create public dir (may be empty)
RUN mkdir -p ./public

# Copy all node_modules (prisma CLI needs its full transitive dependency tree for migrations)
COPY --from=deps /app/node_modules ./node_modules

# Copy Prisma files for migrations
COPY --from=builder /app/prisma ./prisma
RUN chmod -R 755 ./prisma

# Copy reference files (needed at runtime for system prompt)
COPY --from=builder /app/reference ./reference
COPY --from=builder /app/docs ./docs

# Startup script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create data directory
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
