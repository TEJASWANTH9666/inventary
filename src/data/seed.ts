import type {
  User, Product, Inventory, InventoryTransaction, Order, OrderItem,
  Allocation, PickingTask, PackingTask, QualityCheck, Exception,
  ReplenishmentRequest, Dispatch, Notification, Decision, AuditLog,
  WorkerAssignment, Location,
} from '@/types';

// ─── Helpers ──────────────────────────────────────────────
const now = new Date();
const iso = (d: Date) => d.toISOString();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);
const hoursFromNow = (h: number) => new Date(now.getTime() + h * 3600_000);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000);
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400_000);

const loc = (w: string, z: string, r: string, s: string, b: string, x: number, y: number): Location => ({
  warehouse: w, zone: z, rack: r, shelf: s, bin: b, x, y,
});

// ─── Users ───────────────────────────────────────────────
export const seedUsers: User[] = [
  { id: 'u1', name: 'Sarah Chen', role: 'manager', email: 'sarah@warezai.io', avatarColor: '#2563EB' },
  { id: 'u2', name: 'Marcus Reid', role: 'manager', email: 'marcus@warezai.io', avatarColor: '#7C3AED' },
  { id: 'u3', name: 'Diego Torres', role: 'worker', email: 'diego@warezai.io', avatarColor: '#10B981' },
  { id: 'u4', name: 'Aisha Khan', role: 'worker', email: 'aisha@warezai.io', avatarColor: '#F59E0B' },
  { id: 'u5', name: 'Tom Walker', role: 'worker', email: 'tom@warezai.io', avatarColor: '#EF4444' },
  { id: 'u6', name: 'Lena Park', role: 'worker', email: 'lena@warezai.io', avatarColor: '#06B6D4' },
  { id: 'u7', name: 'Raj Patel', role: 'inventory', email: 'raj@warezai.io', avatarColor: '#8B5CF6' },
  { id: 'u8', name: 'Nina Volkov', role: 'inventory', email: 'nina@warezai.io', avatarColor: '#EC4899' },
];

// ─── Products ────────────────────────────────────────────
const productSeed: [string, string, string, string, number, number, 'SMALL' | 'MEDIUM' | 'LARGE'][] = [
  ['LAP-204', 'ProBook X1 Laptop', 'Electronics', 'TechSupply Co.', 1299, 2.1, 'MEDIUM'],
  ['LAP-210', 'UltraBook Air Laptop', 'Electronics', 'TechSupply Co.', 1799, 1.8, 'MEDIUM'],
  ['PHN-101', 'Galaxy Pulse Phone', 'Electronics', 'MobileWorld Ltd.', 699, 0.4, 'SMALL'],
  ['PHN-102', 'iPhone Pulse Pro', 'Electronics', 'MobileWorld Ltd.', 1099, 0.4, 'SMALL'],
  ['TBL-301', 'TabSlate 11" Tablet', 'Electronics', 'TechSupply Co.', 549, 0.7, 'SMALL'],
  ['TBL-302', 'TabSlate Pro 13" Tablet', 'Electronics', 'TechSupply Co.', 899, 0.9, 'SMALL'],
  ['MON-401', 'ViewMax 27" Monitor', 'Electronics', 'DisplayTech Inc.', 349, 5.2, 'LARGE'],
  ['MON-402', 'ViewMax 32" 4K Monitor', 'Electronics', 'DisplayTech Inc.', 599, 7.1, 'LARGE'],
  ['KBD-501', 'MechKey RGB Keyboard', 'Accessories', 'PeripheralPro', 129, 0.9, 'SMALL'],
  ['KBD-502', 'ErgoSplit Keyboard', 'Accessories', 'PeripheralPro', 199, 1.1, 'SMALL'],
  ['MSE-601', 'Precision Mouse Pro', 'Accessories', 'PeripheralPro', 79, 0.2, 'SMALL'],
  ['MSE-602', 'Wireless Trackball', 'Accessories', 'PeripheralPro', 89, 0.3, 'SMALL'],
  ['HDH-701', 'AudioMax Headphones', 'Audio', 'SoundWave Ltd.', 249, 0.4, 'SMALL'],
  ['HDH-702', 'Studio Monitor Headphones', 'Audio', 'SoundWave Ltd.', 399, 0.5, 'SMALL'],
  ['SPK-801', 'Bluetooth Speaker Mini', 'Audio', 'SoundWave Ltd.', 59, 0.3, 'SMALL'],
  ['SPK-802', 'Party Speaker XL', 'Audio', 'SoundWave Ltd.', 179, 3.5, 'MEDIUM'],
  ['CAM-901', 'ActionCam 4K', 'Photography', 'CapturePro', 299, 0.3, 'SMALL'],
  ['CAM-902', 'DroneCam Flyer', 'Photography', 'CapturePro', 799, 1.4, 'MEDIUM'],
  ['PRT-110', 'LaserJet Pro Printer', 'Office', 'OfficeTech', 329, 8.5, 'LARGE'],
  ['PRT-111', 'InkJet Home Printer', 'Office', 'OfficeTech', 99, 3.2, 'MEDIUM'],
  ['CHR-120', 'Ergo Chair Deluxe', 'Furniture', 'FurnishCo', 449, 15.5, 'LARGE'],
  ['CHR-121', 'Standing Desk Mat', 'Furniture', 'FurnishCo', 69, 2.1, 'MEDIUM'],
  ['DSK-130', 'Sit-Stand Desk 48"', 'Furniture', 'FurnishCo', 599, 28.0, 'LARGE'],
  ['DSK-131', 'Corner Desk L-Shape', 'Furniture', 'FurnishCo', 799, 42.0, 'LARGE'],
  ['CBL-201', 'USB-C Cable 2m', 'Accessories', 'CableWorld', 19, 0.1, 'SMALL'],
  ['CBL-202', 'HDMI 2.1 Cable 3m', 'Accessories', 'CableWorld', 25, 0.2, 'SMALL'],
  ['CBL-203', 'Thunderbolt 4 Cable', 'Accessories', 'CableWorld', 49, 0.1, 'SMALL'],
  ['PWR-301', '65W USB-C Charger', 'Accessories', 'PowerUp Ltd.', 39, 0.2, 'SMALL'],
  ['PWR-302', '100W GaN Charger', 'Accessories', 'PowerUp Ltd.', 69, 0.3, 'SMALL'],
  ['BAG-401', 'Laptop Backpack 15"', 'Accessories', 'CarryGear', 79, 0.8, 'MEDIUM'],
  ['BAG-402', 'Messenger Bag Leather', 'Accessories', 'CarryGear', 149, 1.2, 'MEDIUM'],
  ['SCR-501', 'Screen Protector Pack', 'Accessories', 'ShieldPro', 15, 0.05, 'SMALL'],
  ['SCR-502', 'Privacy Screen Filter', 'Accessories', 'ShieldPro', 35, 0.1, 'SMALL'],
  ['HUB-601', 'USB-C Hub 7-in-1', 'Accessories', 'ConnectPro', 59, 0.2, 'SMALL'],
  ['HUB-602', 'Thunderbolt Dock', 'Accessories', 'ConnectPro', 299, 0.8, 'MEDIUM'],
  ['STG-701', 'External SSD 1TB', 'Storage', 'DataStore Inc.', 129, 0.1, 'SMALL'],
  ['STG-702', 'NAS Drive 4TB', 'Storage', 'DataStore Inc.', 249, 1.0, 'MEDIUM'],
  ['STG-703', 'MicroSD 256GB', 'Storage', 'DataStore Inc.', 39, 0.01, 'SMALL'],
  ['RTR-801', 'WiFi 6 Router', 'Networking', 'NetPro', 149, 0.6, 'MEDIUM'],
  ['RTR-802', 'Mesh WiFi System', 'Networking', 'NetPro', 299, 2.5, 'MEDIUM'],
  ['SWT-901', '24-Port Gigabit Switch', 'Networking', 'NetPro', 199, 1.5, 'MEDIUM'],
  ['UPS-101', 'Battery Backup UPS', 'Power', 'PowerUp Ltd.', 129, 4.0, 'MEDIUM'],
  ['LMP-201', 'Smart LED Desk Lamp', 'Lighting', 'BrightHome', 49, 1.2, 'SMALL'],
  ['LMP-202', 'RGB Floor Lamp', 'Lighting', 'BrightHome', 99, 5.0, 'LARGE'],
  ['FAN-301', 'USB Desk Fan', 'Cooling', 'CoolTech', 29, 0.5, 'SMALL'],
  ['CLN-401', 'Screen Cleaning Kit', 'Maintenance', 'CleanPro', 19, 0.3, 'SMALL'],
  ['CLN-402', 'Air Duster Compressed', 'Maintenance', 'CleanPro', 12, 0.4, 'SMALL'],
  ['WBT-501', 'Wrist Rest Gel', 'Accessories', 'ComfortPro', 22, 0.3, 'SMALL'],
  ['WBT-502', 'Mouse Pad XL', 'Accessories', 'ComfortPro', 35, 0.5, 'SMALL'],
  ['STN-601', 'Laptop Stand Aluminum', 'Accessories', 'ErgoWorks', 59, 0.7, 'MEDIUM'],
  ['STN-602', 'Monitor Arm Dual', 'Accessories', 'ErgoWorks', 129, 3.2, 'LARGE'],
];

