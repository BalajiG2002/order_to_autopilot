import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  UserProfile,
  Supplier,
  PurchaseOrder,
  EmailMessage,
  OrderDocument,
  OrderOutcome,
  StepLog,
  ProcurementPolicy,
  ProcurementRequest,
} from '../src/types/index.ts';
import { DEFAULT_POLICY } from './rules/policy.ts';
import { calculateSupplierScore } from './rules/scoring.ts';

export interface DatabaseState {
  users: UserProfile[];
  suppliers: Supplier[];
  requests: ProcurementRequest[];
  orders: PurchaseOrder[];
  emails: EmailMessage[];
  documents: OrderDocument[];
  outcomes: OrderOutcome[];
  stepLogs: StepLog[];
  policy: ProcurementPolicy;
}

// Vercel's filesystem is read-only except for the OS temp dir.
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'order-autopilot-data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-ravi',
    name: 'Ravi Kumar',
    email: 'ravi@acme-corp.com',
    role: 'HANDLER',
    title: 'Operations & Logistics Handler',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    department: 'Central Fulfillment Hub',
  },
  {
    id: 'user-meena',
    name: 'Meena Sharma',
    email: 'meena@acme-corp.com',
    role: 'MANAGER',
    title: 'Senior Procurement Manager',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    department: 'Procurement Governance & Finance',
  },
  {
    id: 'user-sunrise',
    name: 'Sunrise Trading Co.',
    email: 'orders@sunrisetrading.com',
    role: 'SUPPLIER',
    title: 'Authorized Vendor Representative',
    avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&auto=format&fit=crop&q=80',
    supplierId: 'sup-1',
  },
  {
    id: 'user-apex',
    name: 'Apex Global Industries',
    email: 'dispatch@apexglobal.com',
    role: 'SUPPLIER',
    title: 'Industrial Equipment Vendor',
    avatar: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80',
    supplierId: 'sup-2',
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Sunrise Trading Co.',
    email: 'orders@sunrisetrading.com',
    score: 8.8,
    on_time_rate: 0.90,
    damage_rate: 0.05,
    category: 'Food & Agriculture',
    active_pos: 2,
    total_orders: 45,
    contact_person: 'Anand Patel',
    phone: '+1 (555) 234-8901',
    address: '104 Grain Export Way, Port Logistics Zone',
    avg_lead_days: 3.5,
  },
  {
    id: 'sup-2',
    name: 'Apex Global Industries',
    email: 'dispatch@apexglobal.com',
    score: 9.4,
    on_time_rate: 0.96,
    damage_rate: 0.02,
    category: 'Industrial Equipment',
    active_pos: 1,
    total_orders: 38,
    contact_person: 'Elena Rostova',
    phone: '+1 (555) 876-5432',
    address: '450 Industrial Parkway, North Gate',
    avg_lead_days: 5.0,
  },
  {
    id: 'sup-3',
    name: 'Nova Supplies Ltd.',
    email: 'fulfillment@novasupplies.com',
    score: 8.5,
    on_time_rate: 0.86,
    damage_rate: 0.04,
    category: 'Food & Agriculture',
    active_pos: 1,
    total_orders: 29,
    contact_person: 'David Chen',
    phone: '+1 (555) 345-6789',
    address: '88 Commerce Blvd, Suite 200',
    avg_lead_days: 4.0,
  },
  {
    id: 'sup-4',
    name: 'Crest Logistics & Materials',
    email: 'sales@crestlogistics.com',
    score: 7.9,
    on_time_rate: 0.82,
    damage_rate: 0.07,
    category: 'General Supplies',
    active_pos: 1,
    total_orders: 22,
    contact_person: 'Sarah Jenkins',
    phone: '+1 (555) 456-7890',
    address: '12 Freight Depot Ave',
    avg_lead_days: 4.5,
  },
  {
    id: 'sup-5',
    name: 'Zenith Agro Commodities',
    email: 'orders@zenithagro.com',
    score: 6.8,
    on_time_rate: 0.70,
    damage_rate: 0.14,
    category: 'Food & Agriculture',
    active_pos: 0,
    total_orders: 16,
    contact_person: 'Vikram Sethi',
    phone: '+1 (555) 987-6543',
    address: '77 Harvest Road',
    avg_lead_days: 6.2,
  },
];

