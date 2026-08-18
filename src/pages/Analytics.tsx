import { useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, Package, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '@/store/StoreContext';

export function AnalyticsPage() {
  const { state } = useStore();

  // Order analytics
  const orderStats = useMemo(() => {
    const total = state.orders.length;
    const completed = state.orders.filter(o => o.status === 'COMPLETED' || o.status === 'DISPATCHED').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const slaCompliant = state.orders.filter(o => {
      if (o.status === 'COMPLETED' || o.status === 'DISPATCHED') return true;
      const slaHours = (new Date(o.slaDeadline).getTime() - Date.now()) / 3600000;
      return slaHours > 0;
    }).length;
    const slaRate = total > 0 ? Math.round((slaCompliant / total) * 100) : 0;
    const priorityDist = {
      CRITICAL: state.orders.filter(o => o.priority === 'CRITICAL').length,
      HIGH: state.orders.filter(o => o.priority === 'HIGH').length,
      MEDIUM: state.orders.filter(o => o.priority === 'MEDIUM').length,
      NORMAL: state.orders.filter(o => o.priority === 'NORMAL').length,
    };
    return { total, completed, completionRate, slaRate, priorityDist };
  }, [state.orders]);

  // Inventory analytics
  const invStats = useMemo(() => {
    const total = state.inventory.length;
    const healthy = state.inventory.filter(i => i.availableQuantity > i.safetyStock).length;
    const low = state.inventory.filter(i => i.availableQuantity > 0 && i.availableQuantity <= i.safetyStock).length;
    const out = state.inventory.filter(i => i.availableQuantity === 0).length;
    const totalValue = state.inventory.reduce((s, i) => {
      const p = state.products.find(p => p.id === i.productId);
      return s + (p?.unitPrice ?? 0) * i.totalQuantity;
    }, 0);
    const byCategory = new Map<string, number>();
    for (const inv of state.inventory) {
      const p = state.products.find(p => p.id === inv.productId);
      if (p) byCategory.set(p.category, (byCategory.get(p.category) ?? 0) + inv.availableQuantity);
    }
    return { total, healthy, low, out, totalValue, byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]) };
  }, [state.inventory, state.products]);

  // Picking analytics
  const pickStats = useMemo(() => {
    const tasks = state.pickingTasks;
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const avgEff = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.efficiencyScore, 0) / tasks.length) : 0;
    const avgTime = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + t.estimatedTimeMin, 0) / tasks.length) : 0;
    const zoneLoad = new Map<string, number>();
    for (const t of tasks) {
      for (const item of t.items) {
        zoneLoad.set(item.location.zone, (zoneLoad.get(item.location.zone) ?? 0) + 1);
      }
    }
    return { completed, avgEff, avgTime, zoneLoad: Array.from(zoneLoad.entries()).sort((a, b) => b[1] - a[1]) };
  }, [state.pickingTasks]);

  // Dispatch analytics
  const dispatchStats = useMemo(() => {
    const total = state.dispatches.length;
    const delivered = state.dispatches.filter(d => d.status === 'DELIVERED').length;
    const delayed = state.dispatches.filter(d => d.status === 'DELAYED').length;
    const delayRate = total > 0 ? Math.round((delayed / total) * 100) : 0;
    return { total, delivered, delayed, delayRate };
  }, [state.dispatches]);

  // Exception analytics
  const excStats = useMemo(() => {
    const total = state.exceptions.length;
    const resolved = state.exceptions.filter(e => e.status === 'RESOLVED' || e.status === 'VERIFIED').length;
    const byType = new Map<string, number>();
    for (const e of state.exceptions) {
      byType.set(e.type, (byType.get(e.type) ?? 0) + 1);
    }
    return { total, resolved, byType: Array.from(byType.entries()).sort((a, b) => b[1] - a[1]) };
  }, [state.exceptions]);

  // Worker utilization
  const workerStats = useMemo(() => {
    return state.workerAssignments.sort((a, b) => b.utilization - a.utilization);
  }, [state.workerAssignments]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time warehouse performance metrics from live operational data</p>
      </div>

      {/* Order Analytics */}
      <Section title="Order Analytics" icon={TrendingUp}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Metric label="Total Orders" value={orderStats.total} color="text-slate-200" />
          <Metric label="Completed" value={orderStats.completed} color="text-emerald-400" />
          <Metric label="Completion Rate" value={`${orderStats.completionRate}%`} color="text-blue-400" />
          <Metric label="SLA Compliance" value={`${orderStats.slaRate}%`} color="text-amber-400" />
        </div>
        <BarChart title="Orders by Priority" data={[
          { label: 'Critical', value: orderStats.priorityDist.CRITICAL, color: 'bg-red-500' },
          { label: 'High', value: orderStats.priorityDist.HIGH, color: 'bg-orange-500' },
          { label: 'Medium', value: orderStats.priorityDist.MEDIUM, color: 'bg-yellow-500' },
          { label: 'Normal', value: orderStats.priorityDist.NORMAL, color: 'bg-slate-500' },
        ]} />
      </Section>

      {/* Inventory Analytics */}
      <Section title="Inventory Analytics" icon={Package}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Metric label="Total SKUs" value={invStats.total} color="text-slate-200" />
          <Metric label="Healthy" value={invStats.healthy} color="text-emerald-400" />
          <Metric label="Low Stock" value={invStats.low} color="text-yellow-400" />
          <Metric label="Out of Stock" value={invStats.out} color="text-red-400" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BarChart title="Stock by Category" data={invStats.byCategory.slice(0, 6).map(([label, value]) => ({ label, value, color: 'bg-blue-500' }))} />
          <div className="glass-card rounded-2xl p-4">
            <h4 className="text-sm font-bold text-slate-200 mb-3">Inventory Value</h4>
            <p className="text-3xl font-bold text-emerald-400">${(invStats.totalValue / 1000000).toFixed(2)}M</p>
            <p className="text-sm text-slate-500 mt-1">Total stock value across all warehouses</p>
          </div>
        </div>
      </Section>

      {/* Picking Analytics */}
      <Section title="Picking Analytics" icon={Clock}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Metric label="Avg Efficiency" value={`${pickStats.avgEff}%`} color="text-blue-400" />
          <Metric label="Avg Pick Time" value={`${pickStats.avgTime}min`} color="text-slate-200" />
          <Metric label="Completed Picks" value={pickStats.completed} color="text-emerald-400" />
        </div>
        <BarChart title="Zone Workload" data={pickStats.zoneLoad.map(([label, value]) => ({ label: `Zone ${label}`, value, color: 'bg-indigo-500' }))} />
      </Section>

      {/* Worker Utilization */}
      <Section title="Worker Utilization" icon={BarChart3}>
        <div className="space-y-3">
          {workerStats.map(w => (
            <div key={w.workerId} className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-700/40 text-xs font-bold text-slate-300">
                {w.workerName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-300">{w.workerName}</span>
                  <span className="text-xs text-slate-400">Zone {w.zone} · {w.taskCount} tasks · <span className={w.utilization > 85 ? 'text-red-400' : w.utilization > 60 ? 'text-amber-400' : 'text-emerald-400'}>{w.utilization}%</span></span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${w.utilization > 85 ? 'bg-red-500' : w.utilization > 60 ? 'bg-amber-500' : 'bg-emerald-500'} transition-all duration-700`} style={{ width: `${w.utilization}%` }} />
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${w.status === 'AVAILABLE' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>{w.status}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Dispatch Analytics */}
      <Section title="Dispatch Analytics" icon={Truck}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Metric label="Total Shipments" value={dispatchStats.total} color="text-slate-200" />
          <Metric label="Delivered" value={dispatchStats.delivered} color="text-emerald-400" />
          <Metric label="Delayed" value={dispatchStats.delayed} color="text-red-400" />
          <Metric label="Delay Rate" value={`${dispatchStats.delayRate}%`} color="text-amber-400" />
        </div>
      </Section>

      {/* Exception Analytics */}
      <Section title="Exception Analytics" icon={AlertTriangle}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          <Metric label="Total Exceptions" value={excStats.total} color="text-slate-200" />
          <Metric label="Resolved" value={excStats.resolved} color="text-emerald-400" />
          <Metric label="Open" value={excStats.total - excStats.resolved} color="text-amber-400" />
        </div>
        <BarChart title="Exceptions by Type" data={excStats.byType.map(([label, value]) => ({ label: label.replace(/_/g, ' '), value, color: 'bg-red-500' }))} />
      </Section>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="glass-card rounded-2xl p-5">{children}</div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p></div>;
}

function BarChart({ title, data }: { title: string; data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <h4 className="text-sm font-bold text-slate-200 mb-3">{title}</h4>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-24 truncate">{d.label}</span>
            <div className="flex-1 h-6 rounded-lg bg-slate-800/50 overflow-hidden">
              <div className={`h-full rounded-lg ${d.color} flex items-center justify-end px-2 transition-all duration-700`} style={{ width: `${Math.max((d.value / max) * 100, 5)}%` }}>
                <span className="text-xs font-bold text-white">{d.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
