import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handler);
      document.body.style.overflow = 'hidden';
      return () => { window.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }
  }, [open, onClose]);

  if (!open) return null;
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'var(--overlay)' }} />
      <div className={`relative w-full ${sizes[size]} max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl animate-slide-up`} style={{ border: '1px solid var(--border)', background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors" style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