export const seedProducts: Product[] = productSeed.map((p, i) => ({
  id: `p${i + 1}`,
  sku: p[0], name: p[1], category: p[2], supplier: p[3],
  unitPrice: p[4], weightKg: p[5], packageSize: p[6],
}));

const productBySku = (sku: string) => seedProducts.find(p => p.sku === sku)!;

// ─── Inventory ────────────────────────────────────────────
interface InvSeed { sku: string; loc: Location; total: number; available: number; reserved: number; damaged: number; safety: number; reorder: number; incoming: number; etaHours: number | null; }

const invSeeds: InvSeed[] = [
  // LAP-204 — the critical demo SKU. Available 7, incoming 5, safety 15
  { sku: 'LAP-204', loc: loc('WH1', 'A', '12', '04', 'B', 12, 4), total: 15, available: 7, reserved: 3, damaged: 5, safety: 15, reorder: 25, incoming: 5, etaHours: 48 },
  { sku: 'LAP-204', loc: loc('WH1', 'A', '14', '02', 'C', 14, 2), total: 0, available: 0, reserved: 0, damaged: 0, safety: 0, reorder: 0, incoming: 0, etaHours: null },
  // LAP-210 — healthy
  { sku: 'LAP-210', loc: loc('WH1', 'A', '15', '01', 'A', 15, 1), total: 45, available: 38, reserved: 5, damaged: 2, safety: 10, reorder: 20, incoming: 0, etaHours: null },
  // PHN-101 — low stock
  { sku: 'PHN-101', loc: loc('WH1', 'B', '03', '02', 'A', 3, 2), total: 18, available: 12, reserved: 4, damaged: 2, safety: 15, reorder: 25, incoming: 10, etaHours: 24 },
  // PHN-102 — healthy
  { sku: 'PHN-102', loc: loc('WH1', 'B', '04', '01', 'B', 4, 1), total: 60, available: 52, reserved: 6, damaged: 2, safety: 20, reorder: 30, incoming: 0, etaHours: null },
  // TBL-301 — out of stock
  { sku: 'TBL-301', loc: loc('WH1', 'B', '05', '03', 'D', 5, 3), total: 0, available: 0, reserved: 0, damaged: 0, safety: 10, reorder: 15, incoming: 20, etaHours: 72 },
  // TBL-302 — healthy
  { sku: 'TBL-302', loc: loc('WH1', 'B', '06', '02', 'A', 6, 2), total: 35, available: 30, reserved: 3, damaged: 2, safety: 8, reorder: 15, incoming: 0, etaHours: null },
  // MON-401 — critical
  { sku: 'MON-401', loc: loc('WH1', 'C', '01', '05', 'B', 1, 5), total: 8, available: 5, reserved: 2, damaged: 1, safety: 12, reorder: 20, incoming: 15, etaHours: 96 },
  // MON-402 — healthy
  { sku: 'MON-402', loc: loc('WH1', 'C', '02', '03', 'A', 2, 3), total: 28, available: 24, reserved: 3, damaged: 1, safety: 8, reorder: 15, incoming: 0, etaHours: null },
  // KBD-501 — healthy
  { sku: 'KBD-501', loc: loc('WH1', 'C', '03', '01', 'C', 3, 1), total: 120, available: 110, reserved: 8, damaged: 2, safety: 30, reorder: 50, incoming: 0, etaHours: null },
  // KBD-502 — low
  { sku: 'KBD-502', loc: loc('WH1', 'C', '04', '02', 'B', 4, 2), total: 22, available: 15, reserved: 5, damaged: 2, safety: 20, reorder: 35, incoming: 25, etaHours: 48 },
  // MSE-601 — healthy
  { sku: 'MSE-601', loc: loc('WH1', 'C', '05', '04', 'A', 5, 4), total: 200, available: 185, reserved: 12, damaged: 3, safety: 40, reorder: 60, incoming: 0, etaHours: null },
  // MSE-602 — healthy
  { sku: 'MSE-602', loc: loc('WH1', 'C', '06', '01', 'D', 6, 1), total: 85, available: 78, reserved: 5, damaged: 2, safety: 20, reorder: 35, incoming: 0, etaHours: null },
  // HDH-701 — healthy
  { sku: 'HDH-701', loc: loc('WH1', 'D', '01', '02', 'B', 1, 2), total: 70, available: 62, reserved: 6, damaged: 2, safety: 15, reorder: 25, incoming: 0, etaHours: null },
  // HDH-702 — low
  { sku: 'HDH-702', loc: loc('WH1', 'D', '02', '04', 'C', 2, 4), total: 25, available: 18, reserved: 5, damaged: 2, safety: 15, reorder: 25, incoming: 15, etaHours: 36 },
  // SPK-801 — healthy
  { sku: 'SPK-801', loc: loc('WH1', 'D', '03', '01', 'A', 3, 1), total: 150, available: 140, reserved: 8, damaged: 2, safety: 30, reorder: 50, incoming: 0, etaHours: null },
  // SPK-802 — healthy
  { sku: 'SPK-802', loc: loc('WH1', 'D', '04', '03', 'B', 4, 3), total: 45, available: 40, reserved: 3, damaged: 2, safety: 10, reorder: 20, incoming: 0, etaHours: null },
  // CAM-901 — healthy
  { sku: 'CAM-901', loc: loc('WH1', 'E', '01', '02', 'D', 1, 2), total: 55, available: 48, reserved: 5, damaged: 2, safety: 12, reorder: 20, incoming: 0, etaHours: null },
  // CAM-902 — critical
  { sku: 'CAM-902', loc: loc('WH1', 'E', '02', '05', 'A', 2, 5), total: 6, available: 4, reserved: 1, damaged: 1, safety: 8, reorder: 15, incoming: 12, etaHours: 72 },
  // PRT-110 — healthy
  { sku: 'PRT-110', loc: loc('WH1', 'E', '03', '01', 'C', 3, 1), total: 30, available: 26, reserved: 3, damaged: 1, safety: 8, reorder: 15, incoming: 0, etaHours: null },
  // PRT-111 — healthy
  { sku: 'PRT-111', loc: loc('WH1', 'E', '04', '02', 'B', 4, 2), total: 40, available: 35, reserved: 4, damaged: 1, safety: 10, reorder: 18, incoming: 0, etaHours: null },
  // CHR-120 — low
  { sku: 'CHR-120', loc: loc('WH2', 'A', '01', '03', 'A', 1, 3), total: 18, available: 12, reserved: 4, damaged: 2, safety: 10, reorder: 18, incoming: 10, etaHours: 48 },
  // CHR-121 — healthy
  { sku: 'CHR-121', loc: loc('WH2', 'A', '02', '01', 'B', 2, 1), total: 60, available: 55, reserved: 3, damaged: 2, safety: 15, reorder: 25, incoming: 0, etaHours: null },
  // DSK-130 — healthy
  { sku: 'DSK-130', loc: loc('WH2', 'A', '03', '04', 'C', 3, 4), total: 22, available: 18, reserved: 3, damaged: 1, safety: 6, reorder: 12, incoming: 0, etaHours: null },
  // DSK-131 — healthy
  { sku: 'DSK-131', loc: loc('WH2', 'A', '04', '02', 'D', 4, 2), total: 15, available: 12, reserved: 2, damaged: 1, safety: 5, reorder: 10, incoming: 0, etaHours: null },
  // CBL-201 — healthy
  { sku: 'CBL-201', loc: loc('WH1', 'F', '01', '01', 'A', 1, 1), total: 500, available: 480, reserved: 15, damaged: 5, safety: 100, reorder: 200, incoming: 0, etaHours: null },
  // CBL-202 — healthy
  { sku: 'CBL-202', loc: loc('WH1', 'F', '02', '02', 'B', 2, 2), total: 300, available: 280, reserved: 15, damaged: 5, safety: 60, reorder: 120, incoming: 0, etaHours: null },
  // CBL-203 — healthy
  { sku: 'CBL-203', loc: loc('WH1', 'F', '03', '03', 'C', 3, 3), total: 180, available: 165, reserved: 10, damaged: 5, safety: 40, reorder: 80, incoming: 0, etaHours: null },
  // PWR-301 — healthy
  { sku: 'PWR-301', loc: loc('WH1', 'F', '04', '04', 'D', 4, 4), total: 250, available: 230, reserved: 15, damaged: 5, safety: 50, reorder: 100, incoming: 0, etaHours: null },
  // PWR-302 — healthy
  { sku: 'PWR-302', loc: loc('WH1', 'F', '05', '01', 'A', 5, 1), total: 140, available: 128, reserved: 10, damaged: 2, safety: 30, reorder: 60, incoming: 0, etaHours: null },
  // BAG-401 — healthy
  { sku: 'BAG-401', loc: loc('WH1', 'G', '01', '02', 'B', 1, 2), total: 80, available: 72, reserved: 6, damaged: 2, safety: 20, reorder: 35, incoming: 0, etaHours: null },
  // BAG-402 — low
  { sku: 'BAG-402', loc: loc('WH1', 'G', '02', '04', 'C', 2, 4), total: 20, available: 14, reserved: 4, damaged: 2, safety: 12, reorder: 20, incoming: 15, etaHours: 48 },
  // SCR-501 — healthy
  { sku: 'SCR-501', loc: loc('WH1', 'G', '03', '01', 'A', 3, 1), total: 400, available: 380, reserved: 15, damaged: 5, safety: 80, reorder: 150, incoming: 0, etaHours: null },
  // SCR-502 — healthy
  { sku: 'SCR-502', loc: loc('WH1', 'G', '04', '03', 'D', 4, 3), total: 120, available: 110, reserved: 8, damaged: 2, safety: 25, reorder: 50, incoming: 0, etaHours: null },
  // HUB-601 — healthy
  { sku: 'HUB-601', loc: loc('WH1', 'G', '05', '02', 'B', 5, 2), total: 90, available: 82, reserved: 6, damaged: 2, safety: 20, reorder: 35, incoming: 0, etaHours: null },
  // HUB-602 — low
  { sku: 'HUB-602', loc: loc('WH1', 'G', '06', '05', 'C', 6, 5), total: 24, available: 18, reserved: 4, damaged: 2, safety: 12, reorder: 20, incoming: 10, etaHours: 60 },
  // STG-701 — healthy
  { sku: 'STG-701', loc: loc('WH1', 'H', '01', '01', 'A', 1, 1), total: 160, available: 148, reserved: 10, damaged: 2, safety: 30, reorder: 60, incoming: 0, etaHours: null },
  // STG-702 — healthy
  { sku: 'STG-702', loc: loc('WH1', 'H', '02', '03', 'B', 2, 3), total: 50, available: 44, reserved: 4, damaged: 2, safety: 12, reorder: 22, incoming: 0, etaHours: null },
  // STG-703 — healthy
  { sku: 'STG-703', loc: loc('WH1', 'H', '03', '02', 'C', 3, 2), total: 350, available: 330, reserved: 15, damaged: 5, safety: 60, reorder: 120, incoming: 0, etaHours: null },
  // RTR-801 — healthy
  { sku: 'RTR-801', loc: loc('WH1', 'H', '04', '04', 'D', 4, 4), total: 65, available: 58, reserved: 5, damaged: 2, safety: 15, reorder: 28, incoming: 0, etaHours: null },
  // RTR-802 — healthy
  { sku: 'RTR-802', loc: loc('WH1', 'H', '05', '01', 'A', 5, 1), total: 35, available: 30, reserved: 4, damaged: 1, safety: 8, reorder: 15, incoming: 0, etaHours: null },
  // SWT-901 — healthy
  { sku: 'SWT-901', loc: loc('WH1', 'H', '06', '03', 'B', 6, 3), total: 28, available: 24, reserved: 3, damaged: 1, safety: 6, reorder: 12, incoming: 0, etaHours: null },
  // UPS-101 — healthy
  { sku: 'UPS-101', loc: loc('WH2', 'B', '01', '02', 'A', 1, 2), total: 42, available: 38, reserved: 3, damaged: 1, safety: 10, reorder: 18, incoming: 0, etaHours: null },
  // LMP-201 — healthy
  { sku: 'LMP-201', loc: loc('WH2', 'B', '02', '04', 'C', 2, 4), total: 110, available: 100, reserved: 8, damaged: 2, safety: 20, reorder: 40, incoming: 0, etaHours: null },
  // LMP-202 — healthy
  { sku: 'LMP-202', loc: loc('WH2', 'B', '03', '01', 'D', 3, 1), total: 38, available: 33, reserved: 4, damaged: 1, safety: 8, reorder: 15, incoming: 0, etaHours: null },
  // FAN-301 — healthy
  { sku: 'FAN-301', loc: loc('WH2', 'B', '04', '03', 'B', 4, 3), total: 180, available: 168, reserved: 10, damaged: 2, safety: 30, reorder: 60, incoming: 0, etaHours: null },
  // CLN-401 — healthy
  { sku: 'CLN-401', loc: loc('WH1', 'F', '06', '05', 'E', 6, 5), total: 220, available: 205, reserved: 12, damaged: 3, safety: 40, reorder: 80, incoming: 0, etaHours: null },
  // CLN-402 — healthy
  { sku: 'CLN-402', loc: loc('WH1', 'F', '07', '02', 'F', 7, 2), total: 160, available: 148, reserved: 10, damaged: 2, safety: 30, reorder: 60, incoming: 0, etaHours: null },
  // WBT-501 — healthy
  { sku: 'WBT-501', loc: loc('WH1', 'C', '07', '04', 'E', 7, 4), total: 140, available: 130, reserved: 8, damaged: 2, safety: 25, reorder: 50, incoming: 0, etaHours: null },
  // WBT-502 — healthy
  { sku: 'WBT-502', loc: loc('WH1', 'C', '08', '02', 'F', 8, 2), total: 95, available: 87, reserved: 6, damaged: 2, safety: 20, reorder: 35, incoming: 0, etaHours: null },
  // STN-601 — healthy
  { sku: 'STN-601', loc: loc('WH1', 'G', '07', '01', 'E', 7, 1), total: 75, available: 68, reserved: 5, damaged: 2, safety: 15, reorder: 28, incoming: 0, etaHours: null },
  // STN-602 — healthy
  { sku: 'STN-602', loc: loc('WH2', 'A', '05', '03', 'E', 5, 3), total: 32, available: 28, reserved: 3, damaged: 1, safety: 8, reorder: 15, incoming: 0, etaHours: null },
];

