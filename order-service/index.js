/**
 * ShopSphere - Order Service
 * Order Lifecycle, Checkout Management, Inventory Validation & Products Catalog
 */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5003;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shopsphere';
const JWT_SECRET = process.env.JWT_SECRET || 'shopsphere-super-secure-jwt-production-secret-key-32chars';

app.use(express.json());
app.use(cors());

// Structured logging helper
const log = (level, message, meta = {}) => {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'order-service',
    level,
    message,
    ...meta
  }));
};

// --- MongoDB Schemas & Models ---
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, index: true },
  image: { type: String, required: true },
  stock: { type: Number, required: true, default: 100, min: 0 },
  rating: { type: Number, default: 4.5 },
  reviewsCount: { type: Number, default: 12 }
}, { timestamps: true });

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String }
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  customerEmail: { type: String, required: true },
  customerName: { type: String, required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'US' }
  },
  paymentMethod: {
    type: String,
    enum: ['CREDIT_CARD', 'PAYPAL', 'STRIPE', 'COD'],
    default: 'CREDIT_CARD'
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  trackingNumber: { type: String, default: '' },
  notes: { type: String, default: '' }
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

// Initial Product Catalog Seeder
const seedInitialProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      log('INFO', 'Seeding initial default product catalog into MongoDB...');
      const defaultProducts = [
        {
          name: 'Quantum Sound Wireless Headphones',
          description: 'Active noise-cancelling over-ear Bluetooth 5.3 headphones with 45-hour battery life and spatial audio.',
          price: 199.99,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          stock: 45,
          rating: 4.8,
          reviewsCount: 128
        },
        {
          name: 'AeroGlide Mechanical Gaming Keyboard',
          description: 'Hot-swappable linear mechanical switches, per-key RGB backlighting, and gasket-mounted aluminum chassis.',
          price: 149.50,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
          stock: 30,
          rating: 4.9,
          reviewsCount: 84
        },
        {
          name: 'Nomad Canvas Travel Duffel Bag',
          description: 'Weatherproof waxed canvas with vegetable-tanned leather straps and dedicated shoe compartment.',
          price: 89.00,
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
          stock: 55,
          rating: 4.7,
          reviewsCount: 62
        },
        {
          name: 'Veloce Carbon Titanium Smartwatch',
          description: 'Health tracking, ECG sensors, 7-day battery, always-on AMOLED display with waterproof rating up to 50m.',
          price: 249.00,
          category: 'Wearables',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
          stock: 25,
          rating: 4.6,
          reviewsCount: 95
        },
        {
          name: 'Artisan Ceramic Pour-Over Kettle & Brewer',
          description: 'Matte black temperature-controlled gooseneck electric kettle paired with double-walled dripper.',
          price: 119.00,
          category: 'Home & Kitchen',
          image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
          stock: 40,
          rating: 4.8,
          reviewsCount: 43
        },
        {
          name: 'Apex Ultra Ergonomic Mesh Chair',
          description: 'Dynamic lumbar support, 4D armrests, breathable Korean mesh, and seamless tilt tension control.',
          price: 389.00,
          category: 'Furniture',
          image: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=600&auto=format&fit=crop&q=80',
          stock: 18,
          rating: 4.9,
          reviewsCount: 110
        }
      ];
      await Product.insertMany(defaultProducts);
      log('INFO', `Successfully seeded ${defaultProducts.length} default products.`);
    }
  } catch (err) {
    log('ERROR', 'Error during product seed check', { error: err.message });
  }
};

// Connect DB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    log('INFO', 'MongoDB connected successfully for Order Service');
    await seedInitialProducts();
  } catch (err) {
    log('ERROR', 'MongoDB connection failed for Order Service', { error: err.message });
  }
};
connectDB();

// Extract User Claims
const authenticateClaims = (req, res, next) => {
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

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      return next();
    } catch (err) {
      log('WARN', 'JWT verification failed in Order Service', { error: err.message });
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
    service: 'order-service',
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

// --- Products Endpoints ---
app.get('/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    const products = await Product.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ products });
  } catch (err) {
    log('ERROR', 'Failed to fetch products', { error: err.message });
    return res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(200).json({ product });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
});

// --- Orders Endpoints ---

