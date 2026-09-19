/**
 * ShopSphere - User Service
 * User Profiles, Address Books, Account Preferences & Identity Details
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5002;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopsphere';
const JWT_SECRET = process.env.JWT_SECRET || 'shopsphere-super-secure-jwt-production-secret-key-32chars';

app.use(express.json());
app.use(cors());

// Structured logging helper
const log = (level, message, meta = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'user-service',
    level,
    message,
    ...meta
  }));
};

// User Mongoose Model (pointing to existing 'users' collection)
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['customer', 'admin', 'manager'], default: 'customer' },
  phone: { type: String, default: '' },
  bio: { type: String, default: '' },
  avatarUrl: { type: String, default: '' },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'US' }
  },
  preferences: {
    newsletter: { type: Boolean, default: true },
    currency: { type: String, default: 'USD' }
  },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    log('INFO', 'MongoDB connected successfully for User Service');
  } catch (err) {
    log('ERROR', 'MongoDB connection failed for User Service', { error: err.message });
  }
};
connectDB();

// Middleware to extract authenticated user claims
const authenticateClaims = (req, res, next) => {
  // Check headers passed by API Gateway
  const gatewayUserId = req.headers['x-user-id'];
  const gatewayUserEmail = req.headers['x-user-email'];
  const gatewayUserRole = req.headers['x-user-role'];

  if (gatewayUserId) {
    req.user = {
      id: gatewayUserId,
      email: gatewayUserEmail,
      role: gatewayUserRole
    };
    return next();
  }

  // Fallback direct JWT check if hit directly without gateway
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      log('WARN', 'Direct JWT validation failed in User Service', { error: err.message });
    }
  }

  next();
};

app.use(authenticateClaims);

// --- Health Probes ---
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  res.status(dbStatus === 'CONNECTED' ? 200 : 503).json({
    status: dbStatus === 'CONNECTED' ? 'UP' : 'DEGRADED',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

app.get('/live', (req, res) => res.status(200).json({ status: 'ALIVE' }));
app.get('/ready', (req, res) => {
  if (mongoose.connection.readyState === 1) {
    return res.status(200).json({ status: 'READY' });
  }
  return res.status(503).json({ status: 'NOT_READY' });
});

// GET /profile/me or /me - Retrieve current logged-in user profile
const getMeHandler = async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required to access profile.'
    });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found.'
      });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        address: user.address,
        preferences: user.preferences,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    log('ERROR', 'Failed to fetch current user profile', { error: err.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.get('/me', getMeHandler);
app.get('/profile/me', getMeHandler);

// GET /:id or /users/:id - Retrieve user by ID
const getUserByIdHandler = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid user ID format.'
    });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found.'
      });
    }

    // Role check: Only admin or the user themselves can see full private details
    const isSelfOrAdmin = req.user && (req.user.id === id || req.user.role === 'admin');

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: isSelfOrAdmin ? user.email : undefined,
        role: user.role,
        phone: isSelfOrAdmin ? user.phone : undefined,
        address: isSelfOrAdmin ? user.address : undefined,
        bio: user.bio,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    log('ERROR', 'Error fetching user by ID', { id, error: err.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.get('/:id', getUserByIdHandler);
app.get('/users/:id', getUserByIdHandler);

// PUT /:id or /users/:id - Update user profile
const updateUserHandler = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid user ID format.'
    });
  }

  // Authorization check: User can only update their own profile unless admin
  if (req.user && req.user.id !== id && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You are not authorized to update this profile.'
    });
  }

  const { name, phone, bio, avatarUrl, address, preferences } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User profile not found.'
      });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (address) {
      user.address = {
        ...user.address,
        ...address
      };
    }
    if (preferences) {
      user.preferences = {
        ...user.preferences,
        ...preferences
      };
    }
    user.updatedAt = new Date();

    await user.save();
    log('INFO', 'User profile updated successfully', { id: user._id });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        address: user.address,
        preferences: user.preferences,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    log('ERROR', 'Error updating user profile', { id, error: err.message });
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
};

app.put('/:id', updateUserHandler);
app.put('/users/:id', updateUserHandler);

// Metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send([
    '# HELP shopsphere_user_uptime_seconds User Service uptime',
    '# TYPE shopsphere_user_uptime_seconds gauge',
    `shopsphere_user_uptime_seconds ${Math.floor(process.uptime())}`,
    '# HELP shopsphere_user_db_connected MongoDB connected status',
    '# TYPE shopsphere_user_db_connected gauge',
    `shopsphere_user_db_connected ${mongoose.connection.readyState === 1 ? 1 : 0}`
  ].join('\n'));
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  log('INFO', `ShopSphere User Service running on port ${PORT}`, { env: NODE_ENV });
});

// Graceful Shutdown
const shutdown = (sig) => {
  log('INFO', `Received ${sig}, shutting down User Service`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
    } catch (e) {}
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