export const seedInventory: Inventory[] = invSeeds.map((s, i) => ({
  id: `inv${i + 1}`,
  productId: productBySku(s.sku).id,
  location: s.loc,
  totalQuantity: s.total,
  availableQuantity: s.available,
  reservedQuantity: s.reserved,
  damagedQuantity: s.damaged,
  safetyStock: s.safety,
  reorderLevel: s.reorder,
  incomingQuantity: s.incoming,
  incomingEta: s.etaHours ? iso(hoursFromNow(s.etaHours)) : null,
  lastUpdated: iso(hoursAgo(Math.floor(Math.random() * 12) + 1)),
}));

// ─── Inventory Transactions ──────────────────────────────
export const seedTransactions: InventoryTransaction[] = [
  { id: 't1', inventoryId: 'inv1', productId: 'p1', type: 'INBOUND', quantity: 20, balanceAfter: 20, reason: 'Initial stock receipt', timestamp: iso(daysAgo(14)), user: 'Raj Patel' },
  { id: 't2', inventoryId: 'inv1', productId: 'p1', type: 'DAMAGE', quantity: 5, balanceAfter: 15, reason: 'Water damage during transit', timestamp: iso(daysAgo(5)), user: 'Raj Patel' },
  { id: 't3', inventoryId: 'inv1', productId: 'p1', type: 'RESERVE', quantity: 3, balanceAfter: 12, reason: 'Reserved for Order #1038', timestamp: iso(daysAgo(2)), user: 'Sarah Chen' },
  { id: 't4', inventoryId: 'inv3', productId: 'p3', type: 'INBOUND', quantity: 30, balanceAfter: 30, reason: 'Restock from supplier', timestamp: iso(daysAgo(7)), user: 'Nina Volkov' },
  { id: 't5', inventoryId: 'inv3', productId: 'p3', type: 'OUTBOUND', quantity: 12, balanceAfter: 18, reason: 'Order #1029 fulfilled', timestamp: iso(daysAgo(3)), user: 'Diego Torres' },
  { id: 't6', inventoryId: 'inv7', productId: 'p7', type: 'DAMAGE', quantity: 1, balanceAfter: 8, reason: 'Screen cracked in handling', timestamp: iso(daysAgo(1)), user: 'Aisha Khan' },
  { id: 't7', inventoryId: 'inv9', productId: 'p9', type: 'INBOUND', quantity: 50, balanceAfter: 120, reason: 'Bulk restock', timestamp: iso(daysAgo(10)), user: 'Raj Patel' },
  { id: 't8', inventoryId: 'inv19', productId: 'p19', type: 'DAMAGE', quantity: 1, balanceAfter: 6, reason: 'Propeller damage', timestamp: iso(hoursAgo(6)), user: 'Tom Walker' },
];

