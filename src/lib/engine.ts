import type {
  Order, Inventory, Priority, RiskLevel, Allocation, AllocationStrategy,
  ReplenishmentRequest, Bottleneck, WarehouseHealth, Decision, AppState,
  PickingTask, Location, Exception, Notification, NotificationSeverity,
} from '@/types';

// ─── Priority Engine ─────────────────────────────────────
export function calculatePriorityScore(
  order: Order,
  inventory: Inventory[],
  allOrders: Order[],
): { score: number; priority: Priority; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Urgency (SLA time remaining)
  const slaMs = new Date(order.slaDeadline).getTime() - Date.now();
  const slaHours = slaMs / 3600_000;
  if (slaHours < 4) { score += 30; reasons.push('SLA deadline within 4 hours'); }
  else if (slaHours < 8) { score += 22; reasons.push('SLA deadline within 8 hours'); }
  else if (slaHours < 16) { score += 15; reasons.push('SLA deadline within 16 hours'); }
  else if (slaHours < 24) { score += 10; reasons.push('SLA deadline within 24 hours'); }
  else if (slaHours < 48) { score += 5; }
  else { score += 1; }

  // Customer priority
  if (order.customerPriority === 'VIP') { score += 25; reasons.push('VIP customer'); }
  else if (order.customerPriority === 'STANDARD') { score += 12; }
  else { score += 6; }

  // Order age
  const ageMs = Date.now() - new Date(order.createdAt).getTime();
  const ageHours = ageMs / 3600_000;
  if (ageHours > 48) { score += 15; reasons.push('Order is over 48 hours old'); }
  else if (ageHours > 24) { score += 12; reasons.push('Order is over 24 hours old'); }
  else if (ageHours > 12) { score += 8; }
  else if (ageHours > 6) { score += 5; }
  else { score += 2; }

  // Stock availability risk
  let stockRisk = 0;
  for (const item of order.items) {
    const inv = inventory.filter(i => i.productId === item.productId);
    const totalAvail = inv.reduce((s, i) => s + i.availableQuantity, 0);
    const totalIncoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
    if (totalAvail === 0 && totalIncoming === 0) { stockRisk = Math.max(stockRisk, 20); }
    else if (totalAvail < item.quantity) {
      stockRisk = Math.max(stockRisk, 15);
      reasons.push(`Insufficient stock for ${item.sku} (${totalAvail}/${item.quantity})`);
    }
  }
  score += stockRisk;

  // Competition factor — other orders competing for same SKU
  let competition = 0;
  for (const item of order.items) {
    const competing = allOrders.filter(o =>
      o.id !== order.id &&
      o.items.some(i => i.productId === item.productId) &&
      !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)
    );
    if (competing.length > 0) competition = Math.max(competition, competing.length * 2);
  }
  score += competition;

  score = Math.min(100, Math.max(0, Math.round(score)));

  let priority: Priority;
  if (score >= 90) priority = 'CRITICAL';
  else if (score >= 70) priority = 'HIGH';
  else if (score >= 40) priority = 'MEDIUM';
  else priority = 'NORMAL';

  return { score, priority, reasons };
}

// ─── Risk Engine ─────────────────────────────────────────
export function calculateRisk(
  order: Order,
  inventory: Inventory[],
): { level: RiskLevel; reasons: string[] } {
  const reasons: string[] = [];
  let riskScore = 0;

  for (const item of order.items) {
    const inv = inventory.filter(i => i.productId === item.productId);
    const available = inv.reduce((s, i) => s + i.availableQuantity, 0);
    const incoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
    const damaged = inv.reduce((s, i) => s + i.damagedQuantity, 0);

    if (available === 0 && incoming === 0) {
      riskScore += 40;
      reasons.push(`${item.sku} is completely out of stock with no incoming supply`);
    } else if (available === 0 && incoming > 0) {
      riskScore += 30;
      reasons.push(`${item.sku} is out of stock, ${incoming} units incoming`);
    } else if (available < item.quantity) {
      const ratio = available / item.quantity;
      riskScore += Math.round((1 - ratio) * 25);
      reasons.push(`Available inventory covers only ${Math.round(ratio * 100)}% of ${item.sku} demand`);
    }

    if (damaged > 0) {
      riskScore += 3;
      reasons.push(`${damaged} damaged ${item.sku} units removed from allocatable stock`);
    }
  }

  const slaMs = new Date(order.slaDeadline).getTime() - Date.now();
  const slaHours = slaMs / 3600_000;
  if (slaHours < 0) { riskScore += 20; reasons.push('SLA deadline has passed'); }
  else if (slaHours < 4) { riskScore += 15; reasons.push('SLA deadline approaching rapidly'); }
  else if (slaHours < 8) { riskScore += 8; }

  if (order.customerPriority === 'VIP') {
    riskScore += 5;
  }

  const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / 3600_000;
  if (ageHours > 24 && !['COMPLETED', 'DISPATCHED'].includes(order.status)) {
    riskScore += 5;
    reasons.push('Order has been pending over 24 hours');
  }

  let level: RiskLevel;
  if (riskScore >= 40) level = 'CRITICAL';
  else if (riskScore >= 25) level = 'HIGH';
  else if (riskScore >= 12) level = 'MEDIUM';
  else level = 'LOW';

  if (reasons.length === 0) reasons.push('No significant risk factors detected');

  return { level, reasons };
}

