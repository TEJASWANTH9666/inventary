import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Search, AlertOctagon } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { ExceptionStatusBadge } from '@/components/Badges';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/Toast';
import type { Exception } from '@/types';

export function ExceptionsPage() {
  const { state, dispatch } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState<Exception | null>(null);
  const [resolution, setResolution] = useState('');

  const filtered = useMemo(() => {
    let result = [...state.exceptions];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.type.toLowerCase().includes(q));
    }
    if (statusFilter === 'open') result = result.filter(e => e.status !== 'RESOLVED' && e.status !== 'VERIFIED');
    else if (statusFilter === 'resolved') result = result.filter(e => e.status === 'RESOLVED' || e.status === 'VERIFIED');
    return result.sort((a, b) => {
      const sevOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return (sevOrder[a.severity] ?? 0) - (sevOrder[b.severity] ?? 0);
    });
  }, [state.exceptions, search, statusFilter]);

  const stats = useMemo(() => ({
    total: state.exceptions.length,
    open: state.exceptions.filter(e => e.status !== 'RESOLVED' && e.status !== 'VERIFIED').length,
    critical: state.exceptions.filter(e => e.severity === 'CRITICAL' && e.status !== 'RESOLVED').length,
    resolved: state.exceptions.filter(e => e.status === 'RESOLVED' || e.status === 'VERIFIED').length,
  }), [state.exceptions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Exception Center</h1>
        <p className="text-sm text-slate-400 mt-1">Operational exceptions with AI-recommended resolutions</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Total" value={stats.total} color="text-slate-200" />
        <StatChip label="Open" value={stats.open} color="text-amber-400" />
        <StatChip label="Critical" value={stats.critical} color="text-red-400" />
        <StatChip label="Resolved" value={stats.resolved} color="text-emerald-400" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exceptions..." className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none flex-1" />
        </div>
        <div className="flex gap-2">
          {['open', 'resolved', 'all'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${statusFilter === s ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-700/30'}`}>{s}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(exc => (
          <div key={exc.id} className={`glass-card rounded-2xl p-4 border ${
            exc.severity === 'CRITICAL' ? 'border-red-500/20' : exc.severity === 'WARNING' ? 'border-amber-500/20' : 'border-slate-700/30'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${exc.severity === 'CRITICAL' ? 'bg-red-500' : exc.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'} ${exc.severity === 'CRITICAL' && exc.status === 'DETECTED' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-bold uppercase ${exc.severity === 'CRITICAL' ? 'text-red-400' : exc.severity === 'WARNING' ? 'text-amber-400' : 'text-blue-400'}`}>{exc.severity}</span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400">{exc.type.replace(/_/g, ' ')}</span>
              </div>
              <ExceptionStatusBadge status={exc.status} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{exc.title}</h3>
            <p className="text-sm text-slate-400 mb-2">{exc.description}</p>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-2.5 mb-3">
              <p className="text-xs font-semibold text-blue-400 uppercase mb-0.5">AI Recommendation</p>
              <p className="text-sm text-slate-300">{exc.recommendation}</p>
            </div>
            {exc.status !== 'RESOLVED' && exc.status !== 'VERIFIED' && (
              <button
                onClick={() => { setSelected(exc); setResolution(exc.recommendation); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Resolve Exception
              </button>
            )}
            {exc.status === 'RESOLVED' && exc.resolution && (
              <div className="text-xs text-slate-500 italic">Resolved: {exc.resolution}</div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="glass-card rounded-2xl p-8 text-center"><AlertOctagon className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No exceptions match your filters</p></div>}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Resolve Exception" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
              <p className="text-sm font-semibold text-slate-200">{selected.title}</p>
              <p className="text-sm text-slate-400 mt-1">{selected.description}</p>
            </div>
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3">
              <p className="text-xs font-semibold text-blue-400 uppercase mb-1">AI Recommendation</p>
              <p className="text-sm text-slate-300">{selected.recommendation}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-semibold">Resolution Notes</label>
              <textarea
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                rows={3}
                className="w-full mt-1 rounded-xl bg-slate-800/40 border border-slate-700/30 px-3 py-2 text-sm text-slate-200 outline-none resize-none"
              />
            </div>
            <button
              onClick={() => { dispatch({ type: 'RESOLVE_EXCEPTION', exceptionId: selected.id, resolution }); toast('success', 'Exception resolved'); setSelected(null); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-semibold hover:bg-emerald-500/30 transition-all w-full justify-center"
            >
              <CheckCircle2 className="w-4.5 h-4.5" /> Confirm Resolution
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className="glass-card rounded-xl p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p></div>;
}
