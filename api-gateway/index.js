/**
 * ShopSphere - API Gateway
 * Central Reverse Proxy, Security Filter & Observability Ingress
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:5001';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:5002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:5003';
const JWT_SECRET = process.env.JWT_SECRET || 'shopsphere-super-secure-jwt-production-secret-key-32chars';

// Metrics counters
const metrics = {
  totalRequests: 0,
  statusCodeCounts: {
    '2xx': 0,
    '4xx': 0,
    '5xx': 0
  },
  startedAt: new Date().toISOString()
};

// Structured request logging
app.use((req, res, next) => {
  metrics.totalRequests++;
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCategory = `${Math.floor(res.statusCode / 100)}xx`;
    if (metrics.statusCodeCounts[statusCategory] !== undefined) {
      metrics.statusCodeCounts[statusCategory]++;
    }
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    };
    // Safe output avoiding passwords/tokens
    console.log(JSON.stringify(logEntry));
  });
  next();
});

// CORS Setup
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));

// Health Check Endpoints for Kubernetes Probes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

app.get('/live', (req, res) => {
  res.status(200).json({ status: 'ALIVE' });
});

app.get('/ready', (req, res) => {
  res.status(200).json({
    status: 'READY',
    upstreamTargets: {
      authService: AUTH_SERVICE_URL,
      userService: USER_SERVICE_URL,
      orderService: ORDER_SERVICE_URL
    }
  });
});

// Prometheus Metrics Endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  const body = [
    '# HELP shopsphere_gateway_requests_total Total number of HTTP requests received by API Gateway',
    '# TYPE shopsphere_gateway_requests_total counter',
    `shopsphere_gateway_requests_total ${metrics.totalRequests}`,
    '# HELP shopsphere_gateway_status_codes Total count by HTTP status class',
    '# TYPE shopsphere_gateway_status_codes counter',
    `shopsphere_gateway_status_codes{status="2xx"} ${metrics.statusCodeCounts['2xx']}`,
    `shopsphere_gateway_status_codes{status="4xx"} ${metrics.statusCodeCounts['4xx']}`,
    `shopsphere_gateway_status_codes{status="5xx"} ${metrics.statusCodeCounts['5xx']}`,
    '# HELP shopsphere_gateway_uptime_seconds API Gateway uptime in seconds',
    '# TYPE shopsphere_gateway_uptime_seconds gauge',
    `shopsphere_gateway_uptime_seconds ${Math.floor(process.uptime())}`
  ].join('\n');
  res.send(body);
});

// JWT Verification & Downstream Header Decoration Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization Bearer header'
    });
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid or expired authentication token'
      });
    }
    // Attach decoded user info to request headers for downstream microservices
    req.user = user;
    next();
  });
};

// Route Helpers with Proxy Middleware
const createServiceProxy = (target, pathRewrite, requireAuth = false) => {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward enriched claims
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.id || req.user.userId || '');
          proxyReq.setHeader('x-user-email', req.user.email || '');
          proxyReq.setHeader('x-user-role', req.user.role || 'customer');
        }
        if (req.headers['x-request-id']) {
          proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
        }
      },
      error: (err, req, res) => {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          service: 'api-gateway',
          level: 'ERROR',
          message: 'Upstream Proxy Error',
          target,
          error: err.message
        }));
        if (!res.headersSent) {
          res.status(502).json({
            error: 'Bad Gateway',
            message: `Failed to communicate with upstream service at ${target}`,
            details: err.message
          });
        }
      }
    }
  });

  return requireAuth ? [authenticateToken, proxy] : [proxy];
};

// --- Proxy Routing Rules ---
// 1. Auth Service Routes (/api/auth/* -> /*)
app.use('/api/auth', ...createServiceProxy(AUTH_SERVICE_URL, { '^/api/auth': '' }, false));

// 2. User Service Routes (/api/users/* -> /*)
app.use('/api/users', ...createServiceProxy(USER_SERVICE_URL, { '^/api/users': '' }, false));

// 3. Order Service Routes (/api/orders/* -> /*)
app.use('/api/orders', ...createServiceProxy(ORDER_SERVICE_URL, { '^/api/orders': '' }, false));

// 404 Fallback
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route Not Found',
    path: req.originalUrl,
    availableRoutes: ['/api/auth/*', '/api/users/*', '/api/orders/*', '/health', '/metrics']
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    level: 'CRITICAL',
    message: 'Unhandled Exception',
    error: err.message,
    stack: NODE_ENV === 'development' ? err.stack : undefined
  }));
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred in the gateway.'
  });
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    level: 'INFO',
    message: `ShopSphere API Gateway started successfully on port ${PORT}`,
    env: NODE_ENV,
    routes: {
      auth: AUTH_SERVICE_URL,
      user: USER_SERVICE_URL,
      order: ORDER_SERVICE_URL
    }
  }));
});

// Graceful Shutdown
const handleShutdown = (signal) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'api-gateway',
    level: 'INFO',
    message: `Received ${signal}, initiating graceful shutdown...`
  }));
  server.close(() => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
      level: 'INFO',
      message: 'Closed all active gateway connections. Exiting process.'
    }));
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
