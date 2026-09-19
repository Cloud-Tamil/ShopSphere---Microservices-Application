export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  image: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  trackingNumber: string;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  phone?: string;
  address?: ShippingAddress;
  createdAt: string;
}

export interface MicroserviceInfo {
  name: string;
  key: 'gateway' | 'auth' | 'user' | 'order' | 'mongo' | 'prometheus';
  port: number;
  status: 'HEALTHY' | 'STARTING' | 'DEGRADED';
  latencyMs: number;
  description: string;
  endpoint: string;
  uptime: string;
  version: string;
}
