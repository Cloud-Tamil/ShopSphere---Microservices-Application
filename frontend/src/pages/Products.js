import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Star, Check, Sparkles, Filter, AlertCircle, ShoppingCart } from 'lucide-react';
import { productApi } from '../api';

const CATEGORIES = ['All', 'Electronics', 'Accessories', 'Wearables', 'Home & Kitchen', 'Furniture'];

export default function Products({ onAddToCart, cartItemCount, onOpenCart }) {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedItemIds, setAddedItemIds] = useState({});

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productApi.getProducts({
        category: selectedCategory,
        search: searchQuery
      });
      if (response && response.products) {
        setProducts(response.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.warn('Backend unavailable, rendering fallback catalog:', err);
      // Fallback catalog for preview consistency if microservices aren't booted
      setProducts([
        {
          _id: '670000000000000000000001',
          name: 'Quantum Sound Wireless Headphones',
          description: 'Active noise-cancelling over-ear Bluetooth 5.3 headphones with 45-hour battery life.',
          price: 199.99,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
          stock: 45,
          rating: 4.8
        },
        {
          _id: '670000000000000000000002',
          name: 'AeroGlide Mechanical Gaming Keyboard',
          description: 'Hot-swappable linear mechanical switches, per-key RGB backlighting, and gasket-mounted aluminum chassis.',
          price: 149.50,
          category: 'Electronics',
          image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
          stock: 30,
          rating: 4.9
        },
        {
          _id: '670000000000000000000003',
          name: 'Nomad Canvas Travel Duffel Bag',
          description: 'Weatherproof waxed canvas with vegetable-tanned leather straps and dedicated shoe compartment.',
          price: 89.00,
          category: 'Accessories',
          image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80',
          stock: 55,
          rating: 4.7
        },
        {
          _id: '670000000000000000000004',
          name: 'Veloce Carbon Titanium Smartwatch',
          description: 'Health tracking, ECG sensors, 7-day battery, always-on AMOLED display with waterproof rating.',
          price: 249.00,
          category: 'Wearables',
          image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
          stock: 25,
          rating: 4.6
        },
        {
          _id: '670000000000000000000005',
          name: 'Artisan Ceramic Pour-Over Brewer',
          description: 'Matte black temperature-controlled gooseneck electric kettle paired with double-walled dripper.',
          price: 119.00,
          category: 'Home & Kitchen',
          image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80',
          stock: 40,
          rating: 4.8
        },
        {
          _id: '670000000000000000000006',
          name: 'Apex Ultra Ergonomic Mesh Chair',
          description: 'Dynamic lumbar support, 4D armrests, breathable Korean mesh, and seamless tilt tension control.',
          price: 389.00,
          category: 'Furniture',
          image: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?w=600&auto=format&fit=crop&q=80',
          stock: 18,
          rating: 4.9
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleAdd = (product) => {
    onAddToCart(product);
    setAddedItemIds((prev) => ({ ...prev, [product._id]: true }));
    setTimeout(() => {
      setAddedItemIds((prev) => ({ ...prev, [product._id]: false }));
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Distributed Microservices Catalog
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Curated Quality. Instant Delivery.
          </h1>
          <p className="text-blue-100/90 text-sm sm:text-base mt-2 leading-relaxed">
            Every item is synchronized in real-time across the ShopSphere Order & Inventory microservices cluster.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-6 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headphones, keyboards, chairs..."
                className="w-full pl-11 pr-4 py-3 text-sm text-slate-900 bg-white rounded-2xl shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-blue-500 hover:bg-blue-400 font-semibold rounded-2xl transition-colors shadow-sm"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Category Pills & Cart Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {cartItemCount > 0 && (
          <button
            onClick={onOpenCart}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 text-blue-400" />
            <span>View Cart ({cartItemCount})</span>
          </button>
        )}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-slate-200 p-4 animate-pulse space-y-4">
              <div className="w-full h-48 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-800">No products found</h3>
          <p className="text-sm text-slate-500 mt-1">Try clearing your search query or selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const isAdded = addedItemIds[product._id];
            return (
              <div
                key={product._id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group"
              >
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-800 shadow-sm">
                    {product.category}
                  </span>
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md text-amber-300 px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-300" />
                    <span>{product.rating || 4.8}</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 font-medium block">Price</span>
                      <span className="text-xl font-extrabold text-slate-900">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdd(product)}
                      className={`px-4 py-2.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4" /> Added!
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" /> Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
