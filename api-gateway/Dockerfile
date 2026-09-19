# Multi-stage Dockerfile for ShopSphere API Gateway
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# Production stage
FROM node:20-alpine AS runner
LABEL maintainer="ShopSphere DevOps <devops@shopsphere.io>"
LABEL service="api-gateway"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000

# Install curl for container health check
RUN apk --no-cache add curl

# Copy runtime node_modules and code from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./

# Run container as non-root user
USER node

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "index.js"]
