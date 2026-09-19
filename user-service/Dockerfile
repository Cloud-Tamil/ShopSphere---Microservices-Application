# Multi-stage Dockerfile for ShopSphere User Service
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
LABEL maintainer="ShopSphere DevOps <devops@shopsphere.io>"
LABEL service="user-service"

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5002

RUN apk --no-cache add curl

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./

USER node

EXPOSE 5002

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5002/health || exit 1

CMD ["node", "index.js"]
