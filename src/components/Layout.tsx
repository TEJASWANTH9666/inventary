import { useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingCart, GitBranch, MapPin, Box,
  Truck, AlertTriangle, BarChart3, Sparkles, Settings, Bell, Search,
  Warehouse, ChevronDown, Menu, X, History, Sun, Moon,
} from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { toast } from '@/components/Toast';
import { useTheme } from '@/hooks/useTheme';

export type Page = 'dashboard' | 'inventory' | 'orders' | 'allocation' | 'picking' | 'packing' | 'dispatch' | 'exceptions' | 'analytics' | 'copilot' | 'audit' | 'settings';
interface NavItem { id: Page; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; }

const sections: { label: string; items: NavItem[] }[] = [
  { label: 'Operations', items: [
    { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'allocation', label: 'Allocation', icon: GitBranch },
  ] },
  { label: 'Fulfillment', items: [
    { id: 'picking', label: 'Picking', icon: MapPin },
    { id: 'packing', label: 'Packing', icon: Box },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
  ] },
  { label: 'Intelligence', items: [
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
  ] },
  { label: 'System', items: [
    { id: 'audit', label: 'Audit Log', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] },
];

const roleLabels: Record<string, string> = { manager: 'Warehouse Manager', worker: 'Warehouse Worker', inventory: 'Inventory Manager' };

export function Layout({ page, setPage, children }: { page: Page; setPage: (p: Page) => void; children: React.ReactNode }) {
  const { state, dispatch } = useStore();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitch, setShowRoleSwitch] = useState(false);
  const unreadCount = state.notifications.filter(n => !n.read).length;


  const navigate = (next: Page) => { setPage(next); setMobileOpen(false); };

  return (
    <div className="min-h-screen text-slate-900" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <aside className={`fixed left-0 top-0 z-40 h-screen w-[248px] transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <div className="flex h-[72px] items-center gap-3 px-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: 'var(--primary-soft)', border: '1px solid var(--primary)' }}>
            <Warehouse className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>WAREZAI</h1>
            <p className="text-[9px] font-semibold tracking-[0.13em] uppercase" style={{ color: 'var(--text-muted)' }}>Decision Intelligence</p>
          </div>
          <button onClick={() => setMobileOpen(false)} className="ml-auto p-1 lg:hidden" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <nav className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
          {sections.map(section => (
            <div key={section.label} className="mb-5">
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>{section.label}</p>
              <div className="space-y-1">
                {section.items.map(item => {
                  const active = page === item.id;
                  const Icon = item.icon;
                  const badge = item.id === 'exceptions' ? state.exceptions.filter(e => e.status === 'DETECTED').length : 0;
                  return (
                    <button key={item.id} onClick={() => navigate(item.id)} className="group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-all" style={active ? { background: 'var(--surface-active)', color: 'var(--primary)' } : { color: 'var(--text-2)' }}>
                      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full" style={{ background: 'var(--primary)' }} />}
                      <Icon className="w-[18px] h-[18px]" style={active ? { color: 'var(--primary)' } : { color: 'var(--text-muted)' }} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {badge > 0 && <span className="min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{badge}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'var(--overlay)' }} onClick={() => setMobileOpen(false)} />}

      <div className="lg:ml-[248px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 px-4 lg:px-8" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 lg:hidden" style={{ color: 'var(--text-2)' }}><Menu className="w-5 h-5" /></button>
          <div className="hidden items-center gap-2 text-[13px] sm:flex"><span style={{ color: 'var(--text-muted)' }}>WarezAI</span><span style={{ color: 'var(--text-muted)' }}>/</span><span className="font-medium" style={{ color: 'var(--text)' }}>{sections.flatMap(s => s.items).find(n => n.id === page)?.label ?? 'Settings'}</span></div>
          <div className="flex-1" />
          <div className="hidden md:flex h-10 w-64 lg:w-80 items-center gap-2 rounded-[10px] px-3 shadow-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}><Search className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /><input placeholder="Search orders, SKUs, products, locations..." className="w-full bg-transparent text-xs outline-none" style={{ color: 'var(--text)' }} /></div>
          <button
            onClick={toggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: theme === 'dark' ? '#fbbf24' : '#475569' }}
          >
            {theme === 'light' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          <div className="relative">
            <button onClick={() => setShowRoleSwitch(!showRoleSwitch)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{state.currentUser.name.split(' ').map(n => n[0]).join('')}</div>
              <div className="hidden text-left sm:block"><p className="max-w-[110px] truncate text-[11px] font-semibold" style={{ color: 'var(--text)' }}>{state.currentUser.name}</p><p className="max-w-[110px] truncate text-[9px]" style={{ color: 'var(--text-muted)' }}>{roleLabels[state.currentUser.role]}</p></div>
              <ChevronDown className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
            {showRoleSwitch && <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl p-2 shadow-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>{(['manager', 'worker', 'inventory'] as const).map(role => { const user = state.users.find(u => u.role === role)!; return <button key={role} onClick={() => { dispatch({ type: 'SET_ROLE', role }); setShowRoleSwitch(false); toast('info', `Switched to ${roleLabels[role]}`); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-slate-50"><span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{user.name.split(' ').map(n => n[0]).join('')}</span><span className="text-xs" style={{ color: 'var(--text-2)' }}>{roleLabels[role]}</span></button>; })}</div>}
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
