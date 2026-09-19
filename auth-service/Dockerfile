# Multi-stage Dockerfile for ShopSphere Auth Service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
LABEL maintainer="ShopSphere DevOps <devops@shopsphere.io>"
LABEL service="auth-service"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5001

RUN apk --no-cache add curl

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./

USER node

EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["node", "index.js"]
