import React, { useState } from 'react';
import { Package, Clock, Truck, CheckCircle2, ChevronRight, RefreshCw, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface OrderHistoryProps {
  orders: Order[];
  onAdvanceOrderStatus: (orderId: string) => void;
  onExploreCatalog: () => void;
}

const STATUS_MAP: Record<OrderStatus, { label: string; color: string; step: number }> = {
  PENDING: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200', step: 1 },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border-blue-200', step: 2 },
  PROCESSING: { label: 'Processing', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', step: 3 },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-50 text-purple-700 border-purple-200', step: 4 },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', step: 5 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200', step: 0 }
};

export const OrderHistory: React.FC<OrderHistoryProps> = ({
  orders,
  onAdvanceOrderStatus,
  onExploreCatalog
}) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  if (orders.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto my-8 shadow-xs">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">No Orders Found</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm mx-auto">
          Add items to your cart and complete checkout to test MongoDB transactions, order event logging, and status transitions.
        </p>
        <button
          onClick={onExploreCatalog}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-xs"
        >
          Explore Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Order Lifecycle Tracker</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Distributed order records processed across ShopSphere microservices
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Orders Selection List */}
        <div className="lg:col-span-1 space-y-3">
          {orders.map((order) => {
            const isSelected = order.id === selectedOrder?.id;
            const statusConfig = STATUS_MAP[order.status] || STATUS_MAP.CONFIRMED;

            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrderId(order.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-slate-900">
                    #{order.id}
                  </span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  <span className="font-bold text-slate-900 text-sm">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="mt-2 text-[11px] text-slate-400">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''} • {order.paymentMethod}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Order Detail Card */}
        {selectedOrder && (
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold text-slate-900">
                    Order #{selectedOrder.id}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      STATUS_MAP[selectedOrder.status]?.color || 'bg-slate-100'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString()} by {selectedOrder.customerName}
                </p>
              </div>

              {/* Status Simulation Button */}
              <button
                onClick={() => onAdvanceOrderStatus(selectedOrder.id)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Advance to next status in order lifecycle"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Simulate Next Lifecycle Status</span>
              </button>
            </div>

            {/* Lifecycle Progress Bar */}
            <div className="py-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                <span className={STATUS_MAP[selectedOrder.status]?.step >= 2 ? 'text-blue-600 font-bold' : ''}>
                  1. Confirmed
                </span>
                <span className={STATUS_MAP[selectedOrder.status]?.step >= 3 ? 'text-blue-600 font-bold' : ''}>
                  2. Processing
                </span>
                <span className={STATUS_MAP[selectedOrder.status]?.step >= 4 ? 'text-blue-600 font-bold' : ''}>
                  3. Shipped
                </span>
                <span className={STATUS_MAP[selectedOrder.status]?.step >= 5 ? 'text-emerald-600 font-bold' : ''}>
                  4. Delivered
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(25, (STATUS_MAP[selectedOrder.status]?.step / 5) * 100))}%`
                  }}
                />
              </div>
            </div>

            {/* Delivery & Tracking Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
                  Carrier Tracking Code
                </span>
                <span className="font-mono text-slate-900 font-bold text-sm">
                  {selectedOrder.trackingNumber}
                </span>
                <span className="block text-slate-400 mt-0.5">Carrier: ShopSphere Logistics Express</span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1 text-[10px]">
                  Delivery Address
                </span>
                <div className="text-slate-800 font-medium">
                  {selectedOrder.shippingAddress.street}
                </div>
                <div className="text-slate-500">
                  {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{' '}
                  {selectedOrder.shippingAddress.zipCode} ({selectedOrder.shippingAddress.country})
                </div>
              </div>
            </div>

            {/* Item Breakdown */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                Items in this Package
              </h4>
              <div className="divide-y divide-slate-100">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-xs text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Quantity: {item.quantity}</div>
                      </div>
                    </div>
                    <div className="text-xs font-black text-slate-900">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Order Amount:</span>
              <span className="text-xl font-black text-blue-600">
                ${selectedOrder.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
