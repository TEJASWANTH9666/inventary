import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface Toast { id: string; type: ToastType; message: string; }

let toastFn: ((type: ToastType, message: string) => void) | null = null;
export function toast(type: ToastType, message: string) { toastFn?.(type, message); }

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);
  const add = useCallback((type: ToastType, message: string) => { const id = `toast-${Date.now()}-${Math.random()}`; setToasts(t => [...t, { id, type, message }]); setTimeout(() => remove(id), 4000); }, [remove]);
  useEffect(() => { toastFn = add; }, [add]);

  const config = {
    success: { border: 'var(--success)', soft: 'var(--success-soft)', icon: 'var(--success)', Icon: CheckCircle2 },
    error: { border: 'var(--danger)', soft: 'var(--danger-soft)', icon: 'var(--danger)', Icon: XCircle },
    warning: { border: 'var(--warning)', soft: 'var(--warning-soft)', icon: 'var(--warning)', Icon: AlertTriangle },
    info: { border: 'var(--primary)', soft: 'var(--primary-soft)', icon: 'var(--primary)', Icon: Info },
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map(t => {
        const c = config[t.type];
        return (
          <div key={t.id} className="flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg animate-slide-up" style={{ border: `1px solid ${c.border}`, background: c.soft }}>
            <c.Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: c.icon }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
