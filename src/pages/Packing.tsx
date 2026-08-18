import { useMemo } from 'react';
import { Box, CheckCircle2, ClipboardCheck, AlertTriangle, Truck, XCircle } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { toast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import { useState } from 'react';
import type { PackingTask, QualityCheck } from '@/types';

export function PackingPage() {
  const { state, dispatch } = useStore();
  const [selectedTask, setSelectedTask] = useState<PackingTask | null>(null);
  const [qcOrder, setQcOrder] = useState<string | null>(null);

  const packingTasks = useMemo(() => state.packingTasks.sort((a, b) => {
    const order = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 };
    return order[a.status] - order[b.status];
  }), [state.packingTasks]);

  const qcChecks = useMemo(() => state.qualityChecks.filter(q => q.status === 'PENDING'), [state.qualityChecks]);

  const currentTask = selectedTask ? state.packingTasks.find(t => t.id === selectedTask.id) ?? selectedTask : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Packing & Quality Control</h1>
        <p className="text-sm text-slate-400 mt-1">Packing checklist verification and quality assurance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Pending Pack" value={packingTasks.filter(t => t.status === 'PENDING').length} color="text-amber-400" />
        <StatChip label="In Progress" value={packingTasks.filter(t => t.status === 'IN_PROGRESS').length} color="text-blue-400" />
        <StatChip label="Completed" value={packingTasks.filter(t => t.status === 'COMPLETED').length} color="text-emerald-400" />
        <StatChip label="QC Pending" value={qcChecks.length} color="text-teal-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Packing tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white">Packing Tasks</h2>
          </div>
          <div className="space-y-3">
            {packingTasks.map(task => {
              const order = state.orders.find(o => o.id === task.orderId);
              const doneCount = task.checklist.filter(c => c.done).length;
              const allDone = doneCount === task.checklist.length;
              return (
                <div key={task.id} className="glass-card rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-base font-bold text-blue-400 font-mono">#{task.orderId}</span>
                      <p className="text-sm text-slate-400">{order?.customer}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                      'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>{task.status.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                    <span>Station: {task.station}</span>
                    <span>·</span>
                    <span>Package: {task.packageType}</span>
                    <span>·</span>
                    <span>{task.items.length} items</span>
                  </div>
                  {task.status !== 'COMPLETED' && (
                    <>
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-slate-500">Checklist</span>
                          <span className="text-xs text-slate-300">{doneCount}/{task.checklist.length}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(doneCount / task.checklist.length) * 100}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 text-sm font-semibold hover:bg-blue-500/25 transition-all w-full justify-center"
                      >
                        <ClipboardCheck className="w-4 h-4" /> {task.status === 'PENDING' ? 'Start Packing' : 'Continue Packing'}
                      </button>
                    </>
                  )}
                  {task.status === 'COMPLETED' && (
                    <div className="flex items-center gap-2 text-sm text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> Packing completed — sent to QC
                    </div>
                  )}
                </div>
              );
            })}
            {packingTasks.length === 0 && <div className="glass-card rounded-2xl p-6 text-center text-sm text-slate-500">No packing tasks. Complete picking to generate packing tasks.</div>}
          </div>
        </div>

        {/* QC tasks */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardCheck className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold text-white">Quality Checks</h2>
          </div>
          <div className="space-y-3">
            {qcChecks.map(qc => {
              const order = state.orders.find(o => o.id === qc.orderId);
              return (
                <div key={qc.id} className="glass-card rounded-2xl p-4 border-teal-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-base font-bold text-blue-400 font-mono">#{qc.orderId}</span>
                      <p className="text-sm text-slate-400">{order?.customer}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold border bg-teal-500/15 text-teal-400 border-teal-500/30">PENDING</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{order?.items.map(i => `${i.quantity}× ${i.sku}`).join(', ')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { dispatch({ type: 'QC_PASS', orderId: qc.orderId }); toast('success', `QC passed — Order #${qc.orderId} ready for dispatch`); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-sm font-semibold hover:bg-emerald-500/25 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Pass
                    </button>
                    <button
                      onClick={() => setQcOrder(qc.orderId)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-all"
                    >
                      <XCircle className="w-4 h-4" /> Fail
                    </button>
                  </div>
                </div>
              );
            })}
            {qcChecks.length === 0 && <div className="glass-card rounded-2xl p-6 text-center text-sm text-slate-500">No pending quality checks.</div>}
          </div>

          {/* Recent QC results */}
          {state.qualityChecks.filter(q => q.status !== 'PENDING').length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-300 mb-2">Recent QC Results</h3>
              <div className="space-y-2">
                {state.qualityChecks.filter(q => q.status !== 'PENDING').slice(0, 5).map(qc => (
                  <div key={qc.id} className="flex items-center gap-2 rounded-xl bg-slate-800/30 border border-slate-700/20 p-2.5">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${qc.status === 'PASS' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{qc.status}</span>
                    <span className="text-sm text-slate-300 font-mono">#{qc.orderId}</span>
                    {qc.status === 'FAIL' && <span className="text-xs text-slate-500">{qc.failures.map(f => f.issue).join(', ')}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Packing detail modal */}
      <Modal open={!!currentTask} onClose={() => setSelectedTask(null)} title={`Packing — Order #${currentTask?.orderId}`} size="md">
        {currentTask && <PackingDetail task={currentTask} onComplete={() => { dispatch({ type: 'COMPLETE_PACKING', taskId: currentTask.id }); toast('success', `Packing completed for Order #${currentTask.orderId}`); setSelectedTask(null); }} />}
      </Modal>

      {/* QC Fail modal */}
      <Modal open={!!qcOrder} onClose={() => setQcOrder(null)} title="Report QC Failure" size="md">
        {qcOrder && <QCFailForm orderId={qcOrder} onSubmit={(failures) => { dispatch({ type: 'QC_FAIL', orderId: qcOrder, failures }); toast('warning', `QC failed for Order #${qcOrder} — exception created`); setQcOrder(null); }} />}
      </Modal>
    </div>
  );
}

function PackingDetail({ task, onComplete }: { task: PackingTask; onComplete: () => void }) {
  const { dispatch } = useStore();
  const allDone = task.checklist.every(c => c.done);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
          <p className="text-xs text-slate-500">Station</p>
          <p className="text-sm font-semibold text-slate-200">{task.station}</p>
        </div>
        <div className="rounded-xl bg-slate-800/30 border border-slate-700/20 p-3">
          <p className="text-xs text-slate-500">Package Type</p>
          <p className="text-sm font-semibold text-slate-200">{task.packageType}</p>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-2">Packing Checklist</h4>
        <div className="space-y-2">
          {task.checklist.map((item, i) => (
            <button
              key={i}
              onClick={() => dispatch({ type: 'TOGGLE_PACKING_CHECKLIST', taskId: task.id, index: i })}
              className={`w-full flex items-center gap-3 rounded-xl p-3 border transition-all text-left ${
                item.done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-800/30 border-slate-700/20 hover:bg-slate-700/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${item.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                {item.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <span className={`text-sm ${item.done ? 'text-slate-300' : 'text-slate-400'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {allDone && (
        <button onClick={onComplete} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-semibold hover:bg-emerald-500/30 transition-all w-full justify-center">
          <CheckCircle2 className="w-4.5 h-4.5" /> Complete Packing & Send to QC
        </button>
      )}
    </div>
  );
}

function QCFailForm({ orderId, onSubmit }: { orderId: string; onSubmit: (failures: { productId: string; issue: string; quantity: number }[]) => void }) {
  const { state } = useStore();
  const order = state.orders.find(o => o.id === orderId);
  const [issue, setIssue] = useState('Damaged product');
  const [productId, setProductId] = useState(order?.items[0]?.productId ?? '');
  const [quantity, setQuantity] = useState(1);

  const issues = ['Damaged product', 'Missing item', 'Wrong SKU', 'Wrong quantity', 'Packaging problem'];

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3">
        <p className="text-sm text-red-300">Report a quality check failure for Order #{orderId}. This will create an exception and block dispatch.</p>
      </div>
      <div>
        <label className="text-xs text-slate-500 uppercase font-semibold">Product</label>
        <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-800/40 border border-slate-700/30 px-3 py-2 text-sm text-slate-200 outline-none">
          {order?.items.map(i => { const p = state.products.find(p => p.id === i.productId); return <option key={i.productId} value={i.productId}>{p?.sku} — {p?.name}</option>; })}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 uppercase font-semibold">Issue Type</label>
        <select value={issue} onChange={e => setIssue(e.target.value)} className="w-full mt-1 rounded-xl bg-slate-800/40 border border-slate-700/30 px-3 py-2 text-sm text-slate-200 outline-none">
          {issues.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-500 uppercase font-semibold">Quantity Affected</label>
        <input type="number" min={1} max={10} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-full mt-1 rounded-xl bg-slate-800/40 border border-slate-700/30 px-3 py-2 text-sm text-slate-200 outline-none" />
      </div>
      <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
        <p className="text-xs text-amber-300">Recommended resolution: Find replacement unit. Reallocate. Update damaged inventory. Resume QC.</p>
      </div>
      <button onClick={() => onSubmit([{ productId, issue, quantity }])} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-sm font-semibold hover:bg-red-500/25 transition-all w-full justify-center">
        <AlertTriangle className="w-4.5 h-4.5" /> Report Failure & Create Exception
      </button>
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="glass-card rounded-xl p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p></div>;
}
