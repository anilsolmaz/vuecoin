# ===================================================
# Stage 1: Build Frontend (Vue.js 3 SPA)
# ===================================================
FROM node:20-alpine AS client-builder

WORKDIR /app/client

# Copy client dependency manifests
COPY client/package*.json ./
RUN npm ci --no-audit

# Copy client source code and build
COPY client/ ./
RUN npm run build

# ===================================================
# Stage 2: Production Server (Node.js + Express + Worker)
# ===================================================
FROM node:20-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies for root backend
COPY package*.json ./
RUN npm ci --only=production --no-audit

# Copy server code and configs
COPY server.js ./
COPY server/ ./server/

# Copy built frontend assets from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Expose server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/test || exit 1

# Start the VueCoin arbitrage server & background worker
CMD ["node", "server.js"]