// ─── Orders ──────────────────────────────────────────────
const customers = [
  ['TechCorp Solutions', 'VIP'], ['Global Retail Co', 'VIP'], ['StartUp Hub', 'NEW'],
  ['Enterprise LLC', 'STANDARD'], ['MegaStore Inc', 'VIP'], ['QuickShip Ltd', 'STANDARD'],
  ['DataSys Corp', 'STANDARD'], ['CloudFirst Inc', 'VIP'], ['NimbusTech', 'NEW'],
  ['PrimeLogistics', 'STANDARD'], ['OmniChannel Co', 'VIP'], ['FastTrack Ltd', 'STANDARD'],
  ['BlueOcean LLC', 'STANDARD'], ['GreenLeaf Inc', 'NEW'], ['SilverLine Co', 'STANDARD'],
  ['GoldStar Corp', 'VIP'], ['RedBrick LLC', 'STANDARD'], ['SkyHigh Tech', 'NEW'],
  ['DeepBlue Inc', 'STANDARD'], ['BrightPath Co', 'STANDARD'],
];

function makeOrderItem(sku: string, qty: number, allocated = 0): OrderItem {
  const p = productBySku(sku);
  return { productId: p.id, productName: p.name, sku, quantity: qty, allocatedQuantity: allocated };
}

interface OrderSeed {
  id: string; customerIdx: number; items: [string, number][]; createdHoursAgo: number;
  slaHoursFromNow: number; status: Order['status']; allocation: Order['allocationStatus'];
  workerId?: string; notes?: string;
}

