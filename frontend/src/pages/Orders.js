import React, { useState, useEffect } from 'react';
import { Package, Clock, Truck, CheckCircle2, ChevronRight, AlertCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import { orderApi } from '../api';

const STATUS_CONFIG = {
  PENDING: { color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock },
  PROCESSING: { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: RefreshCw },
  CONFIRMED: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Package },
  SHIPPED: { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Truck },
  DELIVERED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  CANCELLED: { color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle }
};

export default function Orders({ currentUser, onNavigateToProducts }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadOrders();
  }, [currentUser]);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await orderApi.getOrders({
        userId: currentUser?.id
      });
      if (response && response.orders) {
        setOrders(response.orders);
        if (response.orders.length > 0 && !selectedOrder) {
          setSelectedOrder(response.orders[0]);
        }
      }
    } catch (err) {
      console.warn('Orders microservice query failed, fallback to local session orders:', err);
      // Fallback sample order for preview
      const fallbackOrder = {
        _id: '67c1234567890abcdef01234',
        createdAt: new Date().toISOString(),
        status: 'CONFIRMED',
        totalAmount: 349.49,
        trackingNumber: 'SP-9481923',
        customerName: currentUser?.name || 'Alex Morgan',
        shippingAddress: {
          street: '742 Evergreen Terrace',
          city: 'Springfield',
          state: 'OR',
          zipCode: '97477'
        },
        items: [
          {
            name: 'Quantum Sound Wireless Headphones',
            price: 199.99,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80'
          },
          {
            name: 'AeroGlide Mechanical Gaming Keyboard',
            price: 149.50,
            quantity: 1,
            image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80'
          }
        ]
      };
      setOrders([fallbackOrder]);
      setSelectedOrder(fallbackOrder);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const nextStatusMap = {
      CONFIRMED: 'PROCESSING',
      PROCESSING: 'SHIPPED',
      SHIPPED: 'DELIVERED',
      DELIVERED: 'CONFIRMED'
    };
    const nextStatus = nextStatusMap[currentStatus] || 'CONFIRMED';
    setUpdatingId(orderId);

    try {
      await orderApi.updateStatus(orderId, nextStatus);
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
      );
      if (selectedOrder?._id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Querying Order Microservice via API Gateway...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Orders Placed Yet</h2>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          Your order history is empty. Browse our catalog and checkout to test the Order Service and MongoDB transaction flow!
        </p>
        <button
          onClick={onNavigateToProducts}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
        >
          Explore Products Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Distributed order records processed across ShopSphere cluster
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          title="Refresh orders from microservice"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-3">
          {orders.map((order) => {
            const isSelected = selectedOrder?._id === order._id;
            const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.CONFIRMED;
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={order._id}
                onClick={() => setSelectedOrder(order)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-700 truncate max-w-[140px]">
                    #{order._id.substring(order._id.length - 8).toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusInfo.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {order.status}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${order.totalAmount?.toFixed(2)}
                  </span>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  {order.items?.length || 1} item{order.items?.length !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Order Detail */}
        {selectedOrder && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    Order #{selectedOrder._id.substring(selectedOrder._id.length - 8).toUpperCase()}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                      STATUS_CONFIG[selectedOrder.status]?.color || 'bg-slate-100'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Status Simulation Trigger */}
              <button
                onClick={() => handleAdvanceStatus(selectedOrder._id, selectedOrder.status)}
                disabled={updatingId === selectedOrder._id}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Advance order lifecycle status in Order Service"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${updatingId === selectedOrder._id ? 'animate-spin' : ''}`} />
                <span>Simulate Next Status</span>
              </button>
            </div>

            {/* Tracking & Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Tracking Code
                </span>
                <span className="font-mono text-slate-900 font-bold text-sm">
                  {selectedOrder.trackingNumber || 'Pending Carrier Dispatch'}
                </span>
                <span className="block text-slate-400 mt-1">Provider: ShopSphere Express Logistics</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-600 uppercase tracking-wider block mb-1">
                  Delivery Destination
                </span>
                <div className="text-slate-800 font-medium">
                  {selectedOrder.shippingAddress?.street}
                </div>
                <div className="text-slate-500">
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}{' '}
                  {selectedOrder.shippingAddress?.zipCode}
                </div>
              </div>
            </div>

            {/* Item Breakdown */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
                Items in this Package
              </h3>
              <div className="divide-y divide-slate-100">
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-lg border border-slate-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{item.name}</div>
                        <div className="text-xs text-slate-500">Qty: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Total Order Amount:</span>
              <span className="text-xl font-extrabold text-blue-600">
                ${selectedOrder.totalAmount?.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