// ─── Allocation Engine ───────────────────────────────────
export function determineAllocation(
  order: Order,
  inventory: Inventory[],
  allOrders: Order[],
): {
  strategy: AllocationStrategy;
  allocations: { productId: string; required: number; available: number; reserved: number; incoming: number; shortage: number; recommendation: string }[];
  recommendation: string;
  reason: string;
} {
  const allocations: Allocation[] = [];
  const itemAllocations: Allocation[] = [];
  let overallStrategy: AllocationStrategy = 'FULL';
  const reasons: string[] = [];

  for (const item of order.items) {
    const inv = inventory.filter(i => i.productId === item.productId);
    const available = inv.reduce((s, i) => s + i.availableQuantity, 0);
    const incoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
    const reserved = inv.reduce((s, i) => s + i.reservedQuantity, 0);
    const shortage = Math.max(0, item.quantity - available);

    let strategy: AllocationStrategy;
    let rec: string;

    if (available >= item.quantity) {
      strategy = 'FULL';
      rec = `Allocate ${item.quantity} units from available stock.`;
    } else if (available > 0 && available + incoming >= item.quantity) {
      strategy = 'PARTIAL';
      rec = `Allocate ${available} available units now. Reserve ${shortage} from incoming stock (ETA ${inv[0]?.incomingEta ? new Date(inv[0].incomingEta!).toLocaleDateString() : 'TBD'}).`;
      reasons.push(`${item.sku}: only ${available} of ${item.quantity} available, ${incoming} incoming`);
    } else if (available > 0) {
      strategy = 'PARTIAL';
      rec = `Allocate ${available} available units. ${shortage} units require replenishment — no incoming stock covers the gap.`;
      reasons.push(`${item.sku}: only ${available} of ${item.quantity} available, insufficient incoming`);
    } else if (incoming > 0) {
      strategy = 'REPLENISHMENT_WAIT';
      rec = `No available stock. Wait for ${incoming} incoming units. Hold order until arrival.`;
      reasons.push(`${item.sku}: out of stock, ${incoming} incoming`);
    } else {
      strategy = 'HOLD';
      rec = `Out of stock with no incoming supply. Create replenishment request. Hold order.`;
      reasons.push(`${item.sku}: complete stockout, no incoming`);
    }

    if (strategy !== 'FULL' && overallStrategy === 'FULL') overallStrategy = strategy;
    if (strategy === 'HOLD') overallStrategy = 'HOLD';
    if (strategy === 'REPLENISHMENT_WAIT' && overallStrategy !== 'HOLD') overallStrategy = 'REPLENISHMENT_WAIT';
  }

  // Check competition
  for (const item of order.items) {
    const competing = allOrders.filter(o =>
      o.id !== order.id &&
      o.items.some(i => i.productId === item.productId) &&
      !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status)
    );
    if (competing.length > 0) {
      reasons.push(`${competing.length} other order(s) competing for ${item.sku}`);
    }
  }

  const itemAlloc = order.items.map(item => {
    const inv = inventory.filter(i => i.productId === item.productId);
    const available = inv.reduce((s, i) => s + i.availableQuantity, 0);
    const incoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
    const reserved = inv.reduce((s, i) => s + i.reservedQuantity, 0);
    const shortage = Math.max(0, item.quantity - available);
    let rec: string;
    if (available >= item.quantity) rec = `Allocate ${item.quantity} from available stock.`;
    else if (available > 0 && available + incoming >= item.quantity) rec = `Allocate ${available} now, reserve ${shortage} from incoming.`;
    else if (available > 0) rec = `Allocate ${available} now. ${shortage} need replenishment.`;
    else if (incoming > 0) rec = `Wait for ${incoming} incoming units.`;
    else rec = `Out of stock. Create replenishment request.`;
    return { productId: item.productId, required: item.quantity, available, reserved, incoming, shortage, recommendation: rec };
  });

  let recommendation: string;
  switch (overallStrategy) {
    case 'FULL':
      recommendation = 'Full allocation recommended — sufficient stock available for all items.';
      break;
    case 'PARTIAL':
      recommendation = 'Partial allocation recommended — allocate available stock now and reserve incoming units for the remainder.';
      break;
    case 'HOLD':
      recommendation = 'Hold allocation — complete stockout with no incoming supply. Create replenishment request.';
      break;
    case 'REPLENISHMENT_WAIT':
      recommendation = 'Wait for replenishment — no available stock but incoming supply will cover demand.';
      break;
    default:
      recommendation = 'Use alternative warehouse location for stock.';
  }

  return {
    strategy: overallStrategy,
    allocations: itemAlloc,
    recommendation,
    reason: reasons.join('; ') || 'Stock availability sufficient for full allocation.',
  };
}

