import { Product, MicroserviceInfo, Order } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    name: 'Quantum Sound Wireless Headphones',
    description: 'Active noise cancellation with 40-hour battery life and spatial audio driver.',
    price: 199.99,
    category: 'Audio',
    stock: 45,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-002',
    name: 'AeroGlide Mechanical Gaming Keyboard',
    description: 'Hot-swappable tactile mechanical switches with per-key RGB backlighting.',
    price: 149.50,
    category: 'Peripherals',
    stock: 30,
    image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-003',
    name: 'Apex Precision 4K Ultra-Wide Monitor',
    description: '34-inch curved IPS panel with 144Hz refresh rate, HDR400, and USB-C 90W PD.',
    price: 649.00,
    category: 'Displays',
    stock: 15,
    image: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-004',
    name: 'PulseTrack GPS Smart Fitness Watch',
    description: 'Bio-sensor heart rate monitor, VO2 max estimation, sleep tracking, and 5ATM water resistance.',
    price: 249.95,
    category: 'Wearables',
    stock: 60,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-005',
    name: 'ErgoComfort Executive Mesh Chair',
    description: 'Dynamic lumbar support, 4D adjustable armrests, breathable mesh, and aluminum base.',
    price: 389.00,
    category: 'Furniture',
    stock: 12,
    image: 'https://images.unsplash.com/photo-1580481077195-c3a82145d875?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'prod-006',
    name: 'VoltStream 100W GaN Fast Charger',
    description: 'Ultra-compact 3-port GaN power adapter capable of fast-charging laptops, tablets, and phones.',
    price: 49.99,
    category: 'Accessories',
    stock: 120,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80'
  }
];

export const MICROSERVICES: MicroserviceInfo[] = [
  {
    name: 'API Gateway',
    key: 'gateway',
    port: 8000,
    status: 'HEALTHY',
    latencyMs: 12,
    description: 'Central edge reverse proxy, JWT bearer validation, rate limiting & CORS headers',
    endpoint: '/api/*',
    uptime: '99.98%',
    version: 'v1.0.0'
  },
  {
    name: 'Auth Service',
    key: 'auth',
    port: 5001,
    status: 'HEALTHY',
    latencyMs: 24,
    description: 'User registration, credential hashing with bcrypt (10 rounds), signed JWT tokens',
    endpoint: '/api/auth/*',
    uptime: '99.99%',
    version: 'v1.0.0'
  },
  {
    name: 'User Service',
    key: 'user',
    port: 5002,
    status: 'HEALTHY',
    latencyMs: 18,
    description: 'Customer profiles, delivery addresses, account preferences & profile updates',
    endpoint: '/api/users/*',
    uptime: '99.95%',
    version: 'v1.0.0'
  },
  {
    name: 'Order Service',
    key: 'order',
    port: 5003,
    status: 'HEALTHY',
    latencyMs: 31,
    description: 'Catalog products, checkout cart processing, order lifecycle tracking & inventory',
    endpoint: '/api/orders/*',
    uptime: '99.99%',
    version: 'v1.0.0'
  },
  {
    name: 'MongoDB Cluster',
    key: 'mongo',
    port: 27017,
    status: 'HEALTHY',
    latencyMs: 5,
    description: 'Document database with persistent volumes, users, products and orders collections',
    endpoint: 'mongodb://mongo:27017',
    uptime: '100%',
    version: 'v7.0'
  },
  {
    name: 'Prometheus TSDB',
    key: 'prometheus',
    port: 9090,
    status: 'HEALTHY',
    latencyMs: 8,
    description: 'Time-series metrics scraper collecting /metrics across all pod endpoints every 15s',
    endpoint: 'http://prometheus:9090',
    uptime: '99.99%',
    version: 'v2.50'
  }
];

export const INITIAL_SAMPLE_ORDERS: Order[] = [
  {
    id: 'ORD-98214-A',
    userId: 'user-001',
    customerName: 'Alex Morgan',
    customerEmail: 'alex.morgan@example.com',
    items: [
      {
        productId: 'prod-001',
        name: 'Quantum Sound Wireless Headphones',
        price: 199.99,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
      },
      {
        productId: 'prod-006',
        name: 'VoltStream 100W GaN Fast Charger',
        price: 49.99,
        quantity: 2,
        image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80'
      }
    ],
    totalAmount: 299.97,
    status: 'CONFIRMED',
    trackingNumber: 'SP-9481923-US',
    shippingAddress: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      zipCode: '97477',
      country: 'US'
    },
    paymentMethod: 'CREDIT_CARD',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];