const orderSeeds: OrderSeed[] = [
  // ─── CRITICAL DEMO SCENARIO ───
  // Order #1045 — Critical, needs 10 LAP-204, only 7 available
  { id: '1045', customerIdx: 0, items: [['LAP-204', 10]], createdHoursAgo: 2, slaHoursFromNow: 6, status: 'CREATED', allocation: 'NONE', notes: 'VIP customer — enterprise deployment deadline' },
  // Order #1052 — lower priority, needs 5 LAP-204, competing for same stock
  { id: '1052', customerIdx: 9, items: [['LAP-204', 5]], createdHoursAgo: 8, slaHoursFromNow: 48, status: 'CREATED', allocation: 'NONE', notes: 'Standard delivery window' },
  // ─── Partial stock scenario ───
  { id: '1046', customerIdx: 1, items: [['PHN-101', 20]], createdHoursAgo: 3, slaHoursFromNow: 12, status: 'CREATED', allocation: 'NONE' },
  // ─── Complete stockout scenario ───
  { id: '1047', customerIdx: 2, items: [['TBL-301', 15]], createdHoursAgo: 5, slaHoursFromNow: 24, status: 'CREATED', allocation: 'NONE' },
  // ─── Multiple orders competing for same SKU ───
  { id: '1048', customerIdx: 4, items: [['MON-401', 8]], createdHoursAgo: 4, slaHoursFromNow: 10, status: 'CREATED', allocation: 'NONE', notes: 'VIP — boardroom install' },
  { id: '1049', customerIdx: 7, items: [['MON-401', 6]], createdHoursAgo: 6, slaHoursFromNow: 18, status: 'CREATED', allocation: 'NONE' },
  // ─── SLA-critical order ───
  { id: '1050', customerIdx: 15, items: [['CAM-902', 4], ['HDH-702', 6]], createdHoursAgo: 1, slaHoursFromNow: 4, status: 'CREATED', allocation: 'NONE', notes: 'VIP — event production deadline' },
  // ─── Damaged item scenario ───
  { id: '1051', customerIdx: 3, items: [['KBD-502', 12]], createdHoursAgo: 7, slaHoursFromNow: 20, status: 'CREATED', allocation: 'NONE' },
  // ─── Orders in various stages ───
  { id: '1038', customerIdx: 5, items: [['LAP-204', 3], ['MSE-601', 5]], createdHoursAgo: 26, slaHoursFromNow: 0, status: 'PICKING', allocation: 'FULL', workerId: 'u3' },
  { id: '1039', customerIdx: 6, items: [['PHN-102', 8], ['SCR-501', 20]], createdHoursAgo: 28, slaHoursFromNow: 0, status: 'PACKING', allocation: 'FULL', workerId: 'u4' },
  { id: '1040', customerIdx: 8, items: [['TBL-302', 5], ['KBD-501', 10]], createdHoursAgo: 30, slaHoursFromNow: 0, status: 'QC_PENDING', allocation: 'FULL', workerId: 'u4' },
  { id: '1041', customerIdx: 10, items: [['MON-402', 4]], createdHoursAgo: 32, slaHoursFromNow: 0, status: 'READY_DISPATCH', allocation: 'FULL' },
  { id: '1042', customerIdx: 11, items: [['SPK-801', 15], ['CBL-201', 30]], createdHoursAgo: 34, slaHoursFromNow: 0, status: 'DISPATCHED', allocation: 'FULL' },
  { id: '1043', customerIdx: 12, items: [['DSK-130', 3]], createdHoursAgo: 36, slaHoursFromNow: 0, status: 'COMPLETED', allocation: 'FULL' },
  { id: '1044', customerIdx: 13, items: [['CHR-120', 8]], createdHoursAgo: 10, slaHoursFromNow: 14, status: 'CREATED', allocation: 'NONE' },
  { id: '1053', customerIdx: 16, items: [['BAG-402', 10]], createdHoursAgo: 9, slaHoursFromNow: 22, status: 'CREATED', allocation: 'NONE' },
  { id: '1054', customerIdx: 17, items: [['HUB-602', 6]], createdHoursAgo: 5, slaHoursFromNow: 16, status: 'CREATED', allocation: 'NONE' },
  { id: '1055', customerIdx: 18, items: [['STG-702', 4], ['RTR-801', 3]], createdHoursAgo: 12, slaHoursFromNow: 28, status: 'CREATED', allocation: 'NONE' },
  { id: '1056', customerIdx: 19, items: [['LMP-202', 5], ['FAN-301', 10]], createdHoursAgo: 15, slaHoursFromNow: 32, status: 'CREATED', allocation: 'NONE' },
  { id: '1057', customerIdx: 0, items: [['PRT-110', 3]], createdHoursAgo: 18, slaHoursFromNow: 6, status: 'CREATED', allocation: 'NONE', notes: 'VIP — urgent office setup' },
  { id: '1058', customerIdx: 1, items: [['DSK-131', 2], ['CHR-121', 4]], createdHoursAgo: 20, slaHoursFromNow: 36, status: 'CREATED', allocation: 'NONE' },
  { id: '1059', customerIdx: 2, items: [['CBL-203', 15], ['PWR-302', 8]], createdHoursAgo: 22, slaHoursFromNow: 40, status: 'CREATED', allocation: 'NONE' },
  { id: '1060', customerIdx: 3, items: [['STN-601', 6]], createdHoursAgo: 24, slaHoursFromNow: 44, status: 'CREATED', allocation: 'NONE' },
  { id: '1061', customerIdx: 4, items: [['SWT-901', 4]], createdHoursAgo: 14, slaHoursFromNow: 26, status: 'CREATED', allocation: 'NONE' },
  { id: '1062', customerIdx: 5, items: [['UPS-101', 6]], createdHoursAgo: 16, slaHoursFromNow: 30, status: 'CREATED', allocation: 'NONE' },
  { id: '1063', customerIdx: 6, items: [['LMP-201', 12]], createdHoursAgo: 11, slaHoursFromNow: 24, status: 'CREATED', allocation: 'NONE' },
  { id: '1064', customerIdx: 7, items: [['WBT-501', 15], ['WBT-502', 10]], createdHoursAgo: 13, slaHoursFromNow: 28, status: 'CREATED', allocation: 'NONE' },
  { id: '1065', customerIdx: 8, items: [['STN-602', 3]], createdHoursAgo: 17, slaHoursFromNow: 34, status: 'CREATED', allocation: 'NONE' },
  { id: '1066', customerIdx: 9, items: [['SCR-502', 20]], createdHoursAgo: 19, slaHoursFromNow: 38, status: 'CREATED', allocation: 'NONE' },
  { id: '1067', customerIdx: 10, items: [['HUB-601', 10]], createdHoursAgo: 21, slaHoursFromNow: 42, status: 'CREATED', allocation: 'NONE' },
  { id: '1068', customerIdx: 11, items: [['MSE-602', 8]], createdHoursAgo: 23, slaHoursFromNow: 46, status: 'CREATED', allocation: 'NONE' },
  { id: '1069', customerIdx: 12, items: [['SPK-802', 5]], createdHoursAgo: 25, slaHoursFromNow: 50, status: 'CREATED', allocation: 'NONE' },
  { id: '1070', customerIdx: 13, items: [['CAM-901', 6]], createdHoursAgo: 27, slaHoursFromNow: 54, status: 'CREATED', allocation: 'NONE' },
  { id: '1071', customerIdx: 14, items: [['PRT-111', 4]], createdHoursAgo: 29, slaHoursFromNow: 58, status: 'CREATED', allocation: 'NONE' },
  { id: '1072', customerIdx: 15, items: [['DSK-130', 2]], createdHoursAgo: 31, slaHoursFromNow: 62, status: 'CREATED', allocation: 'NONE' },
  { id: '1073', customerIdx: 16, items: [['RTR-802', 3]], createdHoursAgo: 33, slaHoursFromNow: 66, status: 'CREATED', allocation: 'NONE' },
  { id: '1074', customerIdx: 17, items: [['STG-701', 10]], createdHoursAgo: 35, slaHoursFromNow: 70, status: 'CREATED', allocation: 'NONE' },
  { id: '1075', customerIdx: 18, items: [['STG-703', 25]], createdHoursAgo: 37, slaHoursFromNow: 74, status: 'CREATED', allocation: 'NONE' },
  { id: '1076', customerIdx: 19, items: [['CLN-401', 30]], createdHoursAgo: 39, slaHoursFromNow: 78, status: 'CREATED', allocation: 'NONE' },
  { id: '1077', customerIdx: 0, items: [['CLN-402', 20]], createdHoursAgo: 40, slaHoursFromNow: 82, status: 'CREATED', allocation: 'NONE' },
  { id: '1078', customerIdx: 1, items: [['LAP-210', 5]], createdHoursAgo: 42, slaHoursFromNow: 86, status: 'CREATED', allocation: 'NONE' },
  { id: '1079', customerIdx: 2, items: [['PHN-102', 10]], createdHoursAgo: 44, slaHoursFromNow: 90, status: 'CREATED', allocation: 'NONE' },
  { id: '1080', customerIdx: 3, items: [['TBL-302', 3]], createdHoursAgo: 46, slaHoursFromNow: 94, status: 'CREATED', allocation: 'NONE' },
  { id: '1081', customerIdx: 4, items: [['MON-402', 2]], createdHoursAgo: 48, slaHoursFromNow: 98, status: 'CREATED', allocation: 'NONE' },
  { id: '1082', customerIdx: 5, items: [['KBD-501', 8]], createdHoursAgo: 50, slaHoursFromNow: 102, status: 'CREATED', allocation: 'NONE' },
  { id: '1083', customerIdx: 6, items: [['MSE-601', 12]], createdHoursAgo: 52, slaHoursFromNow: 106, status: 'CREATED', allocation: 'NONE' },
  { id: '1084', customerIdx: 7, items: [['HDH-701', 6]], createdHoursAgo: 54, slaHoursFromNow: 110, status: 'CREATED', allocation: 'NONE' },
  { id: '1085', customerIdx: 8, items: [['SPK-801', 8]], createdHoursAgo: 56, slaHoursFromNow: 114, status: 'CREATED', allocation: 'NONE' },
  { id: '1086', customerIdx: 9, items: [['CAM-901', 3]], createdHoursAgo: 58, slaHoursFromNow: 118, status: 'CREATED', allocation: 'NONE' },
  { id: '1087', customerIdx: 10, items: [['PRT-110', 2]], createdHoursAgo: 60, slaHoursFromNow: 122, status: 'CREATED', allocation: 'NONE' },
  { id: '1088', customerIdx: 11, items: [['CHR-121', 5]], createdHoursAgo: 62, slaHoursFromNow: 126, status: 'CREATED', allocation: 'NONE' },
  { id: '1089', customerIdx: 12, items: [['DSK-131', 1]], createdHoursAgo: 64, slaHoursFromNow: 130, status: 'CREATED', allocation: 'NONE' },
  { id: '1090', customerIdx: 13, items: [['CBL-202', 25]], createdHoursAgo: 66, slaHoursFromNow: 134, status: 'CREATED', allocation: 'NONE' },
  { id: '1091', customerIdx: 14, items: [['PWR-301', 15]], createdHoursAgo: 68, slaHoursFromNow: 138, status: 'CREATED', allocation: 'NONE' },
  { id: '1092', customerIdx: 15, items: [['BAG-401', 7]], createdHoursAgo: 70, slaHoursFromNow: 142, status: 'CREATED', allocation: 'NONE' },
  { id: '1093', customerIdx: 16, items: [['SCR-501', 40]], createdHoursAgo: 72, slaHoursFromNow: 146, status: 'CREATED', allocation: 'NONE' },
  { id: '1094', customerIdx: 17, items: [['RTR-801', 4]], createdHoursAgo: 74, slaHoursFromNow: 150, status: 'CREATED', allocation: 'NONE' },
  { id: '1095', customerIdx: 18, items: [['LMP-201', 6]], createdHoursAgo: 76, slaHoursFromNow: 154, status: 'CREATED', allocation: 'NONE' },
  { id: '1096', customerIdx: 19, items: [['FAN-301', 8]], createdHoursAgo: 78, slaHoursFromNow: 158, status: 'CREATED', allocation: 'NONE' },
  { id: '1097', customerIdx: 0, items: [['WBT-502', 12]], createdHoursAgo: 80, slaHoursFromNow: 162, status: 'CREATED', allocation: 'NONE' },
  { id: '1098', customerIdx: 1, items: [['STN-601', 4]], createdHoursAgo: 82, slaHoursFromNow: 166, status: 'CREATED', allocation: 'NONE' },
  { id: '1099', customerIdx: 2, items: [['HUB-602', 3]], createdHoursAgo: 84, slaHoursFromNow: 170, status: 'CREATED', allocation: 'NONE' },
  { id: '1100', customerIdx: 3, items: [['STG-701', 8]], createdHoursAgo: 86, slaHoursFromNow: 174, status: 'CREATED', allocation: 'NONE' },
  { id: '1101', customerIdx: 4, items: [['STG-703', 15]], createdHoursAgo: 88, slaHoursFromNow: 178, status: 'CREATED', allocation: 'NONE' },
  { id: '1102', customerIdx: 5, items: [['SWT-901', 2]], createdHoursAgo: 90, slaHoursFromNow: 182, status: 'CREATED', allocation: 'NONE' },
  { id: '1103', customerIdx: 6, items: [['UPS-101', 4]], createdHoursAgo: 92, slaHoursFromNow: 186, status: 'CREATED', allocation: 'NONE' },
  { id: '1104', customerIdx: 7, items: [['LMP-202', 3]], createdHoursAgo: 94, slaHoursFromNow: 190, status: 'CREATED', allocation: 'NONE' },
  { id: '1105', customerIdx: 8, items: [['CLN-401', 15]], createdHoursAgo: 96, slaHoursFromNow: 194, status: 'CREATED', allocation: 'NONE' },
  { id: '1106', customerIdx: 9, items: [['CLN-402', 10]], createdHoursAgo: 98, slaHoursFromNow: 198, status: 'CREATED', allocation: 'NONE' },
  { id: '1107', customerIdx: 10, items: [['SCR-502', 12]], createdHoursAgo: 100, slaHoursFromNow: 202, status: 'CREATED', allocation: 'NONE' },
  { id: '1108', customerIdx: 11, items: [['HUB-601', 6]], createdHoursAgo: 102, slaHoursFromNow: 206, status: 'CREATED', allocation: 'NONE' },
  { id: '1109', customerIdx: 12, items: [['MSE-602', 5]], createdHoursAgo: 104, slaHoursFromNow: 210, status: 'CREATED', allocation: 'NONE' },
  { id: '1110', customerIdx: 13, items: [['SPK-802', 3]], createdHoursAgo: 106, slaHoursFromNow: 214, status: 'CREATED', allocation: 'NONE' },
  { id: '1111', customerIdx: 14, items: [['CAM-902', 2]], createdHoursAgo: 108, slaHoursFromNow: 218, status: 'CREATED', allocation: 'NONE' },
  { id: '1112', customerIdx: 15, items: [['PRT-111', 3]], createdHoursAgo: 110, slaHoursFromNow: 222, status: 'CREATED', allocation: 'NONE' },
  { id: '1113', customerIdx: 16, items: [['DSK-130', 1]], createdHoursAgo: 112, slaHoursFromNow: 226, status: 'CREATED', allocation: 'NONE' },
  { id: '1114', customerIdx: 17, items: [['CHR-120', 4]], createdHoursAgo: 114, slaHoursFromNow: 230, status: 'CREATED', allocation: 'NONE' },
  { id: '1115', customerIdx: 18, items: [['BAG-402', 5]], createdHoursAgo: 116, slaHoursFromNow: 234, status: 'CREATED', allocation: 'NONE' },
  { id: '1116', customerIdx: 19, items: [['HDH-702', 4]], createdHoursAgo: 118, slaHoursFromNow: 238, status: 'CREATED', allocation: 'NONE' },
  { id: '1117', customerIdx: 0, items: [['KBD-502', 6]], createdHoursAgo: 120, slaHoursFromNow: 242, status: 'CREATED', allocation: 'NONE' },
  { id: '1118', customerIdx: 1, items: [['MON-401', 3]], createdHoursAgo: 122, slaHoursFromNow: 246, status: 'CREATED', allocation: 'NONE' },
  { id: '1119', customerIdx: 2, items: [['TBL-301', 5]], createdHoursAgo: 124, slaHoursFromNow: 250, status: 'CREATED', allocation: 'NONE' },
  { id: '1120', customerIdx: 3, items: [['PHN-101', 8]], createdHoursAgo: 126, slaHoursFromNow: 254, status: 'CREATED', allocation: 'NONE' },
  { id: '1121', customerIdx: 4, items: [['LAP-204', 2]], createdHoursAgo: 128, slaHoursFromNow: 258, status: 'CREATED', allocation: 'NONE' },
  { id: '1122', customerIdx: 5, items: [['LAP-210', 3]], createdHoursAgo: 130, slaHoursFromNow: 262, status: 'CREATED', allocation: 'NONE' },
  { id: '1123', customerIdx: 6, items: [['RTR-802', 2]], createdHoursAgo: 132, slaHoursFromNow: 266, status: 'CREATED', allocation: 'NONE' },
  { id: '1124', customerIdx: 7, items: [['STG-702', 3]], createdHoursAgo: 134, slaHoursFromNow: 270, status: 'CREATED', allocation: 'NONE' },
  { id: '1125', customerIdx: 8, items: [['WBT-501', 8]], createdHoursAgo: 136, slaHoursFromNow: 274, status: 'CREATED', allocation: 'NONE' },
  { id: '1126', customerIdx: 9, items: [['CBL-203', 10]], createdHoursAgo: 138, slaHoursFromNow: 278, status: 'CREATED', allocation: 'NONE' },
  { id: '1127', customerIdx: 10, items: [['PWR-302', 6]], createdHoursAgo: 140, slaHoursFromNow: 282, status: 'CREATED', allocation: 'NONE' },
  { id: '1128', customerIdx: 11, items: [['STN-602', 2]], createdHoursAgo: 142, slaHoursFromNow: 286, status: 'CREATED', allocation: 'NONE' },
  { id: '1129', customerIdx: 12, items: [['SCR-501', 25]], createdHoursAgo: 144, slaHoursFromNow: 290, status: 'CREATED', allocation: 'NONE' },
  { id: '1130', customerIdx: 13, items: [['FAN-301', 6]], createdHoursAgo: 146, slaHoursFromNow: 294, status: 'CREATED', allocation: 'NONE' },
  { id: '1131', customerIdx: 14, items: [['HUB-601', 4]], createdHoursAgo: 148, slaHoursFromNow: 298, status: 'CREATED', allocation: 'NONE' },
  { id: '1132', customerIdx: 15, items: [['MSE-601', 10]], createdHoursAgo: 150, slaHoursFromNow: 302, status: 'CREATED', allocation: 'NONE' },
  { id: '1133', customerIdx: 16, items: [['HDH-701', 4]], createdHoursAgo: 152, slaHoursFromNow: 306, status: 'CREATED', allocation: 'NONE' },
  { id: '1134', customerIdx: 17, items: [['SPK-801', 6]], createdHoursAgo: 154, slaHoursFromNow: 310, status: 'CREATED', allocation: 'NONE' },
  { id: '1135', customerIdx: 18, items: [['CAM-901', 2]], createdHoursAgo: 156, slaHoursFromNow: 314, status: 'CREATED', allocation: 'NONE' },
  { id: '1136', customerIdx: 19, items: [['PRT-110', 1]], createdHoursAgo: 158, slaHoursFromNow: 318, status: 'CREATED', allocation: 'NONE' },
  { id: '1137', customerIdx: 0, items: [['CHR-121', 3]], createdHoursAgo: 160, slaHoursFromNow: 322, status: 'CREATED', allocation: 'NONE' },
  { id: '1138', customerIdx: 1, items: [['DSK-131', 1]], createdHoursAgo: 162, slaHoursFromNow: 326, status: 'CREATED', allocation: 'NONE' },
  { id: '1139', customerIdx: 2, items: [['CBL-202', 15]], createdHoursAgo: 164, slaHoursFromNow: 330, status: 'CREATED', allocation: 'NONE' },
  { id: '1140', customerIdx: 3, items: [['PWR-301', 10]], createdHoursAgo: 166, slaHoursFromNow: 334, status: 'CREATED', allocation: 'NONE' },
  { id: '1141', customerIdx: 4, items: [['BAG-401', 4]], createdHoursAgo: 168, slaHoursFromNow: 338, status: 'CREATED', allocation: 'NONE' },
  { id: '1142', customerIdx: 5, items: [['LMP-201', 5]], createdHoursAgo: 170, slaHoursFromNow: 342, status: 'CREATED', allocation: 'NONE' },
  { id: '1143', customerIdx: 6, items: [['RTR-801', 3]], createdHoursAgo: 172, slaHoursFromNow: 346, status: 'CREATED', allocation: 'NONE' },
  { id: '1144', customerIdx: 7, items: [['STG-701', 6]], createdHoursAgo: 174, slaHoursFromNow: 350, status: 'CREATED', allocation: 'NONE' },
];

