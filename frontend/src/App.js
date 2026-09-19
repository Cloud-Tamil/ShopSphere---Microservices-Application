import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, Package, LogOut, LogIn, Store, ShieldCheck, X, Trash2, ArrowRight } from 'lucide-react';
import Products from './pages/Products';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import { orderApi } from './api';

export default function App() {
  const [currentPage, setCurrentPage] = useState('products');
  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Initial user session hydration from localStorage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('shopsphere_user');
      const token = localStorage.getItem('shopsphere_token');
      if (storedUser && token) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to parse cached user:', e);
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentPage('products');
  };

  const handleLogout = () => {
    localStorage.removeItem('shopsphere_token');
    localStorage.removeItem('shopsphere_user');
    setCurrentUser(null);
    setCurrentPage('products');
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    setCheckoutError('');
    setCheckoutSuccess('');

    if (!currentUser) {
      setIsCartOpen(false);
      setCurrentPage('login');
      return;
    }

    if (cart.length === 0) return;

    setCheckoutLoading(true);
    try {
      const orderPayload = {
        userId: currentUser.id || currentUser._id,
        customerEmail: currentUser.email,
        customerName: currentUser.name,
        shippingAddress: currentUser.address?.street
          ? currentUser.address
          : {
              street: '742 Evergreen Terrace',
              city: 'Springfield',
              state: 'OR',
              zipCode: '97477',
              country: 'US'
            },
        paymentMethod: 'CREDIT_CARD',
        items: cart.map((item) => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        }))
      };

      const response = await orderApi.createOrder(orderPayload);
      setCart([]);
      setCheckoutSuccess(
        `Order #${response.order?._id?.substring(response.order._id.length - 6).toUpperCase()} placed successfully!`
      );
      setTimeout(() => {
        setIsCartOpen(false);
        setCheckoutSuccess('');
        setCurrentPage('orders');
      }, 1500);
    } catch (err) {
      setCheckoutError(err.message || 'Failed to place order. Check Order Service connection.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Global Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <button
            onClick={() => setCurrentPage('products')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black tracking-tight group-hover:bg-blue-700 transition-colors shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">ShopSphere</span>
              <span className="block text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                Microservices Platform
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setCurrentPage('products')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                currentPage === 'products' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Catalog
            </button>
            {currentUser && (
              <>
                <button
                  onClick={() => setCurrentPage('orders')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    currentPage === 'orders' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  My Orders
                </button>
                <button
                  onClick={() => setCurrentPage('profile')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    currentPage === 'profile' ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Profile
                </button>
              </>
            )}
          </nav>

          {/* User & Cart Controls */}
          <div className="flex items-center gap-2.5">
            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="View Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <button
                  onClick={() => setCurrentPage('profile')}
                  className="flex items-center gap-2 py-1.5 px-3 rounded-xl hover:bg-slate-100 text-xs font-semibold text-slate-800 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline">{currentUser.name}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCurrentPage('login')}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'products' && (
          <Products
            onAddToCart={addToCart}
            cartItemCount={cartItemCount}
            onOpenCart={() => setIsCartOpen(true)}
          />
        )}
        {currentPage === 'login' && (
          <Login
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setCurrentPage('register')}
          />
        )}
        {currentPage === 'register' && (
          <Register
            onRegisterSuccess={handleLoginSuccess}
            onNavigateToLogin={() => setCurrentPage('login')}
          />
        )}
        {currentPage === 'profile' && (
          <Profile
            currentUser={currentUser}
            onUpdateUser={(updated) => setCurrentUser(updated)}
          />
        )}
        {currentPage === 'orders' && (
          <Orders
            currentUser={currentUser}
            onNavigateToProducts={() => setCurrentPage('products')}
          />
        )}
      </main>

      {/* Slide-over Cart Drawer */}
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
                  <h2 className="text-base font-bold text-slate-900">Your Shopping Cart</h2>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {checkoutSuccess && (
                <div className="m-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                  {checkoutSuccess}
                </div>
              )}

              {checkoutError && (
                <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {checkoutError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Your cart is empty.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item._id} className="py-4 flex gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-xl border border-slate-200 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-xs text-slate-900 line-clamp-1">{item.name}</div>
                        <div className="text-xs text-blue-600 font-bold mt-1">${item.price.toFixed(2)}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(item._id, -1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="text-xs font-semibold px-2">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, 1)}
                            className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="ml-auto text-slate-400 hover:text-red-500 p-1"
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
                    <span className="font-extrabold text-slate-900 text-lg">${cartTotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2 text-sm shadow-sm transition-all"
                  >
                    {checkoutLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{currentUser ? 'Complete Checkout' : 'Sign In to Checkout'}</span>
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>ShopSphere Microservices Architecture • Node.js, Express, MongoDB, Kubernetes & Argo CD</p>
      </footer>
    </div>
  );
}
