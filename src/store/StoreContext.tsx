import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type {
  AppState, Order, Allocation, Decision, AuditLog, Notification,
  ReplenishmentRequest, Exception, PickingTask, PackingTask, QualityCheck,
  Inventory, InventoryTransaction, Dispatch, User, Role, Priority, RiskLevel,
  PickItemStatus, PickingTaskStatus,
} from '@/types';
import {
  seedUsers, seedProducts, seedInventory, seedTransactions, seedOrders,
  seedAllocations, seedPickingTasks, seedPackingTasks, seedQualityChecks,
  seedExceptions, seedReplenishments, seedDispatches, seedNotifications,
  seedDecisions, seedAuditLogs, seedWorkerAssignments,
} from '@/data/seed';
import {
  calculatePriorityScore, calculateRisk, determineAllocation,
  checkReplenishment, generateDecisions, calculateHealth, optimizePickRoute,
} from '@/lib/engine';

// ─── State ────────────────────────────────────────────────
interface State extends AppState {}

const initialState: State = {
  currentUser: seedUsers[0],
  users: seedUsers,
  products: seedProducts,
  inventory: seedInventory,
  transactions: seedTransactions,
  orders: seedOrders,
  allocations: seedAllocations,
  pickingTasks: seedPickingTasks,
  packingTasks: seedPackingTasks,
  qualityChecks: seedQualityChecks,
  exceptions: seedExceptions,
  replenishments: seedReplenishments,
  dispatches: seedDispatches,
  notifications: seedNotifications,
  decisions: seedDecisions,
  auditLogs: seedAuditLogs,
  workerAssignments: seedWorkerAssignments,
};

// Initialize priority/risk scores for all orders
for (const order of initialState.orders) {
  const { score, priority, reasons } = calculatePriorityScore(order, initialState.inventory, initialState.orders);
  order.priorityScore = score;
  order.priority = priority;
  const { level, reasons: riskReasons } = calculateRisk(order, initialState.inventory);
  order.riskLevel = level;
  order.riskReasons = riskReasons;
}