export function getInitialSeedData(): DatabaseState {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();

  // Orders:
  // 1. PO-2026-081: EXCEPTION QUEUE (High Value $12,000 for Industrial Storage Racks) - needs Meena's review!
  // 2. PO-2026-085: STUCK / IDLE ORDER (dispatched 30h ago to Sunrise, chase_count 0, ready for chaser!)
  // 3. PO-2026-077: SHIPPED ORDER (Sunrise shipped 500 bags of wheat, tracking available, ready for Ravi to confirm delivery!)
  // 4. PO-2026-042: CLOSED ORDER (500 bags of rice by Sunrise, receipt + invoice verified, flawless execution)
  // 5. PO-2026-088: CONFIRMED ORDER (Nova Supplies confirmed 200 boxes of printer paper, promised date in 2 days)

  const orders: PurchaseOrder[] = [
    {
      id: 'po-081',
      po_number: 'PO-2026-081',
      request_id: 'req-081',
      supplier_id: 'sup-2',
      supplier_name: 'Apex Global Industries',
      supplier_email: 'dispatch@apexglobal.com',
      step: 'REQUESTED',
      item: 'Industrial Heavy-Duty Pallet Racks (12-bay)',
      qty: 120,
      unit: 'bays',
      unit_price: 100,
      total_value: 12000,
      needed_by: '2026-10-30',
      created_at: hoursAgo(4),
      updated_at: hoursAgo(4),
      flags: ['VALUE_THRESHOLD_EXCEEDED'],
      approval_status: 'PENDING_MANAGER',
      handler_name: 'Ravi Kumar',
      handler_email: 'ravi@acme-corp.com',
      urgency: 'HIGH',
      category: 'Industrial Equipment',
      chase_count: 0,
      unread_by: ['user-meena'],
    },
    {
      id: 'po-085',
      po_number: 'PO-2026-085',
      request_id: 'req-085',
      supplier_id: 'sup-1',
      supplier_name: 'Sunrise Trading Co.',
      supplier_email: 'orders@sunrisetrading.com',
      step: 'ORDERED',
      item: 'Premium Golden Sella Basmati Rice',
      qty: 250,
      unit: 'bags',
      unit_price: 16,
      total_value: 4000,
      needed_by: '2026-10-22',
      created_at: hoursAgo(32),
      updated_at: hoursAgo(32),
      flags: ['IDLE_RESPONSE_PENDING'],
      approval_status: 'AUTO_APPROVED',
      handler_name: 'Ravi Kumar',
      handler_email: 'ravi@acme-corp.com',
      urgency: 'MEDIUM',
      category: 'Food & Agriculture',
      chase_count: 0,
      last_chased_at: undefined,
      unread_by: ['user-sunrise'],
    },
    {
      id: 'po-077',
      po_number: 'PO-2026-077',
      request_id: 'req-077',
      supplier_id: 'sup-1',
      supplier_name: 'Sunrise Trading Co.',
      supplier_email: 'orders@sunrisetrading.com',
      step: 'SHIPPED',
      item: 'Milled Whole Wheat Grain (50kg)',
      qty: 200,
      unit: 'bags',
      unit_price: 18,
      total_value: 3600,
      needed_by: '2026-10-18',
      promised_date: '2026-10-18',
      tracking_number: 'TRK-SUN-99214',
      carrier: 'BlueDart Logistics',
      confirmed_at: daysAgo(2),
      shipped_at: hoursAgo(12),
      created_at: daysAgo(3),
      updated_at: hoursAgo(12),
      flags: [],
      approval_status: 'AUTO_APPROVED',
      handler_name: 'Ravi Kumar',
      handler_email: 'ravi@acme-corp.com',
      urgency: 'HIGH',
      category: 'Food & Agriculture',
      chase_count: 0,
      unread_by: ['user-ravi'],
    },
    {
      id: 'po-088',
      po_number: 'PO-2026-088',
      request_id: 'req-088',
      supplier_id: 'sup-3',
      supplier_name: 'Nova Supplies Ltd.',
      supplier_email: 'fulfillment@novasupplies.com',
      step: 'CONFIRMED',
      item: 'Commercial Multi-Purpose Office Paper (5-ream box)',
      qty: 150,
      unit: 'boxes',
      unit_price: 24,
      total_value: 3600,
      needed_by: '2026-10-24',
      promised_date: '2026-10-22',
      confirmed_at: hoursAgo(6),
      created_at: daysAgo(1),
      updated_at: hoursAgo(6),
      flags: [],
      approval_status: 'AUTO_APPROVED',
      handler_name: 'Ravi Kumar',
      handler_email: 'ravi@acme-corp.com',
      urgency: 'LOW',
      category: 'General Supplies',
      chase_count: 0,
      unread_by: [],
    },
    {
      id: 'po-042',
      po_number: 'PO-2026-042',
      request_id: 'req-042',
      supplier_id: 'sup-1',
      supplier_name: 'Sunrise Trading Co.',
      supplier_email: 'orders@sunrisetrading.com',
      step: 'CLOSED',
      item: 'Traditional Basmati Rice (Grade 1)',
      qty: 300,
      unit: 'bags',
      unit_price: 15,
      total_value: 4500,
      needed_by: '2026-10-10',
      promised_date: '2026-10-10',
      tracking_number: 'TRK-SUN-88410',
      carrier: 'FedEx Freight',
      confirmed_at: daysAgo(10),
      shipped_at: daysAgo(8),
      received_at: daysAgo(6),
      closed_at: daysAgo(5),
      created_at: daysAgo(12),
      updated_at: daysAgo(5),
      flags: [],
      approval_status: 'AUTO_APPROVED',
      handler_name: 'Ravi Kumar',
      handler_email: 'ravi@acme-corp.com',
      urgency: 'MEDIUM',
      category: 'Food & Agriculture',
      chase_count: 0,
      unread_by: [],
    },
  ];

  const requests: ProcurementRequest[] = orders.map((o) => ({
    id: o.request_id,
    po_id: o.id,
    handler: o.handler_name,
    handler_email: o.handler_email,
    item: o.item,
    qty: o.qty,
    unit: o.unit,
    estimated_unit_price: o.unit_price,
    total_value: o.total_value,
    needed_by: o.needed_by,
    raw_text: `Need ${o.qty} ${o.unit} of ${o.item} needed by ${o.needed_by}`,
    status: o.approval_status === 'PENDING_MANAGER' ? 'PENDING_APPROVAL' : 'APPROVED',
    urgency: o.urgency,
    category: o.category,
    created_at: o.created_at,
  }));

  const emails: EmailMessage[] = [
    // Thread for PO-081 (Manager Exception)
    {
      id: 'em-081-1',
      po_id: 'po-081',
      thread_id: 'th-po-081',
      direction: 'OUTBOUND',
      from_name: 'Ravi Kumar',
      from_email: 'ravi@acme-corp.com',
      to_name: 'Meena Sharma',
      to_email: 'meena@acme-corp.com',
      subject: '[APPROVAL REQ] PO-2026-081: Industrial Heavy-Duty Pallet Racks ($12,000)',
      body: `Hi Meena,

I submitted a high-priority requisition for warehouse expansion:
- Item: Industrial Heavy-Duty Pallet Racks (12-bay)
- Qty: 120 bays @ $100/bay
- Total: $12,000 (Exceeds auto-approval limit of $5,000)
- Recommended Supplier: Apex Global Industries (Score: 9.4/10)
- Needed By: 2026-10-30

System flagged this for your manual sign-off. Please review and authorize dispatch.

Regards,
Ravi Kumar`,
      status: 'SENT',
      timestamp: hoursAgo(4),
      email_type: 'INTERNAL_REQUEST',
      read_by: ['user-ravi'],
    },

    // Thread for PO-085 (Stuck PO ready for Chaser)
    {
      id: 'em-085-1',
      po_id: 'po-085',
      thread_id: 'th-po-085',
      direction: 'OUTBOUND',
      from_name: 'Acme Procurement Autopilot',
      from_email: 'procurement-bot@acme-corp.com',
      to_name: 'Sunrise Trading Co.',
      to_email: 'orders@sunrisetrading.com',
      subject: 'Official Purchase Order: PO-2026-085 - Premium Golden Sella Basmati Rice (250 bags)',
      body: `Dear Sunrise Trading Team,

Please find attached official Purchase Order PO-2026-085 from Acme Corporation.

ORDER DETAILS:
- PO Number: PO-2026-085
- Item: Premium Golden Sella Basmati Rice
- Quantity: 250 bags (50kg)
- Rate: $16.00/bag
- Total Value: $4,000.00
- Delivery Deadline: 2026-10-22
- Ship To: Acme Central Logistics Hub, Dock 3

POLICY NOTE:
This order was autonomously approved based on your high reliability rating (8.8/10).
Please confirm your acceptance and target shipping schedule.

Best regards,
Acme Procurement Autopilot
On behalf of Ravi Kumar`,
      status: 'SENT',
      timestamp: hoursAgo(32),
      email_type: 'PO_DISPATCH',
      read_by: ['user-ravi', 'user-meena'],
    },

    // Thread for PO-077 (Shipped, pending delivery verification)
    {
      id: 'em-077-1',
      po_id: 'po-077',
      thread_id: 'th-po-077',
      direction: 'OUTBOUND',
      from_name: 'Acme Procurement Autopilot',
      from_email: 'procurement-bot@acme-corp.com',
      to_name: 'Sunrise Trading Co.',
      to_email: 'orders@sunrisetrading.com',
      subject: 'Official Purchase Order: PO-2026-077 - Milled Whole Wheat Grain',
      body: `Dear Sunrise Trading,
PO-2026-077 for 200 bags of Milled Whole Wheat Grain ($3,600) has been generated. Please confirm dispatch.`,
      status: 'SENT',
      timestamp: daysAgo(3),
      email_type: 'PO_DISPATCH',
      read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
    },
    {
      id: 'em-077-2',
      po_id: 'po-077',
      thread_id: 'th-po-077',
      direction: 'INBOUND',
      from_name: 'Sunrise Trading Co.',
      from_email: 'orders@sunrisetrading.com',
      to_name: 'Acme Procurement Autopilot',
      to_email: 'procurement-bot@acme-corp.com',
      subject: 'Re: Official Purchase Order: PO-2026-077 - Milled Whole Wheat Grain',
      body: `Hello Acme Procurement,

We confirm acceptance of PO-2026-077. Consignment of 200 bags is prepared and will ship via BlueDart Logistics.`,
      status: 'DELIVERED',
      timestamp: daysAgo(2),
      email_type: 'SUPPLIER_CONFIRMATION',
      read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
    },
    {
      id: 'em-077-3',
      po_id: 'po-077',
      thread_id: 'th-po-077',
      direction: 'INBOUND',
      from_name: 'Sunrise Trading Co.',
      from_email: 'orders@sunrisetrading.com',
      to_name: 'Ravi Kumar',
      to_email: 'ravi@acme-corp.com',
      subject: 'DISPATCH NOTICE: PO-2026-077 Shipped (Tracking #TRK-SUN-99214)',
      body: `Dear Ravi,

Your order PO-2026-077 has departed our central warehouse.
Carrier: BlueDart Logistics
Consignment Tracking: TRK-SUN-99214
Expected Delivery: Tomorrow by 14:00 hrs.

Please inspect upon receipt and log arrival confirmation. Commercial invoice is attached to consignment paperwork.

Thank you,
Anand Patel
Sunrise Trading Co.`,
      status: 'DELIVERED',
      timestamp: hoursAgo(12),
      email_type: 'SHIPPING_NOTICE',
      read_by: ['user-sunrise'],
    },

    // Thread for PO-042 (Completed & Closed)
    {
      id: 'em-042-1',
      po_id: 'po-042',
      thread_id: 'th-po-042',
      direction: 'OUTBOUND',
      from_name: 'Acme Procurement Autopilot',
      from_email: 'procurement-bot@acme-corp.com',
      to_name: 'Sunrise Trading Co.',
      to_email: 'orders@sunrisetrading.com',
      subject: 'Official Purchase Order: PO-2026-042 - Traditional Basmati Rice (300 bags)',
      body: `Purchase order PO-2026-042 for 300 bags Basmati Rice at $15/bag. Total: $4,500.`,
      status: 'SENT',
      timestamp: daysAgo(12),
      email_type: 'PO_DISPATCH',
      read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
    },
    {
      id: 'em-042-2',
      po_id: 'po-042',
      thread_id: 'th-po-042',
      direction: 'INBOUND',
      from_name: 'Sunrise Trading Co.',
      from_email: 'orders@sunrisetrading.com',
      to_name: 'Acme Procurement',
      to_email: 'procurement-bot@acme-corp.com',
      subject: 'Re: Official Purchase Order: PO-2026-042 - Shipped & Invoiced',
      body: `Order PO-2026-042 delivered via FedEx Freight. Attached Commercial Invoice #INV-SUN-4412 for $4,500.`,
      status: 'DELIVERED',
      timestamp: daysAgo(6),
      email_type: 'INVOICE_SUBMISSION',
      read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
    },
    {
      id: 'em-042-3',
      po_id: 'po-042',
      thread_id: 'th-po-042',
      direction: 'OUTBOUND',
      from_name: 'Ravi Kumar',
      from_email: 'ravi@acme-corp.com',
      to_name: 'Procurement Autopilot',
      to_email: 'procurement-bot@acme-corp.com',
      subject: 'Delivery Receipt Verified: PO-2026-042 - 100% Perfect Delivery',
      body: `Goods received in excellent condition: 300 bags received, 0 damaged, 0 short. Receipt signed and uploaded.`,
      status: 'SENT',
      timestamp: daysAgo(6),
      email_type: 'DELIVERY_RECEIPT',
      read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
    },
    {
      id: 'em-042-4',
      po_id: 'po-042',
      thread_id: 'th-po-042',
      direction: 'OUTBOUND',
      from_name: 'Acme Procurement Autopilot',
      from_email: 'procurement-bot@acme-corp.com',
      to_name: 'Sunrise Trading Co.',
      to_email: 'orders@sunrisetrading.com',
      subject: '[CLOSED] PO-2026-042 Fulfillment Reconciled & Closed',
      body: `Both Delivery Receipt and Commercial Invoice are verified. Order PO-2026-042 is successfully CLOSED. Payment scheduled according to Net 30 terms. Supplier reliability score updated.`,
      status: 'SENT',
      timestamp: daysAgo(5),
      email_type: 'ORDER_CLOSED',
      read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
    },
  ];

  const documents: OrderDocument[] = [
    {
      id: 'doc-042-1',
      po_id: 'po-042',
      type: 'RECEIPT',
      filename: 'Signed_Goods_Receipt_PO-042.pdf',
      received_at: daysAgo(6),
      status: 'VERIFIED',
      notes: 'Dock 4 physical count verified by Ravi Kumar',
    },
    {
      id: 'doc-042-2',
      po_id: 'po-042',
      type: 'INVOICE',
      filename: 'Invoice_INV-SUN-4412.pdf',
      received_at: daysAgo(6),
      status: 'VERIFIED',
      amount: 4500,
      notes: 'Matches PO total exactly ($4,500.00)',
    },
  ];

  const outcomes: OrderOutcome[] = [
    {
      id: 'out-042',
      po_id: 'po-042',
      supplier_id: 'sup-1',
      result: 'PERFECT',
      damaged_qty: 0,
      short_qty: 0,
      notes: 'Full quantity arrived on schedule with zero transit defects.',
      created_at: daysAgo(6),
    },
  ];

  const stepLogs: StepLog[] = [
    {
      id: 'log-081-1',
      po_id: 'po-081',
      step: 'REQUESTED',
      actor: 'Ravi Kumar',
      actor_role: 'HANDLER',
      timestamp: hoursAgo(4),
      notes: 'Requisition submitted for 120 bays pallet racks. High-value rule flagged ($12,000 > $5,000).',
    },
    {
      id: 'log-085-1',
      po_id: 'po-085',
      step: 'REQUESTED',
      actor: 'Ravi Kumar',
      actor_role: 'HANDLER',
      timestamp: hoursAgo(33),
      notes: 'Requisition created from free-text intake.',
    },
    {
      id: 'log-085-2',
      po_id: 'po-085',
      step: 'APPROVED',
      actor: 'Rule Engine',
      actor_role: 'SYSTEM',
      timestamp: hoursAgo(32.5),
      notes: 'Auto-approved: $4,000 <= $5,000 limit, Sunrise score 8.8 >= 7.5.',
    },
    {
      id: 'log-085-3',
      po_id: 'po-085',
      step: 'ORDERED',
      actor: 'Dispatch Agent',
      actor_role: 'SYSTEM',
      timestamp: hoursAgo(32),
      notes: 'Dispatched official PO to orders@sunrisetrading.com.',
    },
    {
      id: 'log-077-1',
      po_id: 'po-077',
      step: 'ORDERED',
      actor: 'Dispatch Agent',
      actor_role: 'SYSTEM',
      timestamp: daysAgo(3),
      notes: 'Dispatched PO to Sunrise Trading.',
    },
    {
      id: 'log-077-2',
      po_id: 'po-077',
      step: 'CONFIRMED',
      actor: 'Sunrise Trading Co.',
      actor_role: 'SUPPLIER',
      timestamp: daysAgo(2),
      notes: 'Supplier acknowledged order delivery commitment.',
    },
    {
      id: 'log-077-3',
      po_id: 'po-077',
      step: 'SHIPPED',
      actor: 'Sunrise Trading Co.',
      actor_role: 'SUPPLIER',
      timestamp: hoursAgo(12),
      notes: 'Shipped via BlueDart Logistics (TRK-SUN-99214).',
    },
    {
      id: 'log-042-1',
      po_id: 'po-042',
      step: 'CLOSED',
      actor: 'System Reconciler',
      actor_role: 'SYSTEM',
      timestamp: daysAgo(5),
      notes: 'Reconciled delivery receipt and vendor invoice. Order successfully closed.',
    },
  ];

  return {
    users: INITIAL_USERS,
    suppliers: INITIAL_SUPPLIERS,
    requests,
    orders,
    emails,
    documents,
    outcomes,
    stepLogs,
    policy: DEFAULT_POLICY,
  };
}

class Store {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.orders && parsed.suppliers && parsed.users) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read existing database, initializing fresh state:', e);
    }
    const seed = getInitialSeedData();
    this.saveState(seed);
    return seed;
  }

  private saveState(state: DatabaseState) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database state:', e);
    }
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public update(fn: (draft: DatabaseState) => void) {
    fn(this.state);
    this.saveState(this.state);
  }

  public reset() {
    this.state = getInitialSeedData();
    this.saveState(this.state);
    return this.state;
  }
}

export const db = new Store();
