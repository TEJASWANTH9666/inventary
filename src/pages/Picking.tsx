import { useMemo, useState } from 'react';
import { MapPin, Play, CheckCircle2, Clock, Route, Zap, Package } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { toast } from '@/components/Toast';
import { Modal } from '@/components/Modal';
import type { PickingTask, PickItemStatus } from '@/types';

export function PickingPage() {
  const { state, dispatch } = useStore();
  const [selectedTask, setSelectedTask] = useState<PickingTask | null>(null);

  const tasks = useMemo(() => {
    return state.pickingTasks.sort((a, b) => {
      const order = { PENDING: 0, IN_PROGRESS: 1, COMPLETED: 2 };
      return order[a.status] - order[b.status];
    });
  }, [state.pickingTasks]);

  const currentTask = selectedTask ? state.pickingTasks.find(t => t.id === selectedTask.id) ?? selectedTask : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Picking Operations</h1>
        <p className="text-sm text-slate-400 mt-1">Optimized pick routes with real-time worker assignments</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Pending" value={tasks.filter(t => t.status === 'PENDING').length} color="text-amber-400" />
        <StatChip label="In Progress" value={tasks.filter(t => t.status === 'IN_PROGRESS').length} color="text-blue-400" />
        <StatChip label="Completed" value={tasks.filter(t => t.status === 'COMPLETED').length} color="text-emerald-400" />
        <StatChip label="Avg Efficiency" value={`${Math.round(tasks.reduce((s, t) => s + t.efficiencyScore, 0) / Math.max(1, tasks.length))}%`} color="text-slate-200" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {tasks.map(task => {
          const order = state.orders.find(o => o.id === task.orderId);
          const worker = state.users.find(u => u.id === task.workerId);
          const pickedCount = task.items.filter(i => i.status !== 'PENDING').length;
          const progress = Math.round((pickedCount / task.items.length) * 100);
          return (
            <div key={task.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-400 font-mono">#{task.orderId}</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border ${
                      task.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                      task.status === 'IN_PROGRESS' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' :
                      'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    }`}>{task.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">{order?.customer} · {order?.items.map(i => `${i.quantity}× ${i.sku}`).join(', ')}</p>
                  {worker && <p className="text-xs text-slate-500 mt-1">Worker: {worker.name}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Efficiency</p>
                  <p className="text-lg font-bold text-slate-200">{task.efficiencyScore}%</p>
                </div>
              </div>

              {/* Route summary */}
              <div className="flex items-center gap-2 mb-3 text-xs text-slate-400">
                <Route className="w-3.5 h-3.5" />
                <span>{task.stops} stops · {task.estimatedDistance}m · ~{task.estimatedTimeMin}min</span>
                <span className="text-slate-600">·</span>
                <span>Congestion: {task.zoneCongestion}%</span>
              </div>

              {/* Progress */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">Pick Progress</span>
                  <span className="text-xs text-slate-300">{pickedCount}/{task.items.length}</span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full ${task.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'} transition-all duration-500`} style={{ width: `${progress}%` }} />
                </div>
              </div>

              <button
                onClick={() => { setSelectedTask(task); if (task.status === 'PENDING') { dispatch({ type: 'START_PICKING', taskId: task.id }); toast('info', `Picking started for Order #${task.orderId}`); } }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 text-sm font-semibold hover:bg-blue-500/25 transition-all w-full justify-center"
              >
                {task.status === 'PENDING' ? <><Play className="w-4 h-4" /> Start Picking</> : task.status === 'IN_PROGRESS' ? <><MapPin className="w-4 h-4" /> Continue Picking</> : <><CheckCircle2 className="w-4 h-4" /> View Completed Route</>}
              </button>
            </div>
          );
        })}
      </div>

      {tasks.length === 0 && <div className="glass-card rounded-2xl p-8 text-center"><Package className="w-12 h-12 text-slate-600 mx-auto mb-3" /><p className="text-slate-400">No picking tasks. Allocate orders to generate pick routes.</p></div>}

      {/* Picking detail modal */}
      <Modal open={!!currentTask} onClose={() => setSelectedTask(null)} title={`Pick Route — Order #${currentTask?.orderId}`} size="lg">
        {currentTask && <PickingDetail task={currentTask} onComplete={() => { dispatch({ type: 'COMPLETE_PICKING', taskId: currentTask.id }); toast('success', `Picking completed for Order #${currentTask.orderId}`); setSelectedTask(null); }} />}
      </Modal>
    </div>
  );
}

function PickingDetail({ task, onComplete }: { task: PickingTask; onComplete: () => void }) {
  const { state, dispatch } = useStore();
  const allPicked = task.items.every(i => i.status === 'PICKED' || i.status === 'VERIFIED');

  const cycleStatus = (itemIndex: number, current: PickItemStatus) => {
    const next: PickItemStatus = current === 'PENDING' ? 'PICKED' : current === 'PICKED' ? 'VERIFIED' : 'VERIFIED';
    dispatch({ type: 'UPDATE_PICK_ITEM', taskId: task.id, itemIndex, status: next });
    if (next === 'PICKED') toast('success', `Item picked: ${task.items[itemIndex].sku}`);
  };

  return (
    <div className="space-y-5">
      {/* Route visualization */}
      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-3">Recommended Pick Route</h4>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin pb-2">
          {/* Packing station start */}
          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <Package className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1">Pack Stn</span>
          </div>
          {task.route.map((loc, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div className="flex items-center text-slate-600">
                <div className="w-4 h-0.5 bg-slate-700" />
                <span className="text-xs">→</span>
                <div className="w-4 h-0.5 bg-slate-700" />
              </div>
              <div className="flex flex-col items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl border ${
                  task.items[i]?.status === 'VERIFIED' ? 'bg-emerald-500/15 border-emerald-500/30' :
                  task.items[i]?.status === 'PICKED' ? 'bg-blue-500/15 border-blue-500/30' :
                  'bg-slate-800/40 border-slate-700/30'
                }`}>
                  <MapPin className={`w-5 h-5 ${task.items[i]?.status === 'PENDING' ? 'text-slate-500' : 'text-blue-400'}`} />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">{loc.zone}-{loc.rack}-{loc.shelf}-{loc.bin}</span>
              </div>
            </div>
          ))}
          {/* Return to packing */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center text-slate-600">
              <div className="w-4 h-0.5 bg-slate-700" />
              <span className="text-xs">→</span>
              <div className="w-4 h-0.5 bg-slate-700" />
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                <Package className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-[10px] text-slate-500 mt-1">Pack Stn</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-400" /> {task.estimatedDistance}m total</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" /> ~{task.estimatedTimeMin}min</span>
          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {task.stops} stops</span>
        </div>
      </div>

      {/* Pick items */}
      <div>
        <h4 className="text-sm font-bold text-slate-200 mb-2">Pick Items</h4>
        <div className="space-y-2">
          {task.items.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
              item.status === 'VERIFIED' ? 'bg-emerald-500/5 border-emerald-500/20' :
              item.status === 'PICKED' ? 'bg-blue-500/5 border-blue-500/20' :
              'bg-slate-800/30 border-slate-700/20'
            }`}>
              <div className="flex flex-col items-center">
                <span className={`w-2.5 h-2.5 rounded-full ${item.status === 'PENDING' ? 'bg-slate-600' : item.status === 'PICKED' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-mono text-blue-400 font-medium">{item.sku}</p>
                <p className="text-xs text-slate-400">{item.productName} · Qty: {item.quantity}</p>
                <p className="text-xs text-slate-500 font-mono">{item.location.warehouse} / Zone {item.location.zone} / Rack {item.location.rack} / Shelf {item.location.shelf} / Bin {item.location.bin}</p>
              </div>
              <button
                onClick={() => cycleStatus(i, item.status)}
                disabled={item.status === 'VERIFIED'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  item.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default' :
                  item.status === 'PICKED' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25' :
                  'bg-slate-700/30 text-slate-300 border-slate-600/30 hover:bg-slate-700/50'
                }`}
              >
                {item.status === 'PENDING' ? 'Mark Picked' : item.status === 'PICKED' ? 'Verify' : 'Verified'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {allPicked && task.status !== 'COMPLETED' && (
        <button onClick={onComplete} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-sm font-semibold hover:bg-emerald-500/30 transition-all w-full justify-center">
          <CheckCircle2 className="w-4.5 h-4.5" /> Complete Picking & Send to Packing
        </button>
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className="glass-card rounded-xl p-3"><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p></div>;
}
