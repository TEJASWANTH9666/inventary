// WarezAI Core Types

export type Role = 'manager' | 'worker' | 'inventory';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InventoryStatus = 'HEALTHY' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK' | 'BLOCKED';
export type OrderStatus =
  | 'CREATED'
  | 'PRIORITY_ANALYZED'
  | 'ALLOCATED'
  | 'PARTIAL_ALLOCATED'
  | 'HOLD'
  | 'PICKING'
  | 'PICKED'
  | 'PACKING'
  | 'PACKED'
  | 'QC_PENDING'
  | 'QC_FAILED'
  | 'READY_DISPATCH'
  | 'DISPATCHED'
  | 'COMPLETED'
  | 'CANCELLED';

export type ExceptionType =
  | 'STOCK_SHORTAGE'
  | 'DAMAGED_ITEM'
  | 'MISSING_ITEM'
  | 'WRONG_ITEM'
  | 'PICKING_DELAY'
  | 'PACKING_ERROR'
  | 'INVENTORY_MISMATCH'
  | 'DISPATCH_DELAY'
  | 'SLA_RISK';

export type ExceptionStatus = 'DETECTED' | 'ANALYZED' | 'RECOMMENDED' | 'APPROVED' | 'RESOLVED' | 'VERIFIED';

export type AllocationStrategy =
  | 'FULL'
  | 'PARTIAL'
  | 'HOLD'
  | 'ALTERNATIVE_LOCATION'
  | 'REPLENISHMENT_WAIT';

export type AllocationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export type PickItemStatus = 'PENDING' | 'PICKED' | 'VERIFIED';
export type PickingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type DecisionType =
  | 'ALLOCATION'
  | 'REPLENISHMENT'
  | 'BOTTLENECK'
  | 'EXCEPTION'
  | 'QC_FAIL'
  | 'PRIORITY_OVERRIDE';

export type DecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export type NotificationSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatarColor: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  supplier: string;
  unitPrice: number;
  weightKg: number;
  packageSize: 'SMALL' | 'MEDIUM' | 'LARGE';
}

export interface Location {
  warehouse: string;
  zone: string;
  rack: string;
  shelf: string;
  bin: string;
  x: number;
  y: number;
}

export interface Inventory {
  id: string;
  productId: string;
  location: Location;
  totalQuantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  safetyStock: number;
  reorderLevel: number;
  incomingQuantity: number;
  incomingEta: string | null;
  lastUpdated: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  productId: string;
  type: 'INBOUND' | 'OUTBOUND' | 'RESERVE' | 'RELEASE' | 'DAMAGE' | 'ADJUST' | 'TRANSFER';
  quantity: number;
  balanceAfter: number;
  reason: string;
  timestamp: string;
  user: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  allocatedQuantity: number;
  location?: Location;
}

export interface Order {
  id: string;
  customer: string;
  customerPriority: 'VIP' | 'STANDARD' | 'NEW';
  items: OrderItem[];
  createdAt: string;
  slaDeadline: string;
  status: OrderStatus;
  priority: Priority;
  priorityScore: number;
  riskLevel: RiskLevel;
  riskReasons: string[];
  allocationStatus: 'NONE' | 'PARTIAL' | 'FULL' | 'HOLD';
  assignedWorkerId: string | null;
  notes?: string;
}

export interface Allocation {
  id: string;
  orderId: string;
  productId: string;
  required: number;
  available: number;
  reserved: number;
  incoming: number;
  shortage: number;
  strategy: AllocationStrategy;
  status: AllocationStatus;
  recommendation: string;
  reason: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface PickingItem {
  productId: string;
  productName: string;
  sku: string;
  location: Location;
  quantity: number;
  status: PickItemStatus;
}

export interface PickingTask {
  id: string;
  orderId: string;
  workerId: string | null;
  items: PickingItem[];
  route: Location[];
  estimatedDistance: number;
  estimatedTimeMin: number;
  stops: number;
  zoneCongestion: number;
  status: PickingTaskStatus;
  startedAt?: string;
  completedAt?: string;
  efficiencyScore: number;
}

export interface PackingTask {
  id: string;
  orderId: string;
  workerId: string | null;
  items: OrderItem[];
  packageType: 'STANDARD' | 'FRAGILE' | 'LARGE';
  station: string;
  checklist: { label: string; done: boolean }[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  startedAt?: string;
  completedAt?: string;
}

export interface QualityCheck {
  id: string;
  orderId: string;
  inspectorId: string | null;
  status: 'PASS' | 'FAIL' | 'PENDING';
  failures: { productId: string; issue: string; quantity: number }[];
  checkedAt?: string;
}

export interface Exception {
  id: string;
  type: ExceptionType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  orderId?: string;
  productId?: string;
  title: string;
  description: string;
  recommendation: string;
  status: ExceptionStatus;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface ReplenishmentRequest {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  available: number;
  pendingDemand: number;
  incoming: number;
  safetyStock: number;
  recommendedQty: number;
  risk: RiskLevel;
  status: 'PENDING' | 'APPROVED' | 'ORDERED' | 'RECEIVED';
  createdAt: string;
  approvedBy?: string;
}

export interface Dispatch {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'DELAYED';
  dispatchedAt?: string;
  estimatedDelivery: string;
}

export interface Notification {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export interface Decision {
  id: string;
  type: DecisionType;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
  reason: string;
  expectedResult: string;
  status: DecisionStatus;
  relatedOrderId?: string;
  relatedProductId?: string;
  createdAt: string;
  approvedBy?: string;
  approvedAt?: string;
  executedAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  user: string;
  previousState: string;
  newState: string;
  reason: string;
  timestamp: string;
}

export interface WorkerAssignment {
  workerId: string;
  workerName: string;
  zone: string;
  taskCount: number;
  utilization: number;
  status: 'AVAILABLE' | 'BUSY' | 'BREAK';
}

export interface WarehouseHealth {
  overall: number;
  inventoryHealth: number;
  orderHealth: number;
  pickingEfficiency: number;
  packingEfficiency: number;
  dispatchEfficiency: number;
  exceptionHealth: number;
}

export interface Bottleneck {
  id: string;
  stage: 'PICKING' | 'PACKING' | 'QC' | 'DISPATCH';
  zone?: string;
  workload: number;
  normalWorkload: number;
  cause: string;
  recommendation: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
}

export interface AppState {
  currentUser: User;
  users: User[];
  products: Product[];
  inventory: Inventory[];
  transactions: InventoryTransaction[];
  orders: Order[];
  allocations: Allocation[];
  pickingTasks: PickingTask[];
  packingTasks: PackingTask[];
  qualityChecks: QualityCheck[];
  exceptions: Exception[];
  replenishments: ReplenishmentRequest[];
  dispatches: Dispatch[];
  notifications: Notification[];
  decisions: Decision[];
  auditLogs: AuditLog[];
  workerAssignments: WorkerAssignment[];
}
