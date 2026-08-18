import type { Priority, RiskLevel, InventoryStatus, OrderStatus, ExceptionStatus, DecisionStatus } from '@/types';

type BadgeStyle = { bg: string; text: string; border: string; dot: string };

const critical: BadgeStyle = { bg: 'var(--danger-soft)', text: 'var(--danger)', border: 'var(--danger)', dot: 'var(--danger)' };
const high: BadgeStyle = { bg: 'var(--orange-soft)', text: 'var(--orange)', border: 'var(--orange)', dot: 'var(--orange)' };
const medium: BadgeStyle = { bg: 'var(--warning-soft)', text: 'var(--warning)', border: 'var(--warning)', dot: 'var(--warning)' };
const normal: BadgeStyle = { bg: 'var(--primary-soft)', text: 'var(--primary)', border: 'var(--primary)', dot: 'var(--primary)' };
const success: BadgeStyle = { bg: 'var(--success-soft)', text: 'var(--success)', border: 'var(--success)', dot: 'var(--success)' };
const neutral: BadgeStyle = { bg: 'var(--surface-2)', text: 'var(--text-2)', border: 'var(--border)', dot: 'var(--text-muted)' };

function Badge({ children, s, dot }: { children: React.ReactNode; s: BadgeStyle; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />}
      {children}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const s = priority === 'CRITICAL' ? critical : priority === 'HIGH' ? high : priority === 'MEDIUM' ? medium : normal;
  return <Badge s={s} dot>{priority}</Badge>;
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const s = level === 'CRITICAL' ? critical : level === 'HIGH' ? high : level === 'MEDIUM' ? medium : success;
  return <Badge s={s}>{level}</Badge>;
}

export function InvStatusBadge({ status }: { status: InventoryStatus }) {
  const s = status === 'HEALTHY' ? success : status === 'LOW_STOCK' ? medium : status === 'CRITICAL' ? high : status === 'OUT_OF_STOCK' ? critical : neutral;
  return <Badge s={s} dot>{status.replace(/_/g, ' ')}</Badge>;
}

const statusStyle = (status: OrderStatus): BadgeStyle => {
  if (['COMPLETED', 'DISPATCHED'].includes(status)) return success;
  if (['QC_FAILED', 'CANCELLED'].includes(status)) return critical;
  if (['PARTIAL_ALLOCATED', 'HOLD'].includes(status)) return high;
  if (['READY_DISPATCH', 'QC_PENDING'].includes(status)) return medium;
  return normal;
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) { return <Badge s={statusStyle(status)}>{status.replace(/_/g, ' ')}</Badge>; }
export function DecisionStatusBadge({ status }: { status: DecisionStatus }) { return <Badge s={status === 'EXECUTED' || status === 'APPROVED' ? success : status === 'REJECTED' ? critical : medium}>{status}</Badge>; }
export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) { return <Badge s={status === 'RESOLVED' || status === 'VERIFIED' ? success : status === 'DETECTED' ? critical : medium}>{status}</Badge>; }

export function getInventoryStatus(available: number, safety: number, reorder: number): InventoryStatus {
  if (available === 0) return 'OUT_OF_STOCK';
  if (available <= safety * 0.5) return 'CRITICAL';
  if (available <= safety || available <= reorder) return 'LOW_STOCK';
  return 'HEALTHY';
}
