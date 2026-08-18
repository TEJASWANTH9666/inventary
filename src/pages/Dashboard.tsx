import { useMemo, useState } from 'react';
import {
  ShoppingCart, Clock, Package, AlertTriangle, Zap, TrendingUp,
  Truck, Activity, CheckCircle2, XCircle, ChevronRight, AlertOctagon,
  Sparkles, ArrowRight, Wrench, PackageOpen,
} from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { calculateHealth, detectBottlenecks, generateDecisions } from '@/lib/engine';
import { PriorityBadge, RiskBadge } from '@/components/Badges';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import type { Decision, WarehouseHealth, Bottleneck } from '@/types';
import type { Page } from '@/components/Layout';

export function Dashboard({ setPage }: { setPage: (p: Page) => void }) {
  const { state, dispatch } = useStore();
  const [detailDecision, setDetailDecision] = useState<Decision | null>(null);

  const health = useMemo(() => calculateHealth(state), [state]);
  const bottlenecks = useMemo(() => detectBottlenecks(state), [state]);
  const pendingDecisions = useMemo(() => generateDecisions(state).filter(d => d.status === 'PENDING'), [state]);

  const kpis = useMemo(() => {
    const today = new Date();
    const ordersToday = state.orders.filter(o => new Date(o.createdAt).toDateString() === today.toDateString()).length;
    const pending = state.orders.filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)).length;
    const availableInv = state.inventory.reduce((s, i) => s + i.availableQuantity, 0);
    const lowStock = state.inventory.filter(i => i.availableQuantity > 0 && i.availableQuantity <= i.safetyStock).length;
    const criticalExc = state.exceptions.filter(e => e.severity === 'CRITICAL' && e.status !== 'RESOLVED').length;
    const atRisk = state.orders.filter(o => o.riskLevel === 'HIGH' || o.riskLevel === 'CRITICAL').length;
    const readyDispatch = state.orders.filter(o => o.status === 'READY_DISPATCH').length;
    return { ordersToday, pending, availableInv, lowStock, criticalExc, atRisk, readyDispatch };
  }, [state]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const handleApprove = (decision: Decision) => { dispatch({ type: 'APPROVE_DECISION', decisionId: decision.id }); toast('success', `Decision approved: ${decision.title}`); setDetailDecision(null); };
  const handleReject = (decision: Decision) => { dispatch({ type: 'REJECT_DECISION', decisionId: decision.id }); toast('info', `Decision rejected: ${decision.title}`); setDetailDecision(null); };

  const pipeline = useMemo(() => {
    const created = state.orders.filter(o => o.status === 'CREATED').length;
    const allocated = state.orders.filter(o => ['ALLOCATED', 'PARTIAL_ALLOCATED'].includes(o.status)).length;
    const picking = state.orders.filter(o => ['PICKING', 'PICKED'].includes(o.status)).length;
    const packing = state.orders.filter(o => ['PACKING', 'PACKED', 'QC_PENDING'].includes(o.status)).length;
    const dispatch = state.orders.filter(o => ['READY_DISPATCH', 'DISPATCHED', 'COMPLETED'].includes(o.status)).length;
    return [{ label: 'Created', value: created }, { label: 'Allocated', value: allocated }, { label: 'Picking', value: picking }, { label: 'Packing', value: packing }, { label: 'Dispatch', value: dispatch }];
  }, [state.orders]);

  const invHealth = useMemo(() => {
    const total = state.inventory.length;
    const healthy = state.inventory.filter(i => i.availableQuantity > i.safetyStock).length;
    const low = state.inventory.filter(i => i.availableQuantity > 0 && i.availableQuantity <= i.safetyStock).length;
    const critical = state.inventory.filter(i => i.availableQuantity > 0 && i.availableQuantity <= i.safetyStock * 0.5).length;
    const out = state.inventory.filter(i => i.availableQuantity === 0).length;
    return { healthy: Math.round(healthy / total * 100), low: Math.round(low / total * 100), critical: Math.round(critical / total * 100), out: Math.round(out / total * 100) };
  }, [state.inventory]);

  const atRiskOrders = useMemo(() => state.orders.filter(o => (o.riskLevel === 'HIGH' || o.riskLevel === 'CRITICAL') && !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)).sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 5), [state.orders]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}><span>WarezAI</span><ChevronRight className="h-3 w-3" /><span className="font-medium" style={{ color: 'var(--text-2)' }}>Command Center</span></div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{greeting}, {state.currentUser.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Here's what's happening in your warehouse today.</p>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}><span className="h-2 w-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }} /><span>Live operations feed</span><span style={{ color: 'var(--text-muted)' }}>·</span><span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard icon={ShoppingCart} iconBg="var(--primary-soft)" iconColor="var(--primary)" label="Orders Today" value={kpis.ordersToday} sub={`${kpis.pending} pending`} />
        <KPICard icon={Clock} iconBg="var(--danger-soft)" iconColor="var(--danger)" label="Orders At Risk" value={kpis.atRisk} sub="SLA + stock risk" onClick={() => setPage('orders')} />
        <KPICard icon={Package} iconBg="var(--success-soft)" iconColor="var(--success)" label="Available Inventory" value={kpis.availableInv.toLocaleString()} sub={`${kpis.lowStock} low stock`} onClick={() => setPage('inventory')} />
        <KPICard icon={AlertOctagon} iconBg="var(--orange-soft)" iconColor="var(--orange)" label="Critical Exceptions" value={kpis.criticalExc} sub="Need attention" onClick={() => setPage('exceptions')} />
        <KPICard icon={Truck} iconBg="var(--cyan-soft)" iconColor="var(--cyan)" label="Ready for Dispatch" value={kpis.readyDispatch} sub="Awaiting carrier" onClick={() => setPage('dispatch')} />
        <KPICard icon={Zap} iconBg="var(--warning-soft)" iconColor="var(--warning)" label="Pending Decisions" value={pendingDecisions.length} sub="Awaiting approval" onClick={() => setPage('dashboard')} />
        <KPICard icon={TrendingUp} iconBg="var(--purple-soft)" iconColor="var(--purple)" label="Warehouse Efficiency" value={`${health.overall}%`} sub="Health score" />
        <KPICard icon={PackageOpen} iconBg="var(--warning-soft)" iconColor="var(--warning)" label="Low Stock Items" value={kpis.lowStock} sub="Below safety" onClick={() => setPage('inventory')} />
      </div>

      {/* Main grid: AI Action Center + Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--purple-soft)', border: '1px solid var(--purple)' }}><Sparkles className="h-4 w-4" style={{ color: 'var(--purple)' }} /></div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>AI Action Center</h2>
            {pendingDecisions.length > 0 && <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>{pendingDecisions.length} pending</span>}
          </div>

          {pendingDecisions.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-12 w-12" style={{ color: 'var(--success)' }} /><p className="font-medium" style={{ color: 'var(--text-2)' }}>All clear — no decisions pending</p><p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>The decision engine is monitoring warehouse operations continuously.</p></div>
          ) : (
            <div className="space-y-3">
              {pendingDecisions.map(decision => <DecisionCard key={decision.id} decision={decision} onApprove={() => handleApprove(decision)} onReject={() => handleReject(decision)} onViewDetails={() => setDetailDecision(decision)} />)}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <HealthScoreCard health={health} />
          <BottleneckCard bottlenecks={bottlenecks} />
        </div>
      </div>

      {/* Fulfillment Pipeline */}
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-4 text-sm font-bold" style={{ color: 'var(--text)' }}>Today's Fulfillment Pipeline</h3>
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {pipeline.map((stage, i) => (
            <div key={stage.label} className="flex flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2" style={i === 0 ? { borderColor: 'var(--primary)', background: 'var(--primary)' } : { borderColor: 'var(--primary)', background: 'var(--primary-soft)' }}>
                  <span className="text-xs font-bold" style={{ color: i === 0 ? '#fff' : 'var(--primary)' }}>{stage.value}</span>
                </div>
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>{stage.label}</span>
              </div>
              {i < pipeline.length - 1 && <div className="h-0.5 flex-1" style={{ background: 'var(--border)' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Orders at Risk + Inventory Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between"><h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Orders At Risk</h3><button onClick={() => setPage('orders')} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>View all →</button></div>
          <div className="space-y-2">
            {atRiskOrders.length === 0 ? <p className="py-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No orders at risk</p> : atRiskOrders.map(o => (
              <div key={o.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--primary)' }}>#{o.id}</span>
                <PriorityBadge priority={o.priority} />
                <RiskBadge level={o.riskLevel} />
                <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{o.riskReasons[0]?.slice(0, 40) ?? '—'}</span>
                <button onClick={() => setPage('orders')} className="rounded-md px-2 py-1 text-[11px] font-medium" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}>Review</button>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h3 className="mb-4 text-sm font-bold" style={{ color: 'var(--text)' }}>Inventory Health</h3>
          <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
            <div style={{ width: `${invHealth.healthy}%`, background: 'var(--success)' }} />
            <div style={{ width: `${invHealth.low}%`, background: 'var(--warning)' }} />
            <div style={{ width: `${invHealth.critical}%`, background: 'var(--orange)' }} />
            <div style={{ width: `${invHealth.out}%`, background: 'var(--danger)' }} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <InvLegend color="var(--success)" label="Healthy" value={`${invHealth.healthy}%`} />
            <InvLegend color="var(--warning)" label="Low Stock" value={`${invHealth.low}%`} />
            <InvLegend color="var(--orange)" label="Critical" value={`${invHealth.critical}%`} />
            <InvLegend color="var(--danger)" label="Out of Stock" value={`${invHealth.out}%`} />
          </div>
        </div>
      </div>

      <Modal open={!!detailDecision} onClose={() => setDetailDecision(null)} title="Decision Analysis" size="lg">
        {detailDecision && <DecisionDetail decision={detailDecision} onApprove={() => handleApprove(detailDecision)} onReject={() => handleReject(detailDecision)} />}
      </Modal>
    </div>
  );
}

function KPICard({ icon: Icon, iconBg, iconColor, label, value, sub, onClick }: { icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; iconBg: string; iconColor: string; label: string; value: string | number; sub?: string; onClick?: () => void; }) {
  return (
    <div onClick={onClick} className={`glass-card rounded-2xl p-5 ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p><p className="mt-1.5 text-[28px] font-bold leading-none" style={{ color: 'var(--text)' }}>{value}</p>{sub && <p className="mt-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: iconBg }}><Icon className="h-[18px] w-[18px]" style={{ color: iconColor }} /></div>
      </div>
    </div>
  );
}

function DecisionCard({ decision, onApprove, onReject, onViewDetails }: { decision: Decision; onApprove: () => void; onReject: () => void; onViewDetails: () => void; }) {
  const sevConfig = {
    CRITICAL: { color: 'var(--danger)' },
    WARNING: { color: 'var(--warning)' },
    INFO: { color: 'var(--primary)' },
  };
  const sc = sevConfig[decision.severity];
  return (
    <div className="glass-card rounded-2xl p-5" style={{ border: `1px solid ${sc.color}` }}>
      <div className="mb-3 flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: sc.color }} /><span className="text-xs font-bold uppercase tracking-wide" style={{ color: sc.color }}>{decision.severity}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{decision.type}</span><span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(decision.createdAt).toLocaleTimeString()}</span></div>
      <h3 className="mb-1 text-base font-semibold" style={{ color: 'var(--text)' }}>{decision.title}</h3>
      <p className="mb-3 text-sm" style={{ color: 'var(--text-muted)' }}>{decision.description}</p>
      <div className="mb-4 rounded-xl p-3" style={{ border: '1px solid var(--primary)', background: 'var(--primary-soft)' }}><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>Recommended Action</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{decision.recommendation}</p></div>
      <div className="flex items-center gap-2">
        <button onClick={onApprove} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors" style={{ background: 'var(--primary)' }}><CheckCircle2 className="h-4 w-4" />Approve</button>
        <button onClick={onViewDetails} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-2)' }}>View Details<ChevronRight className="h-4 w-4" /></button>
        <button onClick={onReject} className="ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors" style={{ border: '1px solid var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)' }}><XCircle className="h-4 w-4" />Reject</button>
      </div>
    </div>
  );
}

function DecisionDetail({ decision, onApprove, onReject }: { decision: Decision; onApprove: () => void; onReject: () => void; }) {
  const sc = decision.severity === 'CRITICAL' ? { color: 'var(--danger)' } : decision.severity === 'WARNING' ? { color: 'var(--warning)' } : { color: 'var(--primary)' };
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-3" style={{ border: `1px solid ${sc.color}`, background: 'var(--surface-2)' }}><p className="text-sm font-bold uppercase" style={{ color: sc.color }}>{decision.severity} — {decision.type}</p><p className="mt-1 text-base font-semibold" style={{ color: 'var(--text)' }}>{decision.title}</p></div>
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>What happened?</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{decision.description}</p></div>
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Why did it happen?</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{decision.reason}</p></div>
      <div className="rounded-xl p-3" style={{ border: '1px solid var(--primary)', background: 'var(--primary-soft)' }}><p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--primary)' }}>What does WarezAI recommend?</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{decision.recommendation}</p></div>
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>What will happen if approved?</p><p className="text-sm" style={{ color: 'var(--text-2)' }}>{decision.expectedResult}</p></div>
      <div className="flex items-center gap-3 pt-2"><button onClick={onApprove} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors" style={{ background: 'var(--primary)' }}><CheckCircle2 className="h-4 w-4" />Approve Decision</button><button onClick={onReject} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors" style={{ border: '1px solid var(--danger)', background: 'var(--danger-soft)', color: 'var(--danger)' }}><XCircle className="h-4 w-4" />Reject</button></div>
    </div>
  );
}

function HealthScoreCard({ health }: { health: WarehouseHealth }) {
  const metrics = [
    { label: 'Inventory Health', value: health.inventoryHealth, color: 'var(--success)' },
    { label: 'Order Health', value: health.orderHealth, color: 'var(--primary)' },
    { label: 'Picking Efficiency', value: health.pickingEfficiency, color: 'var(--purple)' },
    { label: 'Packing Efficiency', value: health.packingEfficiency, color: 'var(--purple)' },
    { label: 'Dispatch Efficiency', value: health.dispatchEfficiency, color: 'var(--cyan)' },
    { label: 'Exception Health', value: health.exceptionHealth, color: 'var(--warning)' },
  ];
  const ringColor = health.overall >= 80 ? 'var(--success)' : health.overall >= 60 ? 'var(--primary)' : 'var(--danger)';
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="mb-4 text-sm font-bold" style={{ color: 'var(--text)' }}>Warehouse Health</h3>
      <div className="mb-5 flex items-center justify-center">
        <div className="relative h-32 w-32">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--border)" strokeWidth="8" /><circle cx="60" cy="60" r="52" fill="none" stroke={ringColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(health.overall / 100) * 327} 327`} className="transition-all duration-1000" /></svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold" style={{ color: 'var(--text)' }}>{health.overall}</span><span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ 100</span></div>
        </div>
      </div>
      <div className="space-y-2.5">{metrics.map(m => <div key={m.label}><div className="mb-1 flex items-center justify-between"><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.label}</span><span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{m.value}</span></div><div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${m.value}%`, background: m.color }} /></div></div>)}</div>
    </div>
  );
}

function BottleneckCard({ bottlenecks }: { bottlenecks: Bottleneck[] }) {
  if (bottlenecks.length === 0) return <div className="glass-card rounded-2xl p-5"><div className="flex items-center gap-2"><Wrench className="h-4 w-4" style={{ color: 'var(--success)' }} /><h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Bottlenecks</h3></div><p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>No bottlenecks detected</p></div>;
  return (
    <div className="rounded-2xl p-5" style={{ border: '1px solid var(--warning)', background: 'var(--warning-soft)' }}>
      <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning)' }} /><h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Bottleneck Detected</h3></div>
      {bottlenecks.slice(0, 2).map(bn => (
        <div key={bn.id} className="mb-3 last:mb-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{bn.stage}{bn.zone ? ` — Zone ${bn.zone}` : ''}</p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>Current workload: <span className="font-semibold" style={{ color: 'var(--warning)' }}>{bn.workload}%</span> · Normal: {bn.normalWorkload}%</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{bn.cause}</p>
          <div className="mt-2 rounded-lg p-2" style={{ border: '1px solid var(--warning)', background: 'var(--surface)' }}><p className="text-[11px] font-semibold uppercase" style={{ color: 'var(--warning)' }}>Recommendation</p><p className="text-xs" style={{ color: 'var(--text-2)' }}>{bn.recommendation}</p></div>
        </div>
      ))}
    </div>
  );
}

function InvLegend({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /><span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span><span className="ml-auto text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{value}</span></div>;
}