export const seedOrders: Order[] = orderSeeds.map((o) => {
  const [custName, custPrio] = customers[o.customerIdx];
  return {
    id: o.id,
    customer: custName,
    customerPriority: custPrio as Order['customerPriority'],
    items: o.items.map(([sku, qty]) => makeOrderItem(sku, qty)),
    createdAt: iso(hoursAgo(o.createdHoursAgo)),
    slaDeadline: iso(hoursFromNow(o.slaHoursFromNow)),
    status: o.status,
    priority: 'NORMAL',
    priorityScore: 0,
    riskLevel: 'LOW',
    riskReasons: [],
    allocationStatus: o.allocation,
    assignedWorkerId: o.workerId ?? null,
    notes: o.notes,
  };
});

// ─── Allocations ──────────────────────────────────────────
export const seedAllocations: Allocation[] = [
  { id: 'a1', orderId: '1038', productId: 'p1', required: 3, available: 3, reserved: 3, incoming: 0, shortage: 0, strategy: 'FULL', status: 'EXECUTED', recommendation: 'Full allocation — sufficient stock available.', reason: 'Stock covers full demand.', createdAt: iso(hoursAgo(24)) },
  { id: 'a2', orderId: '1039', productId: 'p4', required: 8, available: 8, reserved: 8, incoming: 0, shortage: 0, strategy: 'FULL', status: 'EXECUTED', recommendation: 'Full allocation.', reason: 'Stock covers full demand.', createdAt: iso(hoursAgo(26)) },
];

// ─── Picking Tasks ───────────────────────────────────────
export const seedPickingTasks: PickingTask[] = [
  {
    id: 'pk1', orderId: '1038', workerId: 'u3',
    items: [
      { productId: 'p1', productName: 'ProBook X1 Laptop', sku: 'LAP-204', location: loc('WH1', 'A', '12', '04', 'B', 12, 4), quantity: 3, status: 'PICKED' },
      { productId: 'p11', productName: 'Precision Mouse Pro', sku: 'MSE-601', location: loc('WH1', 'C', '05', '04', 'A', 5, 4), quantity: 5, status: 'PENDING' },
    ],
    route: [loc('WH1', 'A', '12', '04', 'B', 12, 4), loc('WH1', 'C', '05', '04', 'A', 5, 4)],
    estimatedDistance: 48, estimatedTimeMin: 12, stops: 2, zoneCongestion: 35, status: 'IN_PROGRESS',
    startedAt: iso(hoursAgo(1)), efficiencyScore: 82,
  },
];

// ─── Packing Tasks ───────────────────────────────────────
export const seedPackingTasks: PackingTask[] = [
  {
    id: 'pa1', orderId: '1039', workerId: 'u4',
    items: [makeOrderItem('PHN-102', 8, 8), makeOrderItem('SCR-501', 20, 20)],
    packageType: 'STANDARD', station: 'PACK-2',
    checklist: [
      { label: 'Correct SKU verified', done: true },
      { label: 'Correct quantity verified', done: true },
      { label: 'Packaging condition checked', done: true },
      { label: 'Label verified', done: false },
      { label: 'Accessories included', done: false },
    ],
    status: 'IN_PROGRESS', startedAt: iso(hoursAgo(1)),
  },
];

