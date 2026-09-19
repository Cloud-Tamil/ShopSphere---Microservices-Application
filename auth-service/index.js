/**
 * ShopSphere - Auth Service
 * User Registration, Secure Authentication, Password Hashing & JWT Validation
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopsphere';
const JWT_SECRET = process.env.JWT_SECRET || 'shopsphere-super-secure-jwt-production-secret-key-32chars';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

app.use(express.json());
app.use(cors());

// Structured logging helper
const log = (level, message, meta = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    level,
    message,
    ...meta
  }));
};

// User Schema with Security Best Practices
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    index: true,
    validate: [validator.isEmail, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Never return password in queries by default
  },
  role: {
    type: String,
    enum: ['customer', 'admin', 'manager'],
    default: 'customer'
  },
  phone: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: 'US' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook: Hash password securely
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method for password comparison
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Database Connection with Auto-reconnect
let isDbConnected = false;
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    isDbConnected = true;
    log('INFO', 'MongoDB connected successfully for Auth Service', { uri: MONGO_URI.replace(/\/\/.*@/, '//***@') });
  } catch (err) {
    isDbConnected = false;
    log('ERROR', 'MongoDB connection failed for Auth Service', { error: err.message });
  }
};

mongoose.connection.on('disconnected', () => {
  isDbConnected = false;
  log('WARN', 'MongoDB disconnected from Auth Service');
});
mongoose.connection.on('connected', () => {
  isDbConnected = true;
});

connectDB();

// Helper: Generate JWT
const signToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// --- Routes ---

// Health & Probe Endpoints
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  res.status(dbStatus === 'CONNECTED' ? 200 : 503).json({
    status: dbStatus === 'CONNECTED' ? 'UP' : 'DEGRADED',
    service: 'auth-service',
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
  return res.status(503).json({ status: 'NOT_READY', reason: 'Database not connected' });
});

// POST /register - Register a new user
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name, email, and password are required fields.'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Password must be at least 6 characters in length.'
      });
    }

    // Check existing email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists.'
      });
    }

    // Create user (restrict role elevation unless explicitly authorized)
    const userRole = role === 'admin' ? 'admin' : 'customer';

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      phone: phone || '',
      address: address || {}
    });

    const token = signToken(newUser);

    log('INFO', 'User registered successfully', { userId: newUser._id, email: newUser.email, role: newUser.role });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        address: newUser.address
      }
    });
  } catch (err) {
    log('ERROR', 'Error during user registration', { error: err.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to complete user registration.'
    });
  }
});

// POST /login - Authenticate user & return JWT
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Email and password are required.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      log('WARN', 'Failed login attempt', { email: email.toLowerCase() });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.'
      });
    }

    const token = signToken(user);
    log('INFO', 'User logged in successfully', { userId: user._id, email: user.email });

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address
      }
    });
  } catch (err) {
    log('ERROR', 'Error during user login', { error: err.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process login request.'
    });
  }
});

// POST /validate - Validate JWT token authenticity
app.post('/validate', (req, res) => {
  const authHeader = req.headers['authorization'] || req.body.token;
  let token = authHeader;
  if (token && token.startsWith('Bearer ')) {
    token = token.split(' ')[1];
  }

  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token is required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ valid: false, error: err.message });
    }
    return res.status(200).json({ valid: true, user: decoded });
  });
});

// Metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send([
    '# HELP shopsphere_auth_uptime_seconds Auth Service uptime',
    '# TYPE shopsphere_auth_uptime_seconds gauge',
    `shopsphere_auth_uptime_seconds ${Math.floor(process.uptime())}`,
    '# HELP shopsphere_auth_db_connected Database connection status (1 = connected, 0 = disconnected)',
    '# TYPE shopsphere_auth_db_connected gauge',
    `shopsphere_auth_db_connected ${mongoose.connection.readyState === 1 ? 1 : 0}`
  ].join('\n'));
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  log('INFO', `ShopSphere Auth Service running on port ${PORT}`, { env: NODE_ENV });
});

// Graceful Shutdown
const shutdown = (sig) => {
  log('INFO', `Received ${sig}, shutting down Auth Service`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
      log('INFO', 'MongoDB connection closed.');
    } catch (e) {}
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
