import { useState } from 'react';
import { User, Shield, Bell, Database, Palette, Building2, Save } from 'lucide-react';
import { useStore } from '@/store/StoreContext';
import { useTheme, type Theme } from '@/hooks/useTheme';
import { toast } from '@/components/Toast';

export function SettingsPage() {
  const { state } = useStore();
  const { theme, toggle } = useTheme();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [autoAlloc, setAutoAlloc] = useState(false);
  const [slaAlerts, setSlaAlerts] = useState(true);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Manage your account, preferences, and system configuration</p>
      </div>

      {/* Profile */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Profile</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Name</label>
            <input value={state.currentUser.name} readOnly className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Email</label>
            <input value={state.currentUser.email} readOnly className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Role</label>
            <input value={state.currentUser.role} readOnly className="w-full rounded-lg px-3 py-2 text-sm capitalize outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Warehouse</label>
            <input value="WH1 — Main Distribution Center" readOnly className="w-full rounded-lg px-3 py-2 text-sm outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }} />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Appearance</h2>
        </div>
        <div className="flex items-center justify-between rounded-lg p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Theme</p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{theme === 'light' ? 'Light mode is active' : 'Dark mode is active'}</p>
          </div>
          <button
            onClick={toggle}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Preferences</h2>
        </div>
        <div className="space-y-3">
          <ToggleRow label="Push notifications" desc="Receive real-time alerts for critical events" checked={notifEnabled} onChange={setNotifEnabled} />
          <ToggleRow label="Auto-allocation" desc="Automatically allocate inventory when orders are created" checked={autoAlloc} onChange={setAutoAlloc} />
          <ToggleRow label="SLA breach alerts" desc="Get notified when orders are at risk of missing SLA" checked={slaAlerts} onChange={setSlaAlerts} />
        </div>
      </div>

      {/* System info */}
      <div className="glass-card rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" style={{ color: 'var(--primary)' }} />
          <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>System</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InfoTile label="Total SKUs" value={state.products.length} />
          <InfoTile label="Active Orders" value={state.orders.filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)).length} />
          <InfoTile label="Open Exceptions" value={state.exceptions.filter(e => e.status !== 'RESOLVED').length} />
          <InfoTile label="Pending Decisions" value={state.decisions.filter(d => d.status === 'PENDING').length} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => toast('success', 'Settings saved')}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ background: 'var(--primary)' }}
        >
          <Save className="h-4 w-4" /> Save Changes
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</p>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? 'var(--primary)' : 'var(--border)' }}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform" style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} />
      </button>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface-2)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  );
}