// ─── Quality Checks ──────────────────────────────────────
export const seedQualityChecks: QualityCheck[] = [
  { id: 'qc1', orderId: '1040', inspectorId: 'u4', status: 'PENDING', failures: [] },
];

// ─── Exceptions ───────────────────────────────────────────
export const seedExceptions: Exception[] = [
  { id: 'e1', type: 'STOCK_SHORTAGE', severity: 'CRITICAL', orderId: '1045', productId: 'p1', title: 'Stock Shortage — Order #1045', description: 'Order #1045 requires 10 units of LAP-204 but only 7 are available. 3 units short.', recommendation: 'Allocate 7 available units immediately. Reserve 3 from incoming stock (ETA 48h). Hold lower-priority Order #1052.', status: 'DETECTED', createdAt: iso(hoursAgo(2)) },
  { id: 'e2', type: 'STOCK_SHORTAGE', severity: 'CRITICAL', orderId: '1047', productId: 'p5', title: 'Complete Stockout — Order #1047', description: 'Order #1047 requires 15 units of TBL-301 but stock is 0. 20 units incoming (ETA 72h).', recommendation: 'Wait for incoming stock or source from alternate warehouse. Notify customer of delay.', status: 'DETECTED', createdAt: iso(hoursAgo(5)) },
  { id: 'e3', type: 'STOCK_SHORTAGE', severity: 'WARNING', orderId: '1046', productId: 'p3', title: 'Partial Stock — Order #1046', description: 'Order #1046 requires 20 units of PHN-101 but only 12 available. 10 incoming (ETA 24h).', recommendation: 'Allocate 12 now, reserve 8 from incoming. SLA allows 24h window.', status: 'DETECTED', createdAt: iso(hoursAgo(3)) },
  { id: 'e4', type: 'STOCK_SHORTAGE', severity: 'CRITICAL', orderId: '1048', productId: 'p7', title: 'Stock Conflict — Orders #1048 & #1049', description: 'Two orders compete for MON-401. Combined demand 14, available 5. VIP Order #1048 has higher priority.', recommendation: 'Allocate 5 to VIP Order #1048. Hold Order #1049 until replenishment.', status: 'DETECTED', createdAt: iso(hoursAgo(4)) },
  { id: 'e5', type: 'SLA_RISK', severity: 'CRITICAL', orderId: '1050', productId: 'p19', title: 'SLA Risk — Order #1050', description: 'Order #1050 SLA deadline in 4 hours. Items not yet allocated. Contains CAM-902 with only 4 available (need 4).', recommendation: 'Immediate allocation and expedited picking. Assign best available worker.', status: 'DETECTED', createdAt: iso(hoursAgo(1)) },
  { id: 'e6', type: 'DAMAGED_ITEM', severity: 'WARNING', productId: 'p1', title: 'Damaged Inventory — LAP-204', description: '5 units of LAP-204 damaged (water damage). Removed from allocatable stock.', recommendation: 'Quarantine damaged stock. File supplier claim. Accelerate replenishment.', status: 'ANALYZED', createdAt: iso(daysAgo(5)) },
  { id: 'e7', type: 'DAMAGED_ITEM', severity: 'WARNING', productId: 'p7', title: 'Damaged Monitor — MON-401', description: '1 unit of MON-401 cracked during handling.', recommendation: 'Quarantine. Update inventory. Replacement needed for pending orders.', status: 'ANALYZED', createdAt: iso(daysAgo(1)) },
  { id: 'e8', type: 'DAMAGED_ITEM', severity: 'WARNING', productId: 'p19', title: 'Damaged Drone — CAM-902', description: '1 unit of CAM-902 propeller damage during picking.', recommendation: 'Quarantine. Inspect remaining stock. File damage report.', status: 'ANALYZED', createdAt: iso(hoursAgo(6)) },
  { id: 'e9', type: 'PICKING_DELAY', severity: 'WARNING', orderId: '1038', title: 'Picking Delay — Zone A', description: 'Order #1038 picking started 1 hour ago, 1 of 2 items picked. Zone A congestion at 65%.', recommendation: 'Assign second worker to assist. Re-sequence remaining pick to avoid congestion.', status: 'DETECTED', createdAt: iso(hoursAgo(1)) },
  { id: 'e10', type: 'INVENTORY_MISMATCH', severity: 'WARNING', productId: 'p10', title: 'Inventory Mismatch — KBD-502', description: 'System shows 15 available KBD-502 but physical count shows 13. 2 units unaccounted.', recommendation: 'Freeze allocations for KBD-502. Initiate physical count. Reconcile discrepancy.', status: 'DETECTED', createdAt: iso(hoursAgo(8)) },
  { id: 'e11', type: 'DISPATCH_DELAY', severity: 'WARNING', orderId: '1042', title: 'Dispatch Delay — Order #1042', description: 'Order #1042 marked dispatched but carrier has not scanned pickup. 2 hours overdue.', recommendation: 'Contact carrier. Verify pickup. Update dispatch status.', status: 'DETECTED', createdAt: iso(hoursAgo(2)) },
  { id: 'e12', type: 'STOCK_SHORTAGE', severity: 'WARNING', orderId: '1051', productId: 'p10', title: 'Low Stock — KBD-502', description: 'Order #1051 needs 12 KBD-502. 15 available but 2 unaccounted (mismatch). Effective available 13.', recommendation: 'Resolve inventory mismatch first. Then allocate 12.', status: 'DETECTED', createdAt: iso(hoursAgo(7)) },
  { id: 'e13', type: 'SLA_RISK', severity: 'WARNING', orderId: '1057', productId: 'p20', title: 'SLA Risk — Order #1057', description: 'Order #1057 VIP customer, SLA in 6 hours. Not yet allocated.', recommendation: 'Prioritize allocation. Expedite picking and packing.', status: 'DETECTED', createdAt: iso(hoursAgo(2)) },
  { id: 'e14', type: 'PACKING_ERROR', severity: 'INFO', orderId: '1039', title: 'Packing Incomplete — Order #1039', description: 'Order #1039 packing in progress. Label and accessories checklist items pending.', recommendation: 'Complete remaining checklist items before QC.', status: 'DETECTED', createdAt: iso(hoursAgo(1)) },
  { id: 'e15', type: 'INVENTORY_MISMATCH', severity: 'WARNING', productId: 'p22', title: 'Inventory Mismatch — CHR-120', description: 'System shows 12 available CHR-120 but physical count shows 11. 1 unit unaccounted.', recommendation: 'Investigate. Reconcile inventory.', status: 'DETECTED', createdAt: iso(hoursAgo(12)) },
];

// ─── Replenishment Requests ──────────────────────────────
export const seedReplenishments: ReplenishmentRequest[] = [
  { id: 'r1', productId: 'p1', sku: 'LAP-204', productName: 'ProBook X1 Laptop', available: 7, pendingDemand: 15, incoming: 5, safetyStock: 15, recommendedQty: 30, risk: 'CRITICAL', status: 'PENDING', createdAt: iso(hoursAgo(2)) },
  { id: 'r2', productId: 'p5', sku: 'TBL-301', productName: 'TabSlate 11" Tablet', available: 0, pendingDemand: 20, incoming: 20, safetyStock: 10, recommendedQty: 40, risk: 'CRITICAL', status: 'PENDING', createdAt: iso(hoursAgo(5)) },
  { id: 'r3', productId: 'p7', sku: 'MON-401', productName: 'ViewMax 27" Monitor', available: 5, pendingDemand: 14, incoming: 15, safetyStock: 12, recommendedQty: 25, risk: 'CRITICAL', status: 'PENDING', createdAt: iso(hoursAgo(4)) },
  { id: 'r4', productId: 'p3', sku: 'PHN-101', productName: 'Galaxy Pulse Phone', available: 12, pendingDemand: 20, incoming: 10, safetyStock: 15, recommendedQty: 25, risk: 'HIGH', status: 'PENDING', createdAt: iso(hoursAgo(3)) },
  { id: 'r5', productId: 'p19', sku: 'CAM-902', productName: 'DroneCam Flyer', available: 4, pendingDemand: 6, incoming: 12, safetyStock: 8, recommendedQty: 15, risk: 'HIGH', status: 'PENDING', createdAt: iso(hoursAgo(1)) },
  { id: 'r6', productId: 'p10', sku: 'KBD-502', productName: 'ErgoSplit Keyboard', available: 15, pendingDemand: 12, incoming: 25, safetyStock: 20, recommendedQty: 20, risk: 'MEDIUM', status: 'PENDING', createdAt: iso(hoursAgo(7)) },
];