// POST /orders - Create a new order
const createOrderHandler = async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, notes } = req.body;

    const userId = req.user ? (req.user.id || req.user.userId) : req.body.userId;
    const customerEmail = req.user ? req.user.email : req.body.customerEmail;
    const customerName = req.user ? req.user.name : (req.body.customerName || 'Guest Customer');

    if (!userId || !customerEmail) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication or customer details required to place an order.'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Order must contain at least one item.'
      });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || !shippingAddress.zipCode) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Complete shipping address (street, city, zipCode) is required.'
      });
    }

    // Calculate total and validate products
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ error: 'Each item must have a productId' });
      }

      // Look up product in database if valid ObjectId
      let product = null;
      if (mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findById(item.productId);
      }

      const itemPrice = product ? product.price : (item.price || 0);
      const itemName = product ? product.name : (item.name || 'Custom Product');
      const itemImage = product ? product.image : (item.image || '');
      const itemQty = Math.max(1, parseInt(item.quantity, 10) || 1);

      calculatedTotal += itemPrice * itemQty;
      validatedItems.push({
        productId: product ? product._id : item.productId,
        name: itemName,
        price: itemPrice,
        quantity: itemQty,
        image: itemImage
      });

      // Update product inventory if product exists
      if (product && product.stock >= itemQty) {
        product.stock -= itemQty;
        await product.save();
      }
    }

    // Random mock tracking number for realistic fulfillment flow
    const trackingNumber = 'SP-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    const order = await Order.create({
      userId,
      customerEmail,
      customerName,
      items: validatedItems,
      totalAmount: Math.round(calculatedTotal * 100) / 100,
      shippingAddress,
      paymentMethod: paymentMethod || 'CREDIT_CARD',
      status: 'CONFIRMED',
      trackingNumber,
      notes: notes || ''
    });

    log('INFO', 'Order created successfully', {
      orderId: order._id,
      userId,
      totalAmount: order.totalAmount,
      itemCount: validatedItems.length
    });

    return res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (err) {
    log('ERROR', 'Error creating order', { error: err.message });
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create order.'
    });
  }
};

app.post('/', createOrderHandler);
app.post('/orders', createOrderHandler);

// GET /orders - Retrieve list of orders
const getOrdersHandler = async (req, res) => {
  try {
    const filter = {};

    // If request comes from authenticated non-admin user, restrict to their orders
    if (req.user) {
      if (req.user.role !== 'admin') {
        filter.userId = req.user.id || req.user.userId;
      }
    } else if (req.query.userId) {
      filter.userId = req.query.userId;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      count: orders.length,
      orders
    });
  } catch (err) {
    log('ERROR', 'Error retrieving orders', { error: err.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.get('/', getOrdersHandler);
app.get('/orders', getOrdersHandler);

// GET /orders/:id - Retrieve order by ID
const getOrderByIdHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid order ID format' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Access authorization check
    if (req.user && req.user.role !== 'admin' && order.userId !== (req.user.id || req.user.userId)) {
      return res.status(403).json({ error: 'Forbidden from viewing this order' });
    }

    return res.status(200).json({ order });
  } catch (err) {
    log('ERROR', 'Error fetching order by ID', { error: err.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.get('/:id', getOrderByIdHandler);
app.get('/orders/:id', getOrderByIdHandler);

// PUT /orders/:id/status - Update order status
const updateOrderStatusHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, notes } = req.body;

    const allowedStatuses = ['PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Status must be one of: ${allowedStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (notes) order.notes = notes;

    await order.save();
    log('INFO', 'Order status updated', { orderId: order._id, newStatus: status });

    return res.status(200).json({
      message: 'Order status updated successfully',
      order
    });
  } catch (err) {
    log('ERROR', 'Error updating order status', { error: err.message });
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

app.put('/:id/status', updateOrderStatusHandler);
app.put('/orders/:id/status', updateOrderStatusHandler);

// Metrics
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send([
    '# HELP shopsphere_order_uptime_seconds Order Service uptime',
    '# TYPE shopsphere_order_uptime_seconds gauge',
    `shopsphere_order_uptime_seconds ${Math.floor(process.uptime())}`,
    '# HELP shopsphere_order_db_connected MongoDB connection status',
    '# TYPE shopsphere_order_db_connected gauge',
    `shopsphere_order_db_connected ${mongoose.connection.readyState === 1 ? 1 : 0}`
  ].join('\n'));
});

// Start Server
const server = app.listen(PORT, '0.0.0.0', () => {
  log('INFO', `ShopSphere Order Service running on port ${PORT}`, { env: NODE_ENV });
});

// Shutdown
const shutdown = (sig) => {
  log('INFO', `Received ${sig}, shutting down Order Service`);
  server.close(async () => {
    try {
      await mongoose.connection.close(false);
    } catch (e) {}
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
