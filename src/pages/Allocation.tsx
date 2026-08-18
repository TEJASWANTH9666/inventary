import { useMemo } from 'react';
import { GitBranch, CheckCircle2, XCircle, AlertTriangle, Package } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { PriorityBadge, RiskBadge } from '@/components/Badges';
import { toast } from '@/components/Toast';
import { determineAllocation } from '@/lib/engine';
import type { Order, AllocationStrategy } from '@/types';

export function AllocationPage() {
  const { state, dispatch } = useStore();

  const pendingOrders = useMemo(() => {
    return state.orders
      .filter(o => ['CREATED', 'PRIORITY_ANALYZED'].includes(o.status) && o.allocationStatus === 'NONE')
      .sort((a, b) => b.priorityScore - a.priorityScore);
  }, [state.orders]);

  const executedAllocations = useMemo(() => {
    return state.allocations.slice().reverse();
  }, [state.allocations]);

  const strategyColors: Record<AllocationStrategy, string> = {
    FULL: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    PARTIAL: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    HOLD: 'text-red-400 bg-red-500/10 border-red-500/30',
    ALTERNATIVE_LOCATION: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    REPLENISHMENT_WAIT: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Allocation Center</h1>
        <p className="text-sm text-slate-400 mt-1">Intelligent inventory allocation with priority-based decision engine</p>
      </div>

      {/* Pending allocations */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Pending Allocation Decisions</h2>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">{pendingOrders.length}</span>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-300 font-medium">All orders have been allocated</p>
            <p className="text-sm text-slate-500 mt-1">No pending allocation decisions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map(order => (
              <AllocationCard key={order.id} order={order} onApprove={() => {
                const dec = state.decisions.find(d => d.relatedOrderId === order.id && d.type === 'ALLOCATION' && d.status === 'PENDING');
                if (dec) {
                  dispatch({ type: 'APPROVE_DECISION', decisionId: dec.id });
                  toast('success', `Allocation approved for Order #${order.id}`);
                } else {
                  dispatch({ type: 'OVERRIDE_ALLOCATION', orderId: order.id });
                  toast('success', `Allocation executed for Order #${order.id}`);
                }
              }} onReject={() => {
                const dec = state.decisions.find(d => d.relatedOrderId === order.id && d.type === 'ALLOCATION' && d.status === 'PENDING');
                if (dec) {
                  dispatch({ type: 'REJECT_DECISION', decisionId: dec.id });
                  toast('info', `Allocation rejected for Order #${order.id}`);
                }
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Executed allocations */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Allocation History</h2>
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-right px-4 py-3 font-medium">Req</th>
                  <th className="text-right px-4 py-3 font-medium">Avail</th>
                  <th className="text-right px-4 py-3 font-medium">Resv</th>
                  <th className="text-right px-4 py-3 font-medium">Short</th>
                  <th className="text-center px-4 py-3 font-medium">Strategy</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {executedAllocations.map(a => {
                  const product = state.products.find(p => p.id === a.productId);
                  return (
                    <tr key={a.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-blue-400">#{a.orderId}</td>
                      <td className="px-4 py-3 text-sm text-slate-300 font-mono">{product?.sku}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-300">{a.required}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-300">{a.available}</td>
                      <td className="px-4 py-3 text-sm text-right text-amber-400">{a.reserved}</td>
                      <td className="px-4 py-3 text-sm text-right">{a.shortage > 0 ? <span className="text-red-400 font-semibold">{a.shortage}</span> : <span className="text-emerald-400">0</span>}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${strategyColors[a.strategy]}`}>{a.strategy.replace(/_/g, ' ')}</span></td>
                      <td className="px-4 py-3 text-center"><span className="text-xs text-emerald-400 font-medium">{a.status}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-400">{a.approvedBy ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {executedAllocations.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No allocations executed yet</div>}
        </div>
      </div>
    </div>
  );
}

function AllocationCard({ order, onApprove, onReject }: { order: Order; onApprove: () => void; onReject: () => void }) {
  const { state } = useStore();
  const alloc = useMemo(() => determineAllocation(order, state.inventory, state.orders), [order, state.inventory, state.orders]);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-blue-400 font-mono">#{order.id}</span>
          <PriorityBadge priority={order.priority} />
          <RiskBadge level={order.riskLevel} />
          <span className="text-sm text-slate-400">{order.customer} · {order.customerPriority}</span>
        </div>
        <span className="text-xs text-slate-500">Score: {order.priorityScore}</span>
      </div>

      {/* Items table */}
      <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 overflow-hidden mb-3">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/30 text-xs text-slate-500 uppercase">
              <th className="text-left px-3 py-2 font-medium">SKU</th>
              <th className="text-right px-3 py-2 font-medium">Required</th>
              <th className="text-right px-3 py-2 font-medium">Available</th>
              <th className="text-right px-3 py-2 font-medium">Reserved</th>
              <th className="text-right px-3 py-2 font-medium">Incoming</th>
              <th className="text-right px-3 py-2 font-medium">Shortage</th>
              <th className="text-left px-3 py-2 font-medium">Recommendation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {alloc.allocations.map((a, i) => {
              const product = state.products.find(p => p.id === a.productId);
              return (
                <tr key={i}>
                  <td className="px-3 py-2 text-sm font-mono text-blue-400">{product?.sku}</td>
                  <td className="px-3 py-2 text-sm text-right text-slate-200 font-semibold">{a.required}</td>
                  <td className="px-3 py-2 text-sm text-right">{a.available >= a.required ? <span className="text-emerald-400">{a.available}</span> : <span className="text-red-400">{a.available}</span>}</td>
                  <td className="px-3 py-2 text-sm text-right text-amber-400">{a.reserved}</td>
                  <td className="px-3 py-2 text-sm text-right text-cyan-400">{a.incoming}</td>
                  <td className="px-3 py-2 text-sm text-right">{a.shortage > 0 ? <span className="text-red-400 font-bold">{a.shortage}</span> : <span className="text-emerald-400">0</span>}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{a.recommendation}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Strategy and reason */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Strategy</p>
          <p className="text-sm text-slate-200">{alloc.strategy.replace(/_/g, ' ')}</p>
        </div>
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
          <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Reason</p>
          <p className="text-sm text-slate-400">{alloc.reason}</p>
        </div>
      </div>

      <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 mb-3">
        <p className="text-xs font-semibold text-blue-400 uppercase mb-1">Recommendation</p>
        <p className="text-sm text-slate-200">{alloc.recommendation}</p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onApprove} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all">
          <CheckCircle2 className="w-4 h-4" /> Approve Allocation
        </button>
        <button onClick={onReject} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-all">
          <XCircle className="w-4 h-4" /> Reject
        </button>
      </div>
    </div>
  );
}
