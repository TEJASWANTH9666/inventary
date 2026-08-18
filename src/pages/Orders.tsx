import { useMemo, useState } from 'react';
import { Search, Clock, ChevronRight, AlertTriangle, ArrowLeft, Ban, GitBranch } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { PriorityBadge, RiskBadge, OrderStatusBadge } from '@/components/Badges';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { determineAllocation } from '@/lib/engine';
import type { Order } from '@/types';
import type { Page } from '@/components/Layout';

export function OrdersPage({ setPage }: { setPage: (p: Page) => void }) {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    let result = [...state.orders];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(o => o.id.includes(q) || o.customer.toLowerCase().includes(q) || o.items.some(i => i.sku.toLowerCase().includes(q)));
    }
    if (priorityFilter !== 'all') result = result.filter(o => o.priority === priorityFilter);
    if (statusFilter === 'active') result = result.filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status));
    else if (statusFilter === 'completed') result = result.filter(o => ['COMPLETED', 'DISPATCHED'].includes(o.status));
    return result.sort((a, b) => b.priorityScore - a.priorityScore);
  }, [state.orders, search, priorityFilter, statusFilter]);

  const stats = useMemo(() => {
    const active = state.orders.filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status));
    return {
      total: state.orders.length,
      active: active.length,
      critical: active.filter(o => o.priority === 'CRITICAL').length,
      atRisk: active.filter(o => o.riskLevel === 'HIGH' || o.riskLevel === 'CRITICAL').length,
    };
  }, [state.orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Order Management</h1>
        <p className="text-sm text-slate-400 mt-1">Priority-scored orders with real-time risk analysis</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Total Orders" value={stats.total} color="text-slate-200" />
        <StatChip label="Active" value={stats.active} color="text-blue-400" />
        <StatChip label="Critical Priority" value={stats.critical} color="text-red-400" />
        <StatChip label="At Risk" value={stats.atRisk} color="text-orange-400" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID, customer, SKU..." className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none flex-1" />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'NORMAL'].map(p => (
            <button key={p} onClick={() => setPriorityFilter(p)} className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${priorityFilter === p ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'}`}>
              {p === 'all' ? 'All Priority' : p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['active', 'completed', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${statusFilter === s ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Order</th>
                <th className="text-left px-4 py-3 font-medium">Customer</th>
                <th className="text-left px-4 py-3 font-medium">Items</th>
                <th className="text-center px-4 py-3 font-medium">Priority</th>
                <th className="text-center px-4 py-3 font-medium">Score</th>
                <th className="text-center px-4 py-3 font-medium">Risk</th>
                <th className="text-center px-4 py-3 font-medium">SLA</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-center px-4 py-3 font-medium">Alloc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.slice(0, 50).map(order => {
                const slaHours = (new Date(order.slaDeadline).getTime() - Date.now()) / 3600000;
                const slaOverdue = slaHours < 0;
                const slaSoon = slaHours >= 0 && slaHours < 8;
                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)} className="hover:bg-slate-800/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-blue-400 font-medium">#{order.id}</td>
                    <td className="px-4 py-3 text-sm text-slate-200">{order.customer}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{order.items.map(i => `${i.quantity}× ${i.sku}`).join(', ')}</td>
                    <td className="px-4 py-3 text-center"><PriorityBadge priority={order.priority} /></td>
                    <td className="px-4 py-3 text-center text-sm font-semibold text-slate-300">{order.priorityScore}</td>
                    <td className="px-4 py-3 text-center"><RiskBadge level={order.riskLevel} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${slaOverdue ? 'text-red-400' : slaSoon ? 'text-amber-400' : 'text-slate-400'}`}>
                        {slaOverdue ? `${Math.abs(Math.round(slaHours))}h over` : `${Math.round(slaHours)}h`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><OrderStatusBadge status={order.status} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${order.allocationStatus === 'FULL' ? 'text-emerald-400' : order.allocationStatus === 'PARTIAL' ? 'text-amber-400' : order.allocationStatus === 'HOLD' ? 'text-red-400' : 'text-slate-500'}`}>
                        {order.allocationStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-12 text-center text-sm text-slate-500">No orders match your filters</div>}
        {filtered.length > 50 && <div className="py-3 text-center text-xs text-slate-500">Showing top 50 of {filtered.length} orders</div>}
      </div>

      <Modal open={!!selectedOrder} onClose={() => setSelectedOrder(null)} title={`Order #${selectedOrder?.id}`} size="lg">
        {selectedOrder && <OrderDetail order={selectedOrder} setPage={setPage} onAllocate={() => { dispatch({ type: 'OVERRIDE_ALLOCATION', orderId: selectedOrder.id }); toast('success', `Allocation overridden for Order #${selectedOrder.id}`); setSelectedOrder(null); }} onCancel={() => { dispatch({ type: 'CANCEL_ORDER', orderId: selectedOrder.id }); toast('info', `Order #${selectedOrder.id} cancelled`); setSelectedOrder(null); }} />}
      </Modal>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="glass-card rounded-xl p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p></div>;
}

function OrderDetail({ order, setPage, onAllocate, onCancel }: { order: Order; setPage: (p: Page) => void; onAllocate: () => void; onCancel: () => void }) {
  const { state } = useStore();
  const alloc = useMemo(() => determineAllocation(order, state.inventory, state.orders), [order, state.inventory, state.orders]);
  const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / 3600000;
  const slaHours = (new Date(order.slaDeadline).getTime() - Date.now()) / 3600000;

  const timeline = [
    { label: 'Created', done: true, time: new Date(order.createdAt).toLocaleString() },
    { label: 'Priority Analyzed', done: order.priorityScore > 0, time: 'Auto-calculated' },
    { label: 'Allocated', done: ['ALLOCATED', 'PARTIAL_ALLOCATED', 'PICKING', 'PICKED', 'PACKING', 'PACKED', 'QC_PENDING', 'READY_DISPATCH', 'DISPATCHED', 'COMPLETED'].includes(order.status), time: order.allocationStatus !== 'NONE' ? order.allocationStatus : 'Pending' },
    { label: 'Picking', done: ['PICKING', 'PICKED', 'PACKING', 'PACKED', 'QC_PENDING', 'READY_DISPATCH', 'DISPATCHED', 'COMPLETED'].includes(order.status), time: '' },
    { label: 'Picked', done: ['PICKED', 'PACKING', 'PACKED', 'QC_PENDING', 'READY_DISPATCH', 'DISPATCHED', 'COMPLETED'].includes(order.status), time: '' },
    { label: 'Packing', done: ['PACKING', 'PACKED', 'QC_PENDING', 'READY_DISPATCH', 'DISPATCHED', 'COMPLETED'].includes(order.status), time: '' },
    { label: 'Quality Check', done: ['QC_PENDING', 'READY_DISPATCH', 'DISPATCHED', 'COMPLETED'].includes(order.status), time: '' },
    { label: 'Dispatched', done: ['DISPATCHED', 'COMPLETED'].includes(order.status), time: '' },
    { label: 'Completed', done: order.status === 'COMPLETED', time: '' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">Order #{order.id}</h3>
            <PriorityBadge priority={order.priority} />
            <RiskBadge level={order.riskLevel} />
          </div>
          <p className="text-sm text-slate-400">{order.customer} · {order.customerPriority}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      {order.notes && <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3"><p className="text-sm text-blue-300">{order.notes}</p></div>}

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Priority Score" value={`${order.priorityScore}/100`} color="text-blue-400" />
        <Metric label="Order Age" value={`${Math.round(ageHours)}h`} color="text-slate-300" />
        <Metric label="SLA Remaining" value={`${Math.round(slaHours)}h`} color={slaHours < 0 ? 'text-red-400' : slaHours < 8 ? 'text-amber-400' : 'text-emerald-400'} />
        <Metric label="Allocation" value={order.allocationStatus} color={order.allocationStatus === 'FULL' ? 'text-emerald-400' : 'text-amber-400'} />
      </div>

      {/* Risk reasons */}
      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-2">Risk Analysis</h4>
        <div className="space-y-1.5">
          {order.riskReasons.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-2">Order Items</h4>
        <div className="space-y-2">
          {order.items.map((item, i) => {
            const inv = state.inventory.filter(iv => iv.productId === item.productId);
            const avail = inv.reduce((s, iv) => s + iv.availableQuantity, 0);
            const incoming = inv.reduce((s, iv) => s + iv.incomingQuantity, 0);
            return (
              <div key={i} className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-mono text-blue-400 font-medium">{item.sku}</span>
                  <span className="text-sm text-slate-300">{item.productName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Required: <span className="text-slate-200 font-semibold">{item.quantity}</span></span>
                  <span>Available: <span className={avail >= item.quantity ? 'text-emerald-400' : 'text-red-400'}>{avail}</span></span>
                  <span>Incoming: <span className="text-cyan-400">{incoming}</span></span>
                  <span>Shortage: <span className={item.quantity - avail > 0 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>{Math.max(0, item.quantity - avail)}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allocation recommendation */}
      <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-4">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-bold text-blue-400">Allocation Recommendation</h4>
          <span className="text-xs text-slate-500">· Strategy: {alloc.strategy}</span>
        </div>
        <p className="text-sm text-slate-200 mb-2">{alloc.recommendation}</p>
        <p className="text-xs text-slate-400">{alloc.reason}</p>
      </div>

      {/* Timeline */}
      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-3">Operational Timeline</h4>
        <div className="space-y-0">
          {timeline.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full border-2 ${step.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 bg-slate-800'} ${i === timeline.length - 1 ? '' : 'mb-1'}`} />
                {i < timeline.length - 1 && <div className={`w-0.5 h-6 ${step.done ? 'bg-emerald-500/50' : 'bg-slate-700'}`} />}
              </div>
              <div className="pb-1">
                <p className={`text-sm font-medium ${step.done ? 'text-slate-200' : 'text-slate-500'}`}>{step.label}</p>
                {step.time && <p className="text-xs text-slate-500">{step.time}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {['CREATED', 'PRIORITY_ANALYZED'].includes(order.status) && (
        <div className="flex items-center gap-3 pt-2 border-t border-slate-700/30">
          <button onClick={() => setPage('allocation')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 text-sm font-semibold hover:bg-blue-500/25 transition-all">
            <GitBranch className="w-4 h-4" /> Go to Allocation Center
          </button>
          <button onClick={onAllocate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all">
            Override Allocate
          </button>
          <button onClick={onCancel} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-all ml-auto">
            <Ban className="w-4 h-4" /> Cancel Order
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-lg font-bold mt-0.5 ${color}`}>{value}</p></div>;
}
