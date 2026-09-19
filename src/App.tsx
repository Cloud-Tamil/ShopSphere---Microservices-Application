import React, { useState } from 'react';
import {
  Store,
  ShoppingCart,
  Layers,
  Clock,
  User as UserIcon,
  LogOut,
  X,
  Trash2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Product, CartItem, Order, User } from './types';
import { INITIAL_PRODUCTS, MICROSERVICES, INITIAL_SAMPLE_ORDERS } from './data/mockData';
import { Storefront } from './components/Storefront';
import { OrderHistory } from './components/OrderHistory';
import { DevOpsDashboard } from './components/DevOpsDashboard';
import { AuthModal } from './components/AuthModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'store' | 'orders' | 'devops'>('store');
  const [products] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_SAMPLE_ORDERS);
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 'user-001',
    name: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    role: 'customer',
    address: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      zipCode: '97477',
      country: 'US'
    },
    createdAt: new Date().toISOString()
  });

  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutSuccessMessage, setCheckoutSuccessMessage] = useState<string | null>(null);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartItemIds = new Set(cart.map((item) => item.id));

  // Checkout simulation
  const handleCheckout = () => {
    if (!currentUser) {
      setIsCartOpen(false);
      setIsAuthOpen(true);
      return;
    }

    if (cart.length === 0) return;

    setCheckoutLoading(true);

    setTimeout(() => {
      const newOrder: Order = {
        id: `ORD-${Math.floor(10000 + Math.random() * 90000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
        userId: currentUser.id,
        customerName: currentUser.name,
        customerEmail: currentUser.email,
        items: cart.map((c) => ({
          productId: c.id,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          image: c.image
        })),
        totalAmount: cartTotal,
        status: 'CONFIRMED',
        trackingNumber: `SP-${Math.floor(1000000 + Math.random() * 9000000)}-US`,
        shippingAddress: currentUser.address || {
          street: '100 Innovation Way',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          country: 'US'
        },
        paymentMethod: 'CREDIT_CARD',
        createdAt: new Date().toISOString()
      };

      setOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      setCheckoutLoading(false);
      setCheckoutSuccessMessage(`Order #${newOrder.id} confirmed!`);

      setTimeout(() => {
        setCheckoutSuccessMessage(null);
        setIsCartOpen(false);
        setActiveTab('orders');
      }, 1200);
    }, 800);
  };

  const handleAdvanceOrderStatus = (orderId: string) => {
    const nextStatusMap: Record<string, 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CONFIRMED'> = {
      CONFIRMED: 'PROCESSING',
      PROCESSING: 'SHIPPED',
      SHIPPED: 'DELIVERED',
      DELIVERED: 'CONFIRMED'
    };

    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const next = nextStatusMap[order.status] || 'CONFIRMED';
          return { ...order, status: next };
        }
        return order;
      })
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">ShopSphere</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-200">
                Microservices Platform
              </span>
            </div>
          </div>

          {/* Navigation Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('store')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'store'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Storefront</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'orders'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Orders ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('devops')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'devops'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>DevOps Hub</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2.5">
            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              aria-label="View shopping cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Auth / User Profile */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-800">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser.name.charAt(0)}
                  </div>
                  <span className="hidden md:inline">{currentUser.name}</span>
                </div>
                <button
                  onClick={() => setCurrentUser(null)}
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'store' && (
          <Storefront
            products={products}
            onAddToCart={handleAddToCart}
            cartItemIds={cartItemIds}
          />
        )}

        {activeTab === 'orders' && (
          <OrderHistory
            orders={orders}
            onAdvanceOrderStatus={handleAdvanceOrderStatus}
            onExploreCatalog={() => setActiveTab('store')}
          />
        )}

        {activeTab === 'devops' && (
          <DevOpsDashboard microservices={MICROSERVICES} />
        )}
      </main>

      {/* Slide-over Shopping Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsCartOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Your Cart</h3>
                  <span className="text-xs text-slate-400">({cartItemCount} items)</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {checkoutSuccessMessage && (
                <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{checkoutSuccessMessage}</span>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold">Your shopping cart is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="py-4 flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{item.name}</div>
                        <div className="text-xs text-blue-600 font-extrabold mt-0.5">
                          ${item.price.toFixed(2)}
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="text-xs font-bold px-2">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>

                          <button
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="ml-auto text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600">Subtotal</span>
                    <span className="font-black text-slate-900 text-lg">${cartTotal.toFixed(2)}</span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-xs shadow-xs transition-all"
                  >
                    {checkoutLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Complete Order</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthOpen(false);
        }}
      />

      {/* Platform Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>ShopSphere Microservices Architecture • Node.js, Express, MongoDB, Kubernetes, Argo CD, Jenkins & Terraform</p>
      </footer>
    </div>
  );
}
