import { useMemo, useState } from 'react';
import { Search, Package, MapPin, TrendingDown, AlertTriangle, ArrowLeft, Plus, Truck } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { InvStatusBadge, getInventoryStatus } from '@/components/Badges';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import { checkReplenishment } from '@/lib/engine';
import type { Inventory, Product } from '@/types';

export function InventoryPage() {
  const { state } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInv, setSelectedInv] = useState<Inventory | null>(null);

  const productMap = useMemo(() => new Map(state.products.map(p => [p.id, p])), [state.products]);

  const inventoryView = useMemo(() => {
    return state.inventory.map(inv => {
      const product = productMap.get(inv.productId);
      const status = getInventoryStatus(inv.availableQuantity, inv.safetyStock, inv.reorderLevel);
      return { ...inv, product, status };
    });
  }, [state.inventory, productMap]);

  const filtered = useMemo(() => {
    let result = inventoryView;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.product?.sku.toLowerCase().includes(q) ||
        i.product?.name.toLowerCase().includes(q) ||
        i.product?.category.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }
    return result.sort((a, b) => a.availableQuantity - b.availableQuantity);
  }, [inventoryView, search, statusFilter]);

  const stats = useMemo(() => {
    const total = inventoryView.length;
    const healthy = inventoryView.filter(i => i.status === 'HEALTHY').length;
    const low = inventoryView.filter(i => i.status === 'LOW_STOCK').length;
    const critical = inventoryView.filter(i => i.status === 'CRITICAL').length;
    const out = inventoryView.filter(i => i.status === 'OUT_OF_STOCK').length;
    return { total, healthy, low, critical, out };
  }, [inventoryView]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time stock levels across all warehouse locations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatChip label="Total SKUs" value={stats.total} color="text-slate-300" />
        <StatChip label="Healthy" value={stats.healthy} color="text-emerald-400" />
        <StatChip label="Low Stock" value={stats.low} color="text-yellow-400" />
        <StatChip label="Critical" value={stats.critical} color="text-orange-400" />
        <StatChip label="Out of Stock" value={stats.out} color="text-red-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by SKU, name, or category..."
            className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none flex-1"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {['all', 'HEALTHY', 'LOW_STOCK', 'CRITICAL', 'OUT_OF_STOCK'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === s
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                  : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'
              }`}
            >
              {s === 'all' ? 'All Status' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Product</th>
                <th className="text-left px-4 py-3 font-medium">Location</th>
                <th className="text-right px-4 py-3 font-medium">Available</th>
                <th className="text-right px-4 py-3 font-medium">Reserved</th>
                <th className="text-right px-4 py-3 font-medium">Incoming</th>
                <th className="text-right px-4 py-3 font-medium">Safety</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInv(inv)}
                  className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-mono text-blue-400 font-medium">{inv.product?.sku}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{inv.product?.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    <span className="font-mono text-xs">{inv.location.warehouse}/{inv.location.zone}/{inv.location.rack}-{inv.location.shelf}-{inv.location.bin}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-200">{inv.availableQuantity}</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-400">{inv.reservedQuantity}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {inv.incomingQuantity > 0 ? (
                      <span className="text-cyan-400 font-medium">{inv.incomingQuantity}</span>
                    ) : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-400">{inv.safetyStock}</td>
                  <td className="px-4 py-3"><InvStatusBadge status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">No inventory items match your filters</div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!selectedInv} onClose={() => setSelectedInv(null)} title="Inventory Detail" size="lg">
        {selectedInv && <InventoryDetail inv={selectedInv} product={productMap.get(selectedInv.productId)} />}
      </Modal>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card rounded-xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

function InventoryDetail({ inv, product }: { inv: Inventory; product?: Product }) {
  const { state, dispatch } = useStore();
  const transactions = state.transactions.filter(t => t.inventoryId === inv.id);

  const stats = [
    { label: 'Total Stock', value: inv.totalQuantity, color: 'text-slate-200' },
    { label: 'Available', value: inv.availableQuantity, color: 'text-emerald-400' },
    { label: 'Reserved', value: inv.reservedQuantity, color: 'text-amber-400' },
    { label: 'Damaged', value: inv.damagedQuantity, color: 'text-red-400' },
    { label: 'Incoming', value: inv.incomingQuantity, color: 'text-cyan-400' },
    { label: 'Safety Stock', value: inv.safetyStock, color: 'text-slate-300' },
    { label: 'Reorder Level', value: inv.reorderLevel, color: 'text-slate-300' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-bold text-white">{product?.name}</h3>
          </div>
          <p className="text-sm text-slate-400 font-mono">{product?.sku} · {product?.category} · {product?.supplier}</p>
        </div>
        <InvStatusBadge status={getInventoryStatus(inv.availableQuantity, inv.safetyStock, inv.reorderLevel)} />
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <MapPin className="w-4 h-4 text-slate-500" />
        <span className="font-mono">{inv.location.warehouse} / Zone {inv.location.zone} / Rack {inv.location.rack} / Shelf {inv.location.shelf} / Bin {inv.location.bin}</span>
        <span className="text-slate-600">·</span>
        <span>Coordinates: ({inv.location.x}, {inv.location.y})</span>
      </div>

      {/* Stock metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3">
            <p className="text-xs text-slate-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Incoming ETA */}
      {inv.incomingQuantity > 0 && inv.incomingEta && (
        <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 p-3">
          <Truck className="w-4 h-4 text-cyan-400" />
          <span className="text-sm text-cyan-300">{inv.incomingQuantity} units incoming — ETA: {new Date(inv.incomingEta).toLocaleDateString()}</span>
        </div>
      )}

      {/* Replenishment button */}
      {inv.availableQuantity <= inv.safetyStock && (
        <button
          onClick={() => {
            dispatch({ type: 'CREATE_REPLENISHMENT', productId: inv.productId });
            toast('success', `Replenishment request created for ${product?.sku}`);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-semibold hover:bg-amber-500/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Replenishment Request
        </button>
      )}

      {/* Movement history */}
      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-2">Inventory Movement History</h4>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-500 py-3">No transactions recorded</p>
        ) : (
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                  t.type === 'INBOUND' ? 'bg-emerald-500/15 text-emerald-400' :
                  t.type === 'OUTBOUND' ? 'bg-blue-500/15 text-blue-400' :
                  t.type === 'RESERVE' ? 'bg-amber-500/15 text-amber-400' :
                  t.type === 'DAMAGE' ? 'bg-red-500/15 text-red-400' :
                  'bg-slate-500/15 text-slate-400'
                }`}>{t.type}</span>
                <span className="text-sm text-slate-300">{t.reason}</span>
                <span className="text-sm text-slate-400">Qty: {t.quantity}</span>
                <span className="text-xs text-slate-500 ml-auto">{new Date(t.timestamp).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