// ─── Actions ──────────────────────────────────────────────
type Action =
  | { type: 'SET_ROLE'; role: Role }
  | { type: 'APPROVE_DECISION'; decisionId: string }
  | { type: 'REJECT_DECISION'; decisionId: string }
  | { type: 'EXECUTE_ALLOCATION'; decisionId: string }
  | { type: 'EXECUTE_REPLENISHMENT'; decisionId: string }
  | { type: 'EXECUTE_BOTTLENECK'; decisionId: string }
  | { type: 'RESOLVE_EXCEPTION'; exceptionId: string; resolution: string }
  | { type: 'START_PICKING'; taskId: string }
  | { type: 'UPDATE_PICK_ITEM'; taskId: string; itemIndex: number; status: PickItemStatus }
  | { type: 'COMPLETE_PICKING'; taskId: string }
  | { type: 'TOGGLE_PACKING_CHECKLIST'; taskId: string; index: number }
  | { type: 'COMPLETE_PACKING'; taskId: string }
  | { type: 'QC_PASS'; orderId: string }
  | { type: 'QC_FAIL'; orderId: string; failures: { productId: string; issue: string; quantity: number }[] }
  | { type: 'DISPATCH_ORDER'; orderId: string }
  | { type: 'CREATE_REPLENISHMENT'; productId: string }
  | { type: 'APPROVE_REPLENISHMENT'; requestId: string }
  | { type: 'MARK_NOTIFICATION_READ'; notificationId: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CANCEL_ORDER'; orderId: string }
  | { type: 'OVERRIDE_ALLOCATION'; orderId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, currentUser: state.users.find(u => u.role === action.role) ?? state.users[0] };

    case 'APPROVE_DECISION': {
      const decision = state.decisions.find(d => d.id === action.decisionId);
      if (!decision) return state;
      const newDecisions = state.decisions.map(d =>
        d.id === action.decisionId
          ? { ...d, status: 'APPROVED' as const, approvedBy: state.currentUser.name, approvedAt: new Date().toISOString() }
          : d
      );
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'DECISION_APPROVED',
        entity: 'Decision',
        entityId: action.decisionId,
        user: state.currentUser.name,
        previousState: 'PENDING',
        newState: 'APPROVED',
        reason: decision.title,
        timestamp: new Date().toISOString(),
      };

      // Execute based on decision type
      if (decision.type === 'ALLOCATION' && decision.relatedOrderId) {
        return executeAllocation(state, decision, newDecisions, audit);
      }
      if (decision.type === 'REPLENISHMENT' && decision.relatedProductId) {
        const newReplens = [...state.replenishments];
        const existing = newReplens.find(r => r.productId === decision.relatedProductId);
        if (!existing) {
          const product = state.products.find(p => p.id === decision.relatedProductId);
          const inv = state.inventory.filter(i => i.productId === decision.relatedProductId);
          if (product && inv.length > 0) {
            newReplens.unshift({
              id: `r-${Date.now()}`,
              productId: product.id,
              sku: product.sku,
              productName: product.name,
              available: inv.reduce((s, i) => s + i.availableQuantity, 0),
              pendingDemand: state.orders.flatMap(o => o.items).filter(i => i.productId === product.id).reduce((s, i) => s + i.quantity, 0),
              incoming: inv.reduce((s, i) => s + i.incomingQuantity, 0),
              safetyStock: inv[0].safetyStock,
              recommendedQty: 30,
              risk: 'HIGH',
              status: 'APPROVED',
              createdAt: new Date().toISOString(),
              approvedBy: state.currentUser.name,
            });
          }
        }
        return {
          ...state,
          decisions: newDecisions.map(d => d.id === action.decisionId ? { ...d, status: 'EXECUTED' as const, executedAt: new Date().toISOString() } : d),
          replenishments: newReplens,
          auditLogs: [audit, ...state.auditLogs],
        };
      }
      if (decision.type === 'BOTTLENECK') {
        return {
          ...state,
          decisions: newDecisions.map(d => d.id === action.decisionId ? { ...d, status: 'EXECUTED' as const, executedAt: new Date().toISOString() } : d),
          auditLogs: [audit, ...state.auditLogs],
        };
      }
      return { ...state, decisions: newDecisions, auditLogs: [audit, ...state.auditLogs] };
    }

    case 'REJECT_DECISION': {
      const decision = state.decisions.find(d => d.id === action.decisionId);
      if (!decision) return state;
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'DECISION_REJECTED',
        entity: 'Decision',
        entityId: action.decisionId,
        user: state.currentUser.name,
        previousState: 'PENDING',
        newState: 'REJECTED',
        reason: decision.title,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        decisions: state.decisions.map(d => d.id === action.decisionId ? { ...d, status: 'REJECTED' as const } : d),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'RESOLVE_EXCEPTION': {
      const exc = state.exceptions.find(e => e.id === action.exceptionId);
      if (!exc) return state;
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'EXCEPTION_RESOLVED',
        entity: 'Exception',
        entityId: action.exceptionId,
        user: state.currentUser.name,
        previousState: exc.status,
        newState: 'RESOLVED',
        reason: action.resolution,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        exceptions: state.exceptions.map(e =>
          e.id === action.exceptionId
            ? { ...e, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString(), resolution: action.resolution }
            : e
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'START_PICKING': {
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'PICKING_STARTED',
        entity: 'PickingTask',
        entityId: action.taskId,
        user: state.currentUser.name,
        previousState: 'PENDING',
        newState: 'IN_PROGRESS',
        reason: 'Worker started picking route',
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        pickingTasks: state.pickingTasks.map(t =>
          t.id === action.taskId ? { ...t, status: 'IN_PROGRESS' as const, startedAt: new Date().toISOString() } : t
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'UPDATE_PICK_ITEM': {
      return {
        ...state,
        pickingTasks: state.pickingTasks.map(t =>
          t.id === action.taskId
            ? {
                ...t,
                items: t.items.map((item, i) =>
                  i === action.itemIndex ? { ...item, status: action.status } : item
                ),
              }
            : t
        ),
      };
    }

    case 'COMPLETE_PICKING': {
      const task = state.pickingTasks.find(t => t.id === action.taskId);
      if (!task) return state;
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'PICKING_COMPLETED',
        entity: 'PickingTask',
        entityId: action.taskId,
        user: state.currentUser.name,
        previousState: 'IN_PROGRESS',
        newState: 'COMPLETED',
        reason: `Order #${task.orderId} picked`,
        timestamp: new Date().toISOString(),
      };
      // Create packing task
      const order = state.orders.find(o => o.id === task.orderId);
      const newPackingTask: PackingTask | null = order ? {
        id: `pa-${Date.now()}`,
        orderId: task.orderId,
        workerId: null,
        items: order.items,
        packageType: order.items.some(i => i.sku.includes('MON') || i.sku.includes('DSK')) ? 'LARGE' : 'STANDARD',
        station: 'PACK-1',
        checklist: [
          { label: 'Correct SKU verified', done: false },
          { label: 'Correct quantity verified', done: false },
          { label: 'Packaging condition checked', done: false },
          { label: 'Label verified', done: false },
          { label: 'Accessories included', done: false },
        ],
        status: 'PENDING',
      } : null;
      return {
        ...state,
        pickingTasks: state.pickingTasks.map(t =>
          t.id === action.taskId ? { ...t, status: 'COMPLETED' as const, completedAt: new Date().toISOString() } : t
        ),
        orders: state.orders.map(o =>
          o.id === task.orderId ? { ...o, status: 'PACKING' as const } : o
        ),
        packingTasks: newPackingTask ? [...state.packingTasks, newPackingTask] : state.packingTasks,
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'TOGGLE_PACKING_CHECKLIST': {
      return {
        ...state,
        packingTasks: state.packingTasks.map(t =>
          t.id === action.taskId
            ? {
                ...t,
                status: 'IN_PROGRESS' as const,
                startedAt: t.startedAt ?? new Date().toISOString(),
                checklist: t.checklist.map((c, i) => i === action.index ? { ...c, done: !c.done } : c),
              }
            : t
        ),
      };
    }

    case 'COMPLETE_PACKING': {
      const task = state.packingTasks.find(t => t.id === action.taskId);
      if (!task) return state;
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'PACKING_COMPLETED',
        entity: 'PackingTask',
        entityId: action.taskId,
        user: state.currentUser.name,
        previousState: 'IN_PROGRESS',
        newState: 'COMPLETED',
        reason: `Order #${task.orderId} packed`,
        timestamp: new Date().toISOString(),
      };
      const newQC: QualityCheck = {
        id: `qc-${Date.now()}`,
        orderId: task.orderId,
        inspectorId: null,
        status: 'PENDING',
        failures: [],
      };
      return {
        ...state,
        packingTasks: state.packingTasks.map(t =>
          t.id === action.taskId ? { ...t, status: 'COMPLETED' as const, completedAt: new Date().toISOString() } : t
        ),
        orders: state.orders.map(o =>
          o.id === task.orderId ? { ...o, status: 'QC_PENDING' as const } : o
        ),
        qualityChecks: [...state.qualityChecks, newQC],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'QC_PASS': {
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'QC_PASSED',
        entity: 'QualityCheck',
        entityId: action.orderId,
        user: state.currentUser.name,
        previousState: 'PENDING',
        newState: 'PASS',
        reason: 'Quality check passed',
        timestamp: new Date().toISOString(),
      };
      const newDispatch: Dispatch = {
        id: `d-${Date.now()}`,
        orderId: action.orderId,
        carrier: 'FedEx Express',
        trackingNumber: `FX-${Math.floor(Math.random() * 9000000 + 1000000)}`,
        status: 'SCHEDULED',
        estimatedDelivery: new Date(Date.now() + 2 * 86400_000).toISOString(),
      };
      return {
        ...state,
        qualityChecks: state.qualityChecks.map(qc =>
          qc.orderId === action.orderId ? { ...qc, status: 'PASS' as const, checkedAt: new Date().toISOString() } : qc
        ),
        orders: state.orders.map(o =>
          o.id === action.orderId ? { ...o, status: 'READY_DISPATCH' as const } : o
        ),
        dispatches: [...state.dispatches, newDispatch],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'QC_FAIL': {
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'QC_FAILED',
        entity: 'QualityCheck',
        entityId: action.orderId,
        user: state.currentUser.name,
        previousState: 'PENDING',
        newState: 'FAIL',
        reason: action.failures.map(f => `${f.issue} (${f.quantity})`).join('; '),
        timestamp: new Date().toISOString(),
      };
      // Create exception
      const newException: Exception = {
        id: `e-${Date.now()}`,
        type: 'DAMAGED_ITEM',
        severity: 'WARNING',
        orderId: action.orderId,
        productId: action.failures[0]?.productId,
        title: `QC Failed — Order #${action.orderId}`,
        description: action.failures.map(f => `${f.issue}: ${f.quantity} unit(s)`).join('; '),
        recommendation: 'Find replacement unit. Reallocate. Update damaged inventory. Resume QC.',
        status: 'DETECTED',
        createdAt: new Date().toISOString(),
      };
      return {
        ...state,
        qualityChecks: state.qualityChecks.map(qc =>
          qc.orderId === action.orderId ? { ...qc, status: 'FAIL' as const, failures: action.failures, checkedAt: new Date().toISOString() } : qc
        ),
        orders: state.orders.map(o =>
          o.id === action.orderId ? { ...o, status: 'QC_FAILED' as const } : o
        ),
        exceptions: [newException, ...state.exceptions],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'DISPATCH_ORDER': {
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'DISPATCHED',
        entity: 'Dispatch',
        entityId: action.orderId,
        user: state.currentUser.name,
        previousState: 'READY_DISPATCH',
        newState: 'DISPATCHED',
        reason: `Order #${action.orderId} dispatched`,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        orders: state.orders.map(o =>
          o.id === action.orderId ? { ...o, status: 'DISPATCHED' as const } : o
        ),
        dispatches: state.dispatches.map(d =>
          d.orderId === action.orderId ? { ...d, status: 'IN_TRANSIT' as const, dispatchedAt: new Date().toISOString() } : d
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'CREATE_REPLENISHMENT': {
      const product = state.products.find(p => p.id === action.productId);
      const inv = state.inventory.filter(i => i.productId === action.productId);
      if (!product || inv.length === 0) return state;
      const pendingDemand = state.orders
        .filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status))
        .flatMap(o => o.items)
        .filter(i => i.productId === action.productId)
        .reduce((s, i) => s + i.quantity, 0);
      const available = inv.reduce((s, i) => s + i.availableQuantity, 0);
      const incoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
      const safetyStock = inv[0].safetyStock;
      const deficit = Math.max(0, safetyStock + pendingDemand - available - incoming);
      const recommended = Math.max(deficit, inv[0].reorderLevel - available, 10);
      const newReq: ReplenishmentRequest = {
        id: `r-${Date.now()}`,
        productId: action.productId,
        sku: product.sku,
        productName: product.name,
        available,
        pendingDemand,
        incoming,
        safetyStock,
        recommendedQty: Math.ceil(recommended / 5) * 5,
        risk: available === 0 ? 'CRITICAL' : available < safetyStock ? 'HIGH' : 'MEDIUM',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'REPLENISHMENT_CREATED',
        entity: 'ReplenishmentRequest',
        entityId: newReq.id,
        user: state.currentUser.name,
        previousState: 'NONE',
        newState: 'PENDING',
        reason: `Created request for ${product.sku}: ${newReq.recommendedQty} units`,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        replenishments: [newReq, ...state.replenishments],
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'APPROVE_REPLENISHMENT': {
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'REPLENISHMENT_APPROVED',
        entity: 'ReplenishmentRequest',
        entityId: action.requestId,
        user: state.currentUser.name,
        previousState: 'PENDING',
        newState: 'APPROVED',
        reason: 'Replenishment request approved',
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        replenishments: state.replenishments.map(r =>
          r.id === action.requestId ? { ...r, status: 'APPROVED' as const, approvedBy: state.currentUser.name } : r
        ),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.notificationId ? { ...n, read: true } : n
        ),
      };

    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };

    case 'CANCEL_ORDER': {
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order) return state;
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'ORDER_CANCELLED',
        entity: 'Order',
        entityId: action.orderId,
        user: state.currentUser.name,
        previousState: order.status,
        newState: 'CANCELLED',
        reason: 'Order cancelled by manager',
        timestamp: new Date().toISOString(),
      };
      // Release reserved inventory
      const newInventory = [...state.inventory];
      for (const item of order.items) {
        const invIdx = newInventory.findIndex(i => i.productId === item.productId && i.reservedQuantity > 0);
        if (invIdx >= 0) {
          const release = Math.min(item.allocatedQuantity, newInventory[invIdx].reservedQuantity);
          newInventory[invIdx] = {
            ...newInventory[invIdx],
            reservedQuantity: newInventory[invIdx].reservedQuantity - release,
            availableQuantity: newInventory[invIdx].availableQuantity + release,
          };
        }
      }
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.orderId ? { ...o, status: 'CANCELLED' as const } : o),
        inventory: newInventory,
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    case 'OVERRIDE_ALLOCATION': {
      // Manager override — allocate even from safety stock
      const order = state.orders.find(o => o.id === action.orderId);
      if (!order) return state;
      const audit: AuditLog = {
        id: `al-${Date.now()}`,
        action: 'ALLOCATION_OVERRIDE',
        entity: 'Order',
        entityId: action.orderId,
        user: state.currentUser.name,
        previousState: order.allocationStatus,
        newState: 'FULL',
        reason: 'Manager override — allocated from safety stock',
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        orders: state.orders.map(o => o.id === action.orderId ? { ...o, allocationStatus: 'FULL' as const, status: 'ALLOCATED' as const } : o),
        auditLogs: [audit, ...state.auditLogs],
      };
    }

    default:
      return state;
  }
}

// Helper: execute allocation when decision is approved
function executeAllocation(state: State, decision: Decision, newDecisions: Decision[], audit: AuditLog): State {
  const orderId = decision.relatedOrderId!;
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return state;

  const alloc = determineAllocation(order, state.inventory, state.orders);
  const newInventory = state.inventory.map(i => ({ ...i }));
  const newTransactions: InventoryTransaction[] = [];

  for (const item of order.items) {
    const invIdx = newInventory.findIndex(i => i.productId === item.productId && i.availableQuantity > 0);
    if (invIdx >= 0) {
      const allocateQty = Math.min(item.quantity, newInventory[invIdx].availableQuantity);
      newInventory[invIdx] = {
        ...newInventory[invIdx],
        availableQuantity: newInventory[invIdx].availableQuantity - allocateQty,
        reservedQuantity: newInventory[invIdx].reservedQuantity + allocateQty,
        lastUpdated: new Date().toISOString(),
      };
      newTransactions.push({
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        inventoryId: newInventory[invIdx].id,
        productId: item.productId,
        type: 'RESERVE',
        quantity: allocateQty,
        balanceAfter: newInventory[invIdx].availableQuantity,
        reason: `Allocated to Order #${orderId}`,
        timestamp: new Date().toISOString(),
        user: state.currentUser.name,
      });
    }
  }

  const newAllocationStatus = alloc.strategy === 'FULL' ? 'FULL' : 'PARTIAL';
  const newOrderStatus = newAllocationStatus === 'FULL' ? 'ALLOCATED' as const : 'PARTIAL_ALLOCATED' as const;

  // Create picking task if fully allocated
  let newPickingTasks = [...state.pickingTasks];
  if (newAllocationStatus === 'FULL') {
    const pickItems = order.items.map(item => {
      const inv = newInventory.find(i => i.productId === item.productId);
      return {
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        location: inv?.location ?? { warehouse: 'WH1', zone: 'A', rack: '1', shelf: '1', bin: 'A', x: 1, y: 1 },
        quantity: item.quantity,
        status: 'PENDING' as PickItemStatus,
      };
    });
    const locations = pickItems.map(i => i.location);
    const route = optimizePickRoute(locations);
    newPickingTasks.push({
      id: `pk-${Date.now()}`,
      orderId,
      workerId: null,
      items: pickItems,
      route: route.route,
      estimatedDistance: route.distance,
      estimatedTimeMin: route.timeMin,
      stops: route.route.length,
      zoneCongestion: 40,
      status: 'PENDING' as PickingTaskStatus,
      efficiencyScore: 80,
    });
  }

  // Resolve related exception
  const newExceptions = state.exceptions.map(e =>
    e.orderId === orderId && e.type === 'STOCK_SHORTAGE' && e.status === 'DETECTED'
      ? { ...e, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString(), resolution: `Allocation approved for Order #${orderId}` }
      : e
  );

  return {
    ...state,
    inventory: newInventory,
    transactions: [...newTransactions, ...state.transactions],
    orders: state.orders.map(o =>
      o.id === orderId
        ? { ...o, allocationStatus: newAllocationStatus, status: newOrderStatus }
        : o
    ),
    allocations: [...state.allocations, {
      id: `a-${Date.now()}`,
      orderId,
      productId: order.items[0].productId,
      required: order.items[0].quantity,
      available: alloc.allocations[0]?.available ?? 0,
      reserved: alloc.allocations[0]?.reserved ?? 0,
      incoming: alloc.allocations[0]?.incoming ?? 0,
      shortage: alloc.allocations[0]?.shortage ?? 0,
      strategy: alloc.strategy,
      status: 'EXECUTED' as const,
      recommendation: alloc.recommendation,
      reason: alloc.reason,
      createdAt: new Date().toISOString(),
      approvedBy: state.currentUser.name,
      approvedAt: new Date().toISOString(),
    }],
    pickingTasks: newPickingTasks,
    exceptions: newExceptions,
    decisions: newDecisions.map(d => d.id === decision.id ? { ...d, status: 'EXECUTED' as const, executedAt: new Date().toISOString() } : d),
    auditLogs: [audit, ...state.auditLogs],
  };
}

// ─── Context ──────────────────────────────────────────────
interface StoreContext {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const StoreCtx = createContext<StoreContext | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
