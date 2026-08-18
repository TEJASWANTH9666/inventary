import { useMemo, useState } from 'react';
import { Search, History, User, FileText } from 'lucide-react';
import { useStore } from '@/store/StoreContext';

export function AuditPage() {
  const { state } = useStore();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = [...state.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(l => l.action.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.user.toLowerCase().includes(q) || l.reason.toLowerCase().includes(q));
    }
    return result;
  }, [state.auditLogs, search]);

  const actionColors: Record<string, string> = {
    ALLOCATION_APPROVED: 'text-emerald-400 bg-emerald-500/10',
    ALLOCATION_EXECUTED: 'text-blue-400 bg-blue-500/10',
    ALLOCATION_OVERRIDE: 'text-amber-400 bg-amber-500/10',
    DECISION_APPROVED: 'text-emerald-400 bg-emerald-500/10',
    DECISION_REJECTED: 'text-red-400 bg-red-500/10',
    EXCEPTION_RESOLVED: 'text-emerald-400 bg-emerald-500/10',
    PICKING_STARTED: 'text-blue-400 bg-blue-500/10',
    PICKING_COMPLETED: 'text-emerald-400 bg-emerald-500/10',
    PACKING_COMPLETED: 'text-emerald-400 bg-emerald-500/10',
    QC_PASSED: 'text-emerald-400 bg-emerald-500/10',
    QC_FAILED: 'text-red-400 bg-red-500/10',
    DISPATCHED: 'text-cyan-400 bg-cyan-500/10',
    ORDER_CANCELLED: 'text-red-400 bg-red-500/10',
    INVENTORY_DAMAGE: 'text-red-400 bg-red-500/10',
    REPLENISHMENT_CREATED: 'text-amber-400 bg-amber-500/10',
    REPLENISHMENT_APPROVED: 'text-emerald-400 bg-emerald-500/10',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
        <p className="text-sm text-slate-400 mt-1">Complete decision and action history with full traceability</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search audit logs..." className="bg-transparent text-sm text-slate-200 placeholder:text-slate-500 outline-none flex-1" />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Action</th>
                <th className="text-left px-4 py-3 font-medium">Entity</th>
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">State Change</th>
                <th className="text-left px-4 py-3 font-medium">Reason</th>
                <th className="text-left px-4 py-3 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${actionColors[log.action] ?? 'text-slate-400 bg-slate-500/10'}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{log.entity} <span className="font-mono text-xs text-slate-500">{log.entityId}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.user}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="text-red-400">{log.previousState}</span>
                    <span className="text-slate-600 mx-1">→</span>
                    <span className="text-emerald-400">{log.newState}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 max-w-xs truncate">{log.reason}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <div className="py-8 text-center text-sm text-slate-500">No audit logs found</div>}
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <History className="w-3.5 h-3.5" />
        Every decision, allocation, and state change is recorded for full operational traceability.
      </div>
    </div>
  );
}