// ─── Dispatches ──────────────────────────────────────────
export const seedDispatches: Dispatch[] = [
  { id: 'd1', orderId: '1042', carrier: 'FedEx Express', trackingNumber: 'FX-7782394', status: 'DELAYED', dispatchedAt: iso(hoursAgo(4)), estimatedDelivery: iso(daysFromNow(2)) },
  { id: 'd2', orderId: '1043', carrier: 'UPS Ground', trackingNumber: 'UPS-9921034', status: 'DELIVERED', dispatchedAt: iso(daysAgo(2)), estimatedDelivery: iso(daysAgo(1)) },
  { id: 'd3', orderId: '1041', carrier: 'DHL Express', trackingNumber: 'DHL-5512093', status: 'SCHEDULED', estimatedDelivery: iso(daysFromNow(1)) },
];

// ─── Notifications ───────────────────────────────────────
export const seedNotifications: Notification[] = [
  { id: 'n1', severity: 'CRITICAL', title: 'Stock Shortage Detected', message: 'Order #1045 requires 10 LAP-204 units, only 7 available.', timestamp: iso(hoursAgo(2)), read: false, link: 'orders' },
  { id: 'n2', severity: 'CRITICAL', title: 'SLA Risk Alert', message: 'Order #1050 SLA deadline in 4 hours. Not yet allocated.', timestamp: iso(hoursAgo(1)), read: false, link: 'orders' },
  { id: 'n3', severity: 'WARNING', title: 'Replenishment Needed', message: 'LAP-204 below safety stock. 30 units recommended.', timestamp: iso(hoursAgo(2)), read: false, link: 'inventory' },
  { id: 'n4', severity: 'WARNING', title: 'Complete Stockout', message: 'TBL-301 out of stock. 20 units incoming (ETA 72h).', timestamp: iso(hoursAgo(5)), read: false, link: 'inventory' },
  { id: 'n5', severity: 'WARNING', title: 'Picking Delay', message: 'Order #1038 picking delayed in Zone A.', timestamp: iso(hoursAgo(1)), read: true, link: 'picking' },
  { id: 'n6', severity: 'WARNING', title: 'Dispatch Delay', message: 'Order #1042 carrier pickup overdue by 2 hours.', timestamp: iso(hoursAgo(2)), read: false, link: 'dispatch' },
  { id: 'n7', severity: 'INFO', title: 'Packing In Progress', message: 'Order #1039 packing at Station 2 — 60% complete.', timestamp: iso(hoursAgo(1)), read: true, link: 'packing' },
  { id: 'n8', severity: 'SUCCESS', title: 'Order Completed', message: 'Order #1043 dispatched and delivered successfully.', timestamp: iso(daysAgo(1)), read: true },
];

// ─── Decisions ───────────────────────────────────────────
export const seedDecisions: Decision[] = [
  {
    id: 'dec1', type: 'ALLOCATION', severity: 'CRITICAL',
    title: 'Partial Allocation — Order #1045',
    description: 'Order #1045 (CRITICAL, VIP) requires 10 LAP-204 units. 7 available, 5 incoming. Lower-priority Order #1052 competes for same SKU.',
    recommendation: 'Allocate 7 available units to Order #1045 now. Reserve 3 from incoming stock. Hold Order #1052 until next inbound shipment.',
    reason: 'Order #1045 has higher SLA risk (6h deadline) and VIP customer priority. Order #1052 has 48h SLA window and standard priority.',
    expectedResult: 'Order #1045 proceeds to picking with partial allocation. SLA breach probability reduced from 95% to 15%. Order #1052 held with customer notification.',
    status: 'PENDING', relatedOrderId: '1045', relatedProductId: 'p1', createdAt: iso(hoursAgo(2)),
  },
  {
    id: 'dec2', type: 'REPLENISHMENT', severity: 'WARNING',
    title: 'Replenishment Required — LAP-204',
    description: 'LAP-204 available stock (7) is below safety stock (15). Pending demand 15 units. Only 5 incoming.',
    recommendation: 'Create replenishment request for 30 units to restore buffer and meet demand.',
    reason: 'Available + incoming (12) < safety stock + pending demand (30). Without replenishment, 3+ orders will face stockout.',
    expectedResult: 'Replenishment order placed. Stock restored within 48h. Future orders unaffected.',
    status: 'PENDING', relatedProductId: 'p1', createdAt: iso(hoursAgo(2)),
  },
  {
    id: 'dec3', type: 'BOTTLENECK', severity: 'WARNING',
    title: 'Picking Bottleneck — Zone B',
    description: 'Zone B picking workload at 92% (normal 70%). 17 high-priority orders waiting. Zone C at 45%.',
    recommendation: 'Reassign 2 available workers from Zone C to Zone B. Re-sequence picks to reduce travel distance.',
    reason: 'Zone B has 3 workers handling 17 orders. Zone C has 2 workers handling only 4 orders. Load imbalance causing picking delays.',
    expectedResult: 'Zone B workload reduced to ~68%. Picking throughput increased 40%. SLA risk for pending orders reduced.',
    status: 'PENDING', createdAt: iso(hoursAgo(1)),
  },
  {
    id: 'dec4', type: 'EXCEPTION', severity: 'CRITICAL',
    title: 'Stock Conflict — Orders #1048 & #1049',
    description: 'Two orders compete for MON-401 (5 available, 14 combined demand). VIP Order #1048 needs 8, Order #1049 needs 6.',
    recommendation: 'Allocate all 5 available to VIP Order #1048. Hold Order #1049. Create replenishment request for 15 units.',
    reason: 'VIP customer priority + shorter SLA window for Order #1048.',
    expectedResult: 'VIP customer order partially fulfilled. Standard order held with notification.',
    status: 'PENDING', relatedOrderId: '1048', relatedProductId: 'p7', createdAt: iso(hoursAgo(4)),
  },
  {
    id: 'dec5', type: 'EXCEPTION', severity: 'CRITICAL',
    title: 'Complete Stockout — Order #1047',
    description: 'Order #1047 requires 15 TBL-301 units. Stock is 0. 20 incoming (ETA 72h).',
    recommendation: 'Notify customer of 72h delay. Reserve 15 from incoming. Offer alternative product (TBL-302) if customer accepts.',
    reason: 'No stock available. Incoming stock covers demand but exceeds SLA window.',
    expectedResult: 'Customer informed. Order queued for incoming stock. Alternative offered to maintain satisfaction.',
    status: 'PENDING', relatedOrderId: '1047', relatedProductId: 'p5', createdAt: iso(hoursAgo(5)),
  },
];

// ─── Audit Logs ───────────────────────────────────────────
export const seedAuditLogs: AuditLog[] = [
  { id: 'al1', action: 'ALLOCATION_APPROVED', entity: 'Allocation', entityId: 'a1', user: 'Sarah Chen', previousState: 'PENDING', newState: 'APPROVED', reason: 'Full stock available for Order #1038', timestamp: iso(hoursAgo(24)) },
  { id: 'al2', action: 'ALLOCATION_EXECUTED', entity: 'Allocation', entityId: 'a1', user: 'Sarah Chen', previousState: 'APPROVED', newState: 'EXECUTED', reason: 'Stock reserved and order moved to picking', timestamp: iso(hoursAgo(24)) },
  { id: 'al3', action: 'PICKING_STARTED', entity: 'PickingTask', entityId: 'pk1', user: 'Diego Torres', previousState: 'PENDING', newState: 'IN_PROGRESS', reason: 'Worker assigned to Zone A pick route', timestamp: iso(hoursAgo(1)) },
  { id: 'al4', action: 'INVENTORY_DAMAGE', entity: 'Inventory', entityId: 'inv1', user: 'Raj Patel', previousState: '15 available', newState: '7 available, 5 damaged', reason: 'Water damage discovered during QC', timestamp: iso(daysAgo(5)) },
  { id: 'al5', action: 'PACKING_STARTED', entity: 'PackingTask', entityId: 'pa1', user: 'Aisha Khan', previousState: 'PENDING', newState: 'IN_PROGRESS', reason: 'Order #1039 moved to packing station 2', timestamp: iso(hoursAgo(1)) },
];

// ─── Worker Assignments ──────────────────────────────────
export const seedWorkerAssignments: WorkerAssignment[] = [
  { workerId: 'u3', workerName: 'Diego Torres', zone: 'A', taskCount: 3, utilization: 78, status: 'BUSY' },
  { workerId: 'u4', workerName: 'Aisha Khan', zone: 'B', taskCount: 5, utilization: 92, status: 'BUSY' },
  { workerId: 'u5', workerName: 'Tom Walker', zone: 'B', taskCount: 4, utilization: 85, status: 'BUSY' },
  { workerId: 'u6', workerName: 'Lena Park', zone: 'C', taskCount: 2, utilization: 45, status: 'AVAILABLE' },
];
