# Multi-stage Dockerfile for ShopSphere Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production Nginx Serving Stage
FROM nginx:1.25-alpine AS runner
LABEL maintainer="ShopSphere DevOps <devops@shopsphere.io>"
LABEL service="frontend"

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom Nginx configuration supporting SPA client-side routing & API proxying fallback
RUN echo 'server {' \
  '  listen 80;' \
  '  server_name localhost;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html index.htm;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '  location /health {' \
  '    access_log off;' \
  '    return 200 "OK";' \
  '    add_header Content-Type text/plain;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
