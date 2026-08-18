import { useMemo } from 'react';
import { Truck, Clock, MapPin, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { toast } from '@/components/Toast';

export function DispatchPage() {
  const { state, dispatch } = useStore();

  const dispatches = useMemo(() => state.dispatches.sort((a, b) => {
    const order: Record<string, number> = { SCHEDULED: 0, IN_TRANSIT: 1, DELAYED: 2, DELIVERED: 3 };
    return (order[a.status] ?? 0) - (order[b.status] ?? 0);
  }), [state.dispatches]);

  const readyOrders = useMemo(() => state.orders.filter(o => o.status === 'READY_DISPATCH'), [state.orders]);

  const stats = useMemo(() => ({
    scheduled: dispatches.filter(d => d.status === 'SCHEDULED').length,
    inTransit: dispatches.filter(d => d.status === 'IN_TRANSIT').length,
    delivered: dispatches.filter(d => d.status === 'DELIVERED').length,
    delayed: dispatches.filter(d => d.status === 'DELAYED').length,
  }), [dispatches]);

  const statusColors: Record<string, string> = {
    SCHEDULED: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    IN_TRANSIT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    DELIVERED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    DELAYED: 'bg-red-500/15 text-red-400 border-red-500/30',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Dispatch Management</h1>
        <p className="text-sm text-slate-400 mt-1">Track shipments and manage carrier dispatch</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Ready to Dispatch" value={readyOrders.length} color="text-lime-400" />
        <StatChip label="Scheduled" value={stats.scheduled} color="text-blue-400" />
        <StatChip label="In Transit" value={stats.inTransit} color="text-cyan-400" />
        <StatChip label="Delayed" value={stats.delayed} color="text-red-400" />
      </div>

      {/* Ready to dispatch */}
      {readyOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Ready for Dispatch</h2>
          <div className="space-y-2">
            {readyOrders.map(order => (
              <div key={order.id} className="glass-card rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-lime-500/15">
                    <Package className="w-5 h-5 text-lime-400" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-blue-400 font-mono">#{order.id}</span>
                    <p className="text-sm text-slate-400">{order.customer} · {order.items.map(i => `${i.quantity}× ${i.sku}`).join(', ')}</p>
                  </div>
                </div>
                <button
                  onClick={() => { dispatch({ type: 'DISPATCH_ORDER', orderId: order.id }); toast('success', `Order #${order.id} dispatched`); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-sm font-semibold hover:bg-cyan-500/25 transition-all"
                >
                  <Truck className="w-4 h-4" /> Dispatch Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispatch tracking */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Shipment Tracking</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium">Carrier</th>
                  <th className="text-left px-4 py-3 font-medium">Tracking #</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Dispatched</th>
                  <th className="text-left px-4 py-3 font-medium">Est. Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {dispatches.map(d => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono text-blue-400">#{d.orderId}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{d.carrier}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-400">{d.trackingNumber}</td>
                    <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${statusColors[d.status]}`}>{d.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-400">{d.dispatchedAt ? new Date(d.dispatchedAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(d.estimatedDelivery).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {dispatches.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No dispatches yet</div>}
        </div>
      </div>

      {/* Delayed shipments alert */}
      {stats.delayed > 0 && (
        <div className="glass-card rounded-2xl p-4 border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-400">{stats.delayed} delayed shipment(s)</p>
              <p className="text-xs text-slate-400">Carrier pickup overdue. Contact carrier to verify pickup status.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="glass-card rounded-xl p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p></div>;
}