// ─── Replenishment Engine ─────────────────────────────────
export function checkReplenishment(
  inventory: Inventory[],
  orders: Order[],
  products: { id: string; sku: string; name: string }[],
): ReplenishmentRequest[] {
  const requests: ReplenishmentRequest[] = [];
  const productMap = new Map(products.map(p => [p.id, p]));

  const byProduct = new Map<string, Inventory[]>();
  for (const inv of inventory) {
    if (!byProduct.has(inv.productId)) byProduct.set(inv.productId, []);
    byProduct.get(inv.productId)!.push(inv);
  }

  for (const [productId, invs] of byProduct) {
    const product = productMap.get(productId);
    if (!product) continue;

    const available = invs.reduce((s, i) => s + i.availableQuantity, 0);
    const incoming = invs.reduce((s, i) => s + i.incomingQuantity, 0);
    const safetyStock = invs[0].safetyStock;
    const reorderLevel = invs[0].reorderLevel;

    const pendingDemand = orders
      .filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status))
      .flatMap(o => o.items)
      .filter(i => i.productId === productId)
      .reduce((s, i) => s + i.quantity, 0);

    const effectiveStock = available + incoming - pendingDemand;

    if (effectiveStock < safetyStock || available < reorderLevel) {
      const deficit = Math.max(0, safetyStock + pendingDemand - available - incoming);
      const recommended = Math.max(deficit, reorderLevel - available, 10);
      let risk: RiskLevel;
      if (available === 0) risk = 'CRITICAL';
      else if (available < safetyStock * 0.5) risk = 'CRITICAL';
      else if (available < safetyStock) risk = 'HIGH';
      else if (available < reorderLevel) risk = 'MEDIUM';
      else risk = 'LOW';

      requests.push({
        id: `rep-${productId}`,
        productId,
        sku: product.sku,
        productName: product.name,
        available,
        pendingDemand,
        incoming,
        safetyStock,
        recommendedQty: Math.ceil(recommended / 5) * 5,
        risk,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return requests.sort((a, b) => {
    const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return order[a.risk] - order[b.risk];
  });
}

// ─── Bottleneck Detection ─────────────────────────────────
export function detectBottlenecks(state: AppState): Bottleneck[] {
  const bottlenecks: Bottleneck[] = [];

  // Picking bottleneck
  const pickingTasks = state.pickingTasks;
  const pickingPending = pickingTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const zoneWorkload = new Map<string, number>();
  for (const t of pickingPending) {
    for (const item of t.items) {
      const z = item.location.zone;
      zoneWorkload.set(z, (zoneWorkload.get(z) ?? 0) + 1);
    }
  }
  // Also count orders waiting for picking
  const ordersWaitingPick = state.orders.filter(o => o.status === 'ALLOCATED' || o.status === 'PARTIAL_ALLOCATED');
  for (const o of ordersWaitingPick) {
    // estimate zone from allocations
    for (const item of o.items) {
      const inv = state.inventory.find(i => i.productId === item.productId);
      if (inv) {
        const z = inv.location.zone;
        zoneWorkload.set(z, (zoneWorkload.get(z) ?? 0) + 1);
      }
    }
  }

  for (const [zone, load] of zoneWorkload) {
    const workload = Math.min(100, Math.round((load / 12) * 100));
    if (workload > 75) {
      const workers = state.workerAssignments.filter(w => w.zone === zone);
      const availableWorkers = state.workerAssignments.filter(w => w.utilization < 60);
      bottlenecks.push({
        id: `bn-pick-${zone}`,
        stage: 'PICKING',
        zone,
        workload,
        normalWorkload: 70,
        cause: `${load} items pending in Zone ${zone}${workers.length > 0 ? ` with ${workers.length} worker(s)` : ''}`,
        recommendation: availableWorkers.length > 0
          ? `Move ${Math.min(2, availableWorkers.length)} worker(s) from ${availableWorkers.map(w => `Zone ${w.zone}`).join(', ')} to Zone ${zone}.`
          : `Re-sequence picks in Zone ${zone} to optimize route efficiency.`,
        severity: workload > 90 ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  // Packing bottleneck
  const packingPending = state.packingTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS');
  const ordersWaitingPack = state.orders.filter(o => o.status === 'PICKED').length;
  const packLoad = packingPending.length + ordersWaitingPack;
  if (packLoad > 5) {
    bottlenecks.push({
      id: 'bn-pack',
      stage: 'PACKING',
      workload: Math.min(100, Math.round((packLoad / 8) * 100)),
      normalWorkload: 65,
      cause: `${packLoad} orders waiting for packing`,
      recommendation: 'Assign additional packer or expedite current packing tasks.',
      severity: packLoad > 8 ? 'CRITICAL' : 'WARNING',
    });
  }

  // QC bottleneck
  const qcPending = state.qualityChecks.filter(q => q.status === 'PENDING').length;
  const ordersWaitingQC = state.orders.filter(o => o.status === 'QC_PENDING').length;
  const qcLoad = qcPending + ordersWaitingQC;
  if (qcLoad > 3) {
    bottlenecks.push({
      id: 'bn-qc',
      stage: 'QC',
      workload: Math.min(100, Math.round((qcLoad / 5) * 100)),
      normalWorkload: 60,
      cause: `${qcLoad} orders waiting for quality check`,
      recommendation: 'Assign additional QC inspector or expedite checks.',
      severity: qcLoad > 5 ? 'CRITICAL' : 'WARNING',
    });
  }

  // Dispatch bottleneck
  const delayedDispatch = state.dispatches.filter(d => d.status === 'DELAYED').length;
  if (delayedDispatch > 0) {
    bottlenecks.push({
      id: 'bn-dispatch',
      stage: 'DISPATCH',
      workload: Math.min(100, delayedDispatch * 30),
      normalWorkload: 20,
      cause: `${delayedDispatch} dispatch(es) delayed — carrier pickup overdue`,
      recommendation: 'Contact carrier. Verify pickup schedule. Update dispatch status.',
      severity: delayedDispatch > 1 ? 'CRITICAL' : 'WARNING',
    });
  }

  return bottlenecks.sort((a, b) => {
    const order = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return order[a.severity] - order[b.severity];
  });
}

// ─── Warehouse Health Score ──────────────────────────────
export function calculateHealth(state: AppState): WarehouseHealth {
  // Inventory health
  const invTotal = state.inventory.length;
  const invHealthy = state.inventory.filter(i => i.availableQuantity > i.safetyStock).length;
  const invLow = state.inventory.filter(i => i.availableQuantity > 0 && i.availableQuantity <= i.safetyStock).length;
  const invOut = state.inventory.filter(i => i.availableQuantity === 0).length;
  const inventoryHealth = Math.round(((invHealthy * 100 + invLow * 50 + invOut * 0) / invTotal));

  // Order health (SLA compliance + completion rate)
  const activeOrders = state.orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const ordersAtRisk = activeOrders.filter(o => o.riskLevel === 'HIGH' || o.riskLevel === 'CRITICAL').length;
  const completedOrders = state.orders.filter(o => o.status === 'COMPLETED' || o.status === 'DISPATCHED').length;
  const orderHealth = Math.round(100 - (ordersAtRisk / Math.max(1, activeOrders.length)) * 50 - (1 - completedOrders / Math.max(1, state.orders.length)) * 20);

  // Picking efficiency
  const completedPicks = state.pickingTasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressPicks = state.pickingTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const avgEff = state.pickingTasks.length > 0
    ? state.pickingTasks.reduce((s, t) => s + t.efficiencyScore, 0) / state.pickingTasks.length
    : 75;
  const pickingEfficiency = Math.round(Math.min(100, avgEff - inProgressPicks * 3));

  // Packing efficiency
  const packingDone = state.packingTasks.filter(t => t.status === 'COMPLETED').length;
  const packingInProgress = state.packingTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const packingEfficiency = Math.round(Math.max(40, 95 - packingInProgress * 8));

  // Dispatch efficiency
  const dispatchTotal = state.dispatches.length;
  const dispatchDelayed = state.dispatches.filter(d => d.status === 'DELAYED').length;
  const dispatchEfficiency = dispatchTotal > 0
    ? Math.round(100 - (dispatchDelayed / dispatchTotal) * 50)
    : 90;

  // Exception health
  const openExceptions = state.exceptions.filter(e => e.status !== 'RESOLVED' && e.status !== 'VERIFIED').length;
  const criticalExceptions = state.exceptions.filter(e => e.severity === 'CRITICAL' && e.status !== 'RESOLVED').length;
  const exceptionHealth = Math.round(Math.max(20, 100 - openExceptions * 5 - criticalExceptions * 10));

  const overall = Math.round(
    (inventoryHealth * 0.2 + orderHealth * 0.2 + pickingEfficiency * 0.15 +
     packingEfficiency * 0.15 + dispatchEfficiency * 0.15 + exceptionHealth * 0.15)
  );

  return {
    overall: Math.min(100, Math.max(0, overall)),
    inventoryHealth: Math.min(100, Math.max(0, inventoryHealth)),
    orderHealth: Math.min(100, Math.max(0, orderHealth)),
    pickingEfficiency: Math.min(100, Math.max(0, pickingEfficiency)),
    packingEfficiency: Math.min(100, Math.max(0, packingEfficiency)),
    dispatchEfficiency: Math.min(100, Math.max(0, dispatchEfficiency)),
    exceptionHealth: Math.min(100, Math.max(0, exceptionHealth)),
  };
}

// ─── Picking Route Optimization ───────────────────────────
export function optimizePickRoute(locations: Location[]): { route: Location[]; distance: number; timeMin: number } {
  if (locations.length === 0) return { route: [], distance: 0, timeMin: 0 };
  if (locations.length === 1) return { route: locations, distance: 0, timeMin: 2 };

  // Nearest-neighbor heuristic starting from packing station (0,0)
  const start: Location = { warehouse: 'WH1', zone: 'PACK', rack: '0', shelf: '0', bin: '0', x: 0, y: 0 };
  const unvisited = [...locations];
  const route: Location[] = [];
  let current = start;
  let totalDistance = 0;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < unvisited.length; i++) {
      const d = Math.abs(current.x - unvisited[i].x) + Math.abs(current.y - unvisited[i].y);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    totalDistance += nearestDist;
    current = unvisited[nearestIdx];
    route.push(current);
    unvisited.splice(nearestIdx, 1);
  }
  // Return to packing station
  totalDistance += Math.abs(current.x - start.x) + Math.abs(current.y - start.y);

  const timeMin = Math.round(2 + route.length * 3 + totalDistance * 0.1);
  return { route, distance: totalDistance, timeMin };
}

// ─── Decision Generator ──────────────────────────────────
export function generateDecisions(state: AppState): Decision[] {
  const decisions: Decision[] = [...state.decisions.filter(d => d.status !== 'PENDING')];

  // Find orders with stock shortages that need allocation decisions
  const activeOrders = state.orders.filter(o =>
    ['CREATED', 'PRIORITY_ANALYZED'].includes(o.status) &&
    o.allocationStatus === 'NONE'
  );

  for (const order of activeOrders) {
    const alloc = determineAllocation(order, state.inventory, state.orders);
    if (alloc.strategy !== 'FULL') {
      const existing = state.decisions.find(d => d.relatedOrderId === order.id && d.type === 'ALLOCATION');
      if (!existing) {
        const severity = order.priority === 'CRITICAL' ? 'CRITICAL' : order.priority === 'HIGH' ? 'WARNING' : 'INFO';
        decisions.push({
          id: `dec-alloc-${order.id}`,
          type: 'ALLOCATION',
          severity: severity as 'CRITICAL' | 'WARNING' | 'INFO',
          title: `${alloc.strategy === 'PARTIAL' ? 'Partial' : alloc.strategy === 'HOLD' ? 'Hold' : 'Replenishment'} Allocation — Order #${order.id}`,
          description: `Order #${order.id} (${order.priority}, ${order.customerPriority}) requires ${order.items.map(i => `${i.quantity} ${i.sku}`).join(', ')}. ${alloc.reason}`,
          recommendation: alloc.recommendation,
          reason: `Order #${order.id} has priority score ${order.priorityScore} and risk level ${order.riskLevel}. ${order.riskReasons.join('; ')}`,
          expectedResult: alloc.strategy === 'PARTIAL'
            ? 'Order proceeds with partial allocation. Remaining units reserved from incoming stock.'
            : alloc.strategy === 'HOLD'
            ? 'Order held until replenishment. Customer notified of delay.'
            : 'Order queued for incoming stock. Will proceed upon arrival.',
          status: 'PENDING',
          relatedOrderId: order.id,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // Replenishment decisions
  const replens = checkReplenishment(state.inventory, state.orders, state.products);
  for (const r of replens.slice(0, 5)) {
    const existing = state.decisions.find(d => d.relatedProductId === r.productId && d.type === 'REPLENISHMENT');
    if (!existing) {
      decisions.push({
        id: `dec-repl-${r.productId}`,
        type: 'REPLENISHMENT',
        severity: r.risk === 'CRITICAL' ? 'CRITICAL' : r.risk === 'HIGH' ? 'WARNING' : 'INFO',
        title: `Replenishment Required — ${r.sku}`,
        description: `${r.productName} available stock (${r.available}) is below safety stock (${r.safetyStock}). Pending demand: ${r.pendingDemand} units. Incoming: ${r.incoming} units.`,
        recommendation: `Create replenishment request for ${r.recommendedQty} units.`,
        reason: `Available + incoming (${r.available + r.incoming}) < safety stock + pending demand (${r.safetyStock + r.pendingDemand}). Without action, ${r.pendingDemand > 0 ? `${r.pendingDemand} units of demand` : 'future orders'} will face stockout.`,
        expectedResult: `Stock restored to safe levels within 48h. ${r.pendingDemand > 0 ? `${r.pendingDemand} units of pending demand fulfilled.` : 'Buffer maintained.'}`,
        status: 'PENDING',
        relatedProductId: r.productId,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // Bottleneck decisions
  const bottlenecks = detectBottlenecks(state);
  for (const bn of bottlenecks) {
    const existing = state.decisions.find(d => d.type === 'BOTTLENECK' && d.title.includes(bn.zone ?? bn.stage));
    if (!existing) {
      decisions.push({
        id: `dec-bn-${bn.id}`,
        type: 'BOTTLENECK',
        severity: bn.severity,
        title: `Bottleneck — ${bn.stage}${bn.zone ? ` Zone ${bn.zone}` : ''}`,
        description: `${bn.stage} workload at ${bn.workload}% (normal ${bn.normalWorkload}%). ${bn.cause}.`,
        recommendation: bn.recommendation,
        reason: `Workload exceeds normal capacity by ${bn.workload - bn.normalWorkload}%. ${bn.cause}.`,
        expectedResult: `Workload reduced to normal levels. Throughput increased. SLA risk for pending orders reduced.`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return decisions;
}

// ─── AI Copilot (Rule-Based) ──────────────────────────────
export function copilotAnswer(question: string, state: AppState): string {
  const q = question.toLowerCase().trim();

  // Why is order X delayed?
  const delayMatch = q.match(/order\s*#?(\d+)/);
  if ((q.includes('delay') || q.includes('risk') || q.includes('wrong with') || q.includes('why')) && delayMatch) {
    const orderId = delayMatch[1];
    const order = state.orders.find(o => o.id === orderId);
    if (order) {
      let answer = `**Order #${order.id}** — ${order.customer} (${order.customerPriority})\n\n`;
      answer += `**Status:** ${order.status}\n`;
      answer += `**Priority:** ${order.priority} (score: ${order.priorityScore})\n`;
      answer += `**Risk Level:** ${order.riskLevel}\n\n`;
      answer += `**Risk Analysis:**\n`;
      for (const r of order.riskReasons) answer += `• ${r}\n`;
      answer += `\n**Items:**\n`;
      for (const item of order.items) {
        const inv = state.inventory.filter(i => i.productId === item.productId);
        const avail = inv.reduce((s, i) => s + i.availableQuantity, 0);
        const incoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
        answer += `• ${item.sku} — need ${item.quantity}, available ${avail}, incoming ${incoming}\n`;
      }
      const alloc = determineAllocation(order, state.inventory, state.orders);
      answer += `\n**Recommended Action:**\n${alloc.recommendation}\n`;
      answer += `\n**Reason:** ${alloc.reason}`;
      return answer;
    }
    return `Order #${orderId} not found in the system.`;
  }

  // Which products need replenishment?
  if (q.includes('replenish') || q.includes('restock') || q.includes('low stock') || q.includes('reorder')) {
    const replens = checkReplenishment(state.inventory, state.orders, state.products);
    if (replens.length === 0) return 'All products are above safety stock levels. No replenishment needed at this time.';
    let answer = `**${replens.length} products need replenishment:**\n\n`;
    for (const r of replens.slice(0, 8)) {
      answer += `**${r.sku}** — ${r.productName}\n`;
      answer += `  Available: ${r.available} | Safety: ${r.safetyStock} | Demand: ${r.pendingDemand} | Incoming: ${r.incoming}\n`;
      answer += `  Risk: **${r.risk}** — Recommend ordering ${r.recommendedQty} units\n\n`;
    }
    return answer;
  }

  // Biggest bottleneck?
  if (q.includes('bottleneck') || q.includes('congest') || q.includes('slow') || q.includes('overload')) {
    const bns = detectBottlenecks(state);
    if (bns.length === 0) return 'No significant bottlenecks detected. Warehouse operations are running smoothly.';
    let answer = `**${bns.length} bottleneck(s) detected:**\n\n`;
    for (const bn of bns) {
      answer += `**${bn.stage}${bn.zone ? ` — Zone ${bn.zone}` : ''}** (${bn.severity})\n`;
      answer += `  Workload: ${bn.workload}% (normal: ${bn.normalWorkload}%)\n`;
      answer += `  Cause: ${bn.cause}\n`;
      answer += `  Recommendation: ${bn.recommendation}\n\n`;
    }
    return answer;
  }

  // Which orders should we process first?
  if (q.includes('process first') || q.includes('priority') || q.includes('which order') || q.includes('next') || q.includes('first')) {
    const sorted = [...state.orders]
      .filter(o => !['COMPLETED', 'CANCELLED', 'DISPATCHED'].includes(o.status))
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 8);
    let answer = `**Top priority orders to process:**\n\n`;
    for (const o of sorted) {
      answer += `**Order #${o.id}** — ${o.priority} (score: ${o.priorityScore}) — ${o.riskLevel} risk\n`;
      answer += `  ${o.customer} (${o.customerPriority}) — ${o.items.map(i => `${i.quantity}× ${i.sku}`).join(', ')}\n\n`;
    }
    return answer;
  }

  // Why did you allocate to order X?
  if ((q.includes('allocat') || q.includes('why')) && delayMatch) {
    const orderId = delayMatch[1];
    const order = state.orders.find(o => o.id === orderId);
    if (order) {
      const alloc = determineAllocation(order, state.inventory, state.orders);
      let answer = `**Allocation reasoning for Order #${order.id}:**\n\n`;
      answer += `**Strategy:** ${alloc.strategy}\n`;
      answer += `**Recommendation:** ${alloc.recommendation}\n\n`;
      answer += `**Why this order:**\n`;
      answer += `• Priority: ${order.priority} (score: ${order.priorityScore})\n`;
      answer += `• Customer: ${order.customer} (${order.customerPriority})\n`;
      answer += `• Risk: ${order.riskLevel}\n`;
      for (const r of order.riskReasons) answer += `• ${r}\n`;
      answer += `\n**Stock situation:**\n`;
      for (const item of order.items) {
        const inv = state.inventory.filter(i => i.productId === item.productId);
        const avail = inv.reduce((s, i) => s + i.availableQuantity, 0);
        const incoming = inv.reduce((s, i) => s + i.incomingQuantity, 0);
        answer += `• ${item.sku}: need ${item.quantity}, available ${avail}, incoming ${incoming}\n`;
      }
      return answer;
    }
  }

  // What should the team do next?
  if (q.includes('what should') || q.includes('do next') || q.includes('action') || q.includes('recommend')) {
    const pendingDecisions = state.decisions.filter(d => d.status === 'PENDING');
    const bns = detectBottlenecks(state);
    const replens = checkReplenishment(state.inventory, state.orders, state.products);
    let answer = `**Recommended next actions:**\n\n`;
    if (pendingDecisions.length > 0) {
      answer += `**${pendingDecisions.length} decision(s) awaiting approval:**\n`;
      for (const d of pendingDecisions.slice(0, 4)) {
        answer += `• [${d.severity}] ${d.title}\n`;
      }
      answer += '\n';
    }
    if (bns.length > 0) {
      answer += `**Bottleneck(s) to address:**\n`;
      for (const bn of bns.slice(0, 3)) {
        answer += `• ${bn.stage}${bn.zone ? ` Zone ${bn.zone}` : ''}: ${bn.recommendation}\n`;
      }
      answer += '\n';
    }
    if (replens.length > 0) {
      answer += `**${replens.length} product(s) need replenishment** — top priority: ${replens[0].sku}\n`;
    }
    if (pendingDecisions.length === 0 && bns.length === 0 && replens.length === 0) {
      answer += 'All operations are running smoothly. No urgent actions needed.';
    }
    return answer;
  }

  // Health score
  if (q.includes('health') || q.includes('score') || q.includes('overall') || q.includes('how are we')) {
    const h = calculateHealth(state);
    let answer = `**Warehouse Health Score: ${h.overall}/100**\n\n`;
    answer += `• Inventory Health: ${h.inventoryHealth}\n`;
    answer += `• Order Health: ${h.orderHealth}\n`;
    answer += `• Picking Efficiency: ${h.pickingEfficiency}\n`;
    answer += `• Packing Efficiency: ${h.packingEfficiency}\n`;
    answer += `• Dispatch Efficiency: ${h.dispatchEfficiency}\n`;
    answer += `• Exception Health: ${h.exceptionHealth}\n`;
    const weakest = Object.entries({ inventoryHealth: h.inventoryHealth, orderHealth: h.orderHealth, pickingEfficiency: h.pickingEfficiency, packingEfficiency: h.packingEfficiency, dispatchEfficiency: h.dispatchEfficiency, exceptionHealth: h.exceptionHealth })
      .sort((a, b) => a[1] - b[1])[0];
    answer += `\n**Weakest area:** ${weakest[0].replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase())} (${weakest[1]}/100)`;
    return answer;
  }

  // Exceptions
  if (q.includes('exception') || q.includes('problem') || q.includes('issue')) {
    const open = state.exceptions.filter(e => e.status !== 'RESOLVED' && e.status !== 'VERIFIED');
    let answer = `**${open.length} open exception(s):**\n\n`;
    for (const e of open.slice(0, 8)) {
      answer += `**[${e.severity}] ${e.title}**\n`;
      answer += `  ${e.description}\n`;
      answer += `  Recommendation: ${e.recommendation}\n\n`;
    }
    return answer;
  }

  // Inventory status
  if (q.includes('inventory') || q.includes('stock')) {
    const low = state.inventory.filter(i => i.availableQuantity <= i.safetyStock && i.availableQuantity > 0);
    const out = state.inventory.filter(i => i.availableQuantity === 0);
    let answer = `**Inventory Overview:**\n`;
    answer += `• Total SKUs: ${new Set(state.inventory.map(i => i.productId)).size}\n`;
    answer += `• Low stock: ${low.length}\n`;
    answer += `• Out of stock: ${out.length}\n\n`;
    if (out.length > 0) {
      answer += `**Out of stock:**\n`;
      for (const i of out) {
        const p = state.products.find(p => p.id === i.productId);
        answer += `• ${p?.sku} — ${p?.name}\n`;
      }
    }
    return answer;
  }

  return `I can help with:\n• Order status and risk analysis ("Why is Order #1045 delayed?")\n• Replenishment needs ("Which products need replenishment?")\n• Bottlenecks ("What is the biggest bottleneck?")\n• Priority recommendations ("Which orders should we process first?")\n• Next actions ("What should the team do next?")\n• Warehouse health ("What is the health score?")\n• Exceptions ("What exceptions are open?")\n\nAsk me any of these questions and I'll analyze the current warehouse data.`;
}

// ─── Notification Generator ───────────────────────────────
export function generateNotifications(state: AppState): Notification[] {
  const notifications = [...state.notifications];
  const existingMsgs = new Set(notifications.map(n => n.message));

  for (const order of state.orders) {
    if (order.riskLevel === 'CRITICAL' && ['CREATED', 'PRIORITY_ANALYZED'].includes(order.status)) {
      const msg = `Order #${order.id} has CRITICAL risk and has not been allocated.`;
      if (!existingMsgs.has(msg)) {
        notifications.unshift({
          id: `n-${order.id}-risk`,
          severity: 'CRITICAL',
          title: 'Critical SLA Risk',
          message: msg,
          timestamp: new Date().toISOString(),
          read: false,
          link: 'orders',
        });
      }
    }
  }

  return notifications;
}
