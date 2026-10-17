export type UserRole = 'HANDLER' | 'MANAGER' | 'SUPPLIER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
  avatar: string;
  department?: string;
  supplierId?: string;
}

export type OrderStep =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ORDERED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'RECEIVED'
  | 'DOCS_COMPLETE'
  | 'CLOSED';

export interface Supplier {
  id: string;
  name: string;
  email: string;
  score: number; // 0 - 10
  on_time_rate: number; // 0 - 1
  damage_rate: number; // 0 - 1
  category: string;
  active_pos: number;
  total_orders: number;
  contact_person: string;
  phone: string;
  address: string;
  avg_lead_days: number;
}

export interface ProcurementRequest {
  id: string;
  po_id?: string;
  handler: string;
  handler_email: string;
  item: string;
  qty: number;
  unit: string;
  estimated_unit_price: number;
  total_value: number;
  needed_by: string;
  raw_text: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  notes?: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  request_id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_email: string;
  step: OrderStep;
  item: string;
  qty: number;
  unit: string;
  unit_price: number;
  total_value: number;
  needed_by: string;
  promised_date?: string;
  tracking_number?: string;
  carrier?: string;
  confirmed_at?: string;
  shipped_at?: string;
  received_at?: string;
  closed_at?: string;
  chase_count: number;
  last_chased_at?: string;
  created_at: string;
  updated_at: string;
  flags: string[];
  approval_status: 'AUTO_APPROVED' | 'PENDING_MANAGER' | 'MANAGER_APPROVED' | 'REJECTED';
  manager_notes?: string;
  handler_name: string;
  handler_email: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category: string;
  unread_by: string[]; // user IDs with unread badge
}

export interface EmailMessage {
  id: string;
  po_id: string;
  thread_id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  from_name: string;
  from_email: string;
  to_name: string;
  to_email: string;
  subject: string;
  body: string;
  status: 'SENT' | 'DRAFT' | 'DELIVERED';
  timestamp: string;
  email_type:
    | 'INTERNAL_REQUEST'
    | 'APPROVAL_NOTIFICATION'
    | 'PO_DISPATCH'
    | 'SUPPLIER_REPLY'
    | 'SUPPLIER_CONFIRMATION'
    | 'CHASER'
    | 'SHIPPING_NOTICE'
    | 'DELIVERY_RECEIPT'
    | 'INVOICE_SUBMISSION'
    | 'ORDER_CLOSED';
  read_by: string[];
}

export interface OrderDocument {
  id: string;
  po_id: string;
  type: 'RECEIPT' | 'INVOICE';
  filename: string;
  received_at: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  amount?: number;
  notes?: string;
}

export interface OrderOutcome {
  id: string;
  po_id: string;
  supplier_id: string;
  result: 'PERFECT' | 'ON_TIME' | 'LATE' | 'DAMAGED' | 'SHORT';
  damaged_qty: number;
  short_qty: number;
  notes: string;
  created_at: string;
}

export interface StepLog {
  id: string;
  po_id: string;
  step: OrderStep;
  actor: string;
  actor_role: UserRole | 'SYSTEM';
  timestamp: string;
  notes: string;
}

export interface ProcurementPolicy {
  auto_approve_max_value: number; // e.g. 5000
  min_supplier_score: number; // e.g. 7.5
  chase_interval_hours: number; // e.g. 24
  max_chases_before_escalate: number; // e.g. 2
}

export interface AnalyticsSummary {
  total_orders: number;
  active_orders: number;
  closed_orders: number;
  avg_cycle_days: number;
  close_rate: number;
  avg_supplier_score: number;
  on_time_percentage: number;
  damage_percentage: number;
  ai_insight_summary: string;
  cycle_times_by_stage: { stage: string; days: number }[];
  supplier_rankings: Supplier[];
}
