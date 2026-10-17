import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { canTransition, validateClosureRequirements } from './server/rules/stateMachine.ts';
import { evaluateApprovalPolicy } from './server/rules/policy.ts';
import { selectBestSupplier } from './server/rules/dispatcher.ts';
import { calculateSupplierScore, updateSupplierOutcome } from './server/rules/scoring.ts';
import {
  parseFreeTextRequest,
  draftPoDispatchEmail,
  draftChaserEmail,
  parseSupplierReply,
  generateWeeklyInsight,
} from './server/agents/llm.ts';
import { EmailMessage, OrderDocument, OrderOutcome, PurchaseOrder, StepLog } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Helper to generate unique IDs
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// ----------------------------------------------------------------------
// AUTH & USERS
// ----------------------------------------------------------------------
app.get('/api/users', (req: Request, res: Response) => {
  const state = db.getState();
  res.json({ users: state.users });
});

// ----------------------------------------------------------------------
// SUPPLIERS
// ----------------------------------------------------------------------
app.get('/api/suppliers', (req: Request, res: Response) => {
  const state = db.getState();
  const sorted = [...state.suppliers].sort((a, b) => b.score - a.score);
  res.json({ suppliers: sorted });
});

// ----------------------------------------------------------------------
// POLICY
// ----------------------------------------------------------------------
app.get('/api/policy', (req: Request, res: Response) => {
  const state = db.getState();
  res.json({ policy: state.policy });
});

app.post('/api/policy', (req: Request, res: Response) => {
  const { auto_approve_max_value, min_supplier_score, chase_interval_hours, max_chases_before_escalate } = req.body;
  db.update((draft) => {
    if (auto_approve_max_value !== undefined) draft.policy.auto_approve_max_value = Number(auto_approve_max_value);
    if (min_supplier_score !== undefined) draft.policy.min_supplier_score = Number(min_supplier_score);
    if (chase_interval_hours !== undefined) draft.policy.chase_interval_hours = Number(chase_interval_hours);
    if (max_chases_before_escalate !== undefined) draft.policy.max_chases_before_escalate = Number(max_chases_before_escalate);
  });
  res.json({ success: true, policy: db.getState().policy });
});

// ----------------------------------------------------------------------
// ORDERS & EMAIL-FIRST WORKSPACE
// ----------------------------------------------------------------------
app.get('/api/orders', (req: Request, res: Response) => {
  const state = db.getState();
  const { role, userId, folder, search } = req.query as {
    role?: string;
    userId?: string;
    folder?: string;
    search?: string;
  };

  let orders = [...state.orders];

  // Role filtering per requirements:
  // - Handler (Ravi): sees his orders
  // - Manager (Meena): sees all orders, especially exception queue
  // - Supplier (Sunrise): sees only their assigned orders
  if (role === 'SUPPLIER') {
    const user = state.users.find((u) => u.id === userId);
    const supplierId = user?.supplierId || 'sup-1';
    orders = orders.filter((o) => o.supplier_id === supplierId && o.step !== 'REQUESTED');
  } else if (role === 'HANDLER') {
    orders = orders.filter((o) => o.handler_email === 'ravi@acme-corp.com' || o.handler_name === 'Ravi Kumar');
  }

  // Folder concept mapping:
  // Inbox: items needing current user action
  //   - Manager: exceptions (PENDING_MANAGER)
  //   - Supplier: new POs (ORDERED) or chaser follow-ups
  //   - Handler: deliveries to confirm (SHIPPED or RECEIVED missing docs)
  // Sent: requests / dispatches initiated
  // Drafts: pending approvals / chasers waiting to send
  if (folder === 'inbox') {
    if (role === 'MANAGER') {
      orders = orders.filter((o) => o.approval_status === 'PENDING_MANAGER');
    } else if (role === 'SUPPLIER') {
      orders = orders.filter((o) => o.step === 'ORDERED' || o.chase_count > 0);
    } else if (role === 'HANDLER') {
      orders = orders.filter((o) => o.step === 'SHIPPED');
    }
  } else if (folder === 'sent') {
    if (role === 'HANDLER') {
      orders = orders.filter((o) => o.step !== 'REQUESTED');
    } else if (role === 'SUPPLIER') {
      orders = orders.filter((o) => o.step === 'CONFIRMED' || o.step === 'SHIPPED' || o.step === 'CLOSED');
    }
  } else if (folder === 'drafts') {
    orders = orders.filter((o) => o.approval_status === 'PENDING_MANAGER' || o.step === 'REQUESTED');
  } else if (folder === 'exceptions') {
    orders = orders.filter((o) => o.approval_status === 'PENDING_MANAGER' || o.flags.length > 0);
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.po_number.toLowerCase().includes(q) ||
        o.item.toLowerCase().includes(q) ||
        o.supplier_name.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q)
    );
  }

  // Sort by updated_at descending
  orders.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Attach thread snippet and message count
  const enriched = orders.map((o) => {
    const thread = state.emails.filter((e) => e.po_id === o.id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const latestEmail = thread[0];
    const isUnread = userId ? o.unread_by?.includes(userId) : false;
    return {
      ...o,
      message_count: thread.length,
      latest_email_subject: latestEmail?.subject || `PO ${o.po_number}`,
      latest_email_preview: latestEmail?.body ? latestEmail.body.replace(/\n+/g, ' ').slice(0, 110) + '...' : '',
      latest_email_time: latestEmail?.timestamp || o.updated_at,
      latest_email_sender: latestEmail?.from_name || o.handler_name,
      is_unread: isUnread,
    };
  });

  // Calculate folder counts for UI badges
  const allUserOrders = role === 'SUPPLIER'
    ? state.orders.filter((o) => o.supplier_id === (state.users.find((u) => u.id === userId)?.supplierId || 'sup-1'))
    : state.orders;

  const counts = {
    all: allUserOrders.length,
    inbox: role === 'MANAGER'
      ? allUserOrders.filter((o) => o.approval_status === 'PENDING_MANAGER').length
      : role === 'SUPPLIER'
      ? allUserOrders.filter((o) => o.step === 'ORDERED' || o.chase_count > 0).length
      : allUserOrders.filter((o) => o.step === 'SHIPPED').length,
    exceptions: allUserOrders.filter((o) => o.approval_status === 'PENDING_MANAGER' || o.flags.length > 0).length,
    drafts: allUserOrders.filter((o) => o.approval_status === 'PENDING_MANAGER' || o.step === 'REQUESTED').length,
    sent: allUserOrders.filter((o) => o.step !== 'REQUESTED').length,
  };

  res.json({ orders: enriched, counts });
});

// Single Order Detail with Full Thread
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.query as { userId?: string };
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Mark as read for this user
  if (userId && order.unread_by.includes(userId)) {
    db.update((draft) => {
      const target = draft.orders.find((o) => o.id === id);
      if (target) {
        target.unread_by = target.unread_by.filter((u) => u !== userId);
      }
    });
  }

  const thread = state.emails
    .filter((e) => e.po_id === id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const documents = state.documents.filter((d) => d.po_id === id);
  const stepLogs = state.stepLogs
    .filter((l) => l.po_id === id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const outcome = state.outcomes.find((o) => o.po_id === id);
  const supplier = state.suppliers.find((s) => s.id === order.supplier_id);

  res.json({
    order,
    thread,
    documents,
    stepLogs,
    outcome,
    supplier,
  });
});

// ----------------------------------------------------------------------
// AI INTAKE & CREATION
// ----------------------------------------------------------------------
app.post('/api/orders/intake', async (req: Request, res: Response) => {
  const { raw_text, item, qty, unit, estimated_unit_price, needed_by, urgency, category, preferred_supplier_id } = req.body;
  const state = db.getState();

  let parsedData = {
    item: item || '',
    qty: Number(qty) || 0,
    unit: unit || 'units',
    estimated_unit_price: Number(estimated_unit_price) || 0,
    needed_by: needed_by || '',
    urgency: (urgency || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    category: category || 'General Supplies',
    notes: '',
  };

  // If free text is provided, use Gemini language agent (with rule fallback)
  if (raw_text && (!item || !qty)) {
    try {
      const extracted = await parseFreeTextRequest(raw_text);
      parsedData = {
        item: item || extracted.item,
        qty: Number(qty) || extracted.qty,
        unit: unit || extracted.unit,
        estimated_unit_price: Number(estimated_unit_price) || extracted.estimated_unit_price,
        needed_by: needed_by || extracted.needed_by,
        urgency: urgency || extracted.urgency,
        category: category || extracted.category,
        notes: extracted.notes,
      };
    } catch (err) {
      console.error('Intake parse error:', err);
    }
  }

  const totalValue = parsedData.qty * parsedData.estimated_unit_price;

  // Select best supplier via rules
  const dispatchSelection = selectBestSupplier(parsedData.category, state.suppliers, preferred_supplier_id);
  const selectedSupplier = dispatchSelection.selected;

  // Evaluate Approval Policy
  const policyEval = evaluateApprovalPolicy(totalValue, selectedSupplier, state.policy);

  const poNumber = `PO-2026-${String(state.orders.length + 80).padStart(3, '0')}`;
  const poId = uid('po');
  const reqId = uid('req');
  const threadId = `th-${poId}`;
  const nowIso = new Date().toISOString();

  let initialStep: PurchaseOrder['step'] = 'REQUESTED';
  let initialApproval: PurchaseOrder['approval_status'] = 'PENDING_MANAGER';

  if (policyEval.autoApproved) {
    initialStep = 'ORDERED';
    initialApproval = 'AUTO_APPROVED';
  }

  const newOrder: PurchaseOrder = {
    id: poId,
    po_number: poNumber,
    request_id: reqId,
    supplier_id: selectedSupplier.id,
    supplier_name: selectedSupplier.name,
    supplier_email: selectedSupplier.email,
    step: initialStep,
    item: parsedData.item,
    qty: parsedData.qty,
    unit: parsedData.unit,
    unit_price: parsedData.estimated_unit_price,
    total_value: totalValue,
    needed_by: parsedData.needed_by,
    created_at: nowIso,
    updated_at: nowIso,
    flags: policyEval.flags,
    approval_status: initialApproval,
    handler_name: 'Ravi Kumar',
    handler_email: 'ravi@acme-corp.com',
    urgency: parsedData.urgency,
    category: parsedData.category,
    chase_count: 0,
    unread_by: policyEval.autoApproved ? ['user-sunrise'] : ['user-meena'],
  };

  const newEmails: EmailMessage[] = [];
  const newLogs: StepLog[] = [];

  // Step 1 log: Requisition submitted
  newLogs.push({
    id: uid('log'),
    po_id: poId,
    step: 'REQUESTED',
    actor: 'Ravi Kumar',
    actor_role: 'HANDLER',
    timestamp: nowIso,
    notes: `Requisition submitted: ${parsedData.qty} ${parsedData.unit} of ${parsedData.item} ($${totalValue.toLocaleString()}). ${dispatchSelection.explanation}`,
  });

  if (policyEval.autoApproved) {
    // Auto-approval log
    newLogs.push({
      id: uid('log'),
      po_id: poId,
      step: 'APPROVED',
      actor: 'Policy Rule Engine',
      actor_role: 'SYSTEM',
      timestamp: nowIso,
      notes: `Autonomous Approval granted: Order value $${totalValue.toLocaleString()} <= $${state.policy.auto_approve_max_value.toLocaleString()}, supplier score ${selectedSupplier.score.toFixed(1)} >= ${state.policy.min_supplier_score}`,
    });

    // PO Dispatch email drafted and sent to supplier
    const dispatchEmail = await draftPoDispatchEmail(newOrder, selectedSupplier, 'Ravi Kumar');
    newEmails.push({
      id: uid('em'),
      po_id: poId,
      thread_id: threadId,
      direction: 'OUTBOUND',
      from_name: 'Acme Procurement Autopilot',
      from_email: 'procurement-bot@acme-corp.com',
      to_name: selectedSupplier.name,
      to_email: selectedSupplier.email,
      subject: dispatchEmail.subject,
      body: dispatchEmail.body,
      status: 'SENT',
      timestamp: nowIso,
      email_type: 'PO_DISPATCH',
      read_by: ['user-ravi', 'user-meena'],
    });

    newLogs.push({
      id: uid('log'),
      po_id: poId,
      step: 'ORDERED',
      actor: 'Dispatch Agent',
      actor_role: 'SYSTEM',
      timestamp: nowIso,
      notes: `Dispatched official Purchase Order to ${selectedSupplier.name} (${selectedSupplier.email})`,
    });
  } else {
    // Manager exception email added to thread
    newEmails.push({
      id: uid('em'),
      po_id: poId,
      thread_id: threadId,
      direction: 'OUTBOUND',
      from_name: 'Ravi Kumar',
      from_email: 'ravi@acme-corp.com',
      to_name: 'Meena Sharma',
      to_email: 'meena@acme-corp.com',
      subject: `[APPROVAL REQUIRED] ${poNumber}: ${parsedData.item} ($${totalValue.toLocaleString()})`,
      body: `Dear Meena,

A new procurement requisition has been logged that requires manager review:
- Item: ${parsedData.item} (${parsedData.qty} ${parsedData.unit})
- Total Amount: $${totalValue.toLocaleString()}
- Recommended Vendor: ${selectedSupplier.name} (Score: ${selectedSupplier.score.toFixed(1)}/10)
- In-Hand Date: ${parsedData.needed_by}
- Urgency: ${parsedData.urgency}

EXCEPTION REASONS:
${policyEval.reasons.map((r) => `• ${r}`).join('\n')}

Please review and confirm whether to authorize official dispatch.

Best regards,
Ravi Kumar (Operations Handler)`,
      status: 'SENT',
      timestamp: nowIso,
      email_type: 'INTERNAL_REQUEST',
      read_by: ['user-ravi'],
    });
  }

  db.update((draft) => {
    draft.orders.unshift(newOrder);
    draft.emails.push(...newEmails);
    draft.stepLogs.push(...newLogs);
    // increment supplier active POs if dispatched
    if (policyEval.autoApproved) {
      const sup = draft.suppliers.find((s) => s.id === selectedSupplier.id);
      if (sup) sup.active_pos += 1;
    }
  });

  res.json({
    order: newOrder,
    policyEval,
    supplier: selectedSupplier,
    alternates: dispatchSelection.alternates,
  });
});

// ----------------------------------------------------------------------
// MANAGER EXCEPTION APPROVAL / REJECTION
// ----------------------------------------------------------------------
app.post('/api/orders/:id/approve', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { notes } = req.body;
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const supplier = state.suppliers.find((s) => s.id === order.supplier_id);
  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found' });
    return;
  }

  const nowIso = new Date().toISOString();

  // Draft official PO dispatch email to supplier
  const dispatchEmail = await draftPoDispatchEmail(order, supplier, order.handler_name);

  const approvalEmail: EmailMessage = {
    id: uid('em'),
    po_id: order.id,
    thread_id: `th-${order.id}`,
    direction: 'OUTBOUND',
    from_name: 'Meena Sharma',
    from_email: 'meena@acme-corp.com',
    to_name: order.handler_name,
    to_email: order.handler_email,
    subject: `[APPROVED] ${order.po_number}: Exception approved by Procurement Management`,
    body: `Hi Ravi,

I have reviewed the exception for ${order.po_number} (${order.item}, $${order.total_value.toLocaleString()}).
Approval Note: ${notes || 'Approved for project continuity and operational requirements.'}

The official Purchase Order has now been authorized and transmitted to ${supplier.name}.

Regards,
Meena Sharma
Procurement Operations Manager`,
    status: 'SENT',
    timestamp: nowIso,
    email_type: 'APPROVAL_NOTIFICATION',
    read_by: ['user-meena'],
  };

  const poDispatchEmailMsg: EmailMessage = {
    id: uid('em'),
    po_id: order.id,
    thread_id: `th-${order.id}`,
    direction: 'OUTBOUND',
    from_name: 'Acme Procurement Autopilot',
    from_email: 'procurement-bot@acme-corp.com',
    to_name: supplier.name,
    to_email: supplier.email,
    subject: dispatchEmail.subject,
    body: dispatchEmail.body,
    status: 'SENT',
    timestamp: nowIso,
    email_type: 'PO_DISPATCH',
    read_by: ['user-meena', 'user-ravi'],
  };

  db.update((draft) => {
    const target = draft.orders.find((o) => o.id === id);
    if (target) {
      target.step = 'ORDERED';
      target.approval_status = 'MANAGER_APPROVED';
      target.flags = target.flags.filter((f) => f !== 'VALUE_THRESHOLD_EXCEEDED' && f !== 'LOW_SUPPLIER_SCORE');
      target.manager_notes = notes || 'Approved by Meena Sharma';
      target.updated_at = nowIso;
      target.unread_by = ['user-sunrise', 'user-ravi'];
    }

    draft.emails.push(approvalEmail, poDispatchEmailMsg);

    draft.stepLogs.push(
      {
        id: uid('log'),
        po_id: order.id,
        step: 'APPROVED',
        actor: 'Meena Sharma',
        actor_role: 'MANAGER',
        timestamp: nowIso,
        notes: `Manager approved exception: ${notes || 'Authorization granted'}`,
      },
      {
        id: uid('log'),
        po_id: order.id,
        step: 'ORDERED',
        actor: 'Dispatch Agent',
        actor_role: 'SYSTEM',
        timestamp: nowIso,
        notes: `PO dispatched to vendor ${supplier.name}`,
      }
    );

    const sup = draft.suppliers.find((s) => s.id === supplier.id);
    if (sup) sup.active_pos += 1;
  });

  res.json({ success: true, message: 'Order approved and dispatched to supplier' });
});

app.post('/api/orders/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const nowIso = new Date().toISOString();

  const rejectEmail: EmailMessage = {
    id: uid('em'),
    po_id: order.id,
    thread_id: `th-${order.id}`,
    direction: 'OUTBOUND',
    from_name: 'Meena Sharma',
    from_email: 'meena@acme-corp.com',
    to_name: order.handler_name,
    to_email: order.handler_email,
    subject: `[REJECTED] ${order.po_number}: Request declined by Procurement Manager`,
    body: `Hi Ravi,

Your requisition for ${order.item} (${order.po_number}) cannot be approved at this time.
Reason: ${reason || 'Budget exceeded or alternative inventory currently available.'}

Please consult procurement governance if you have questions.

Regards,
Meena Sharma`,
    status: 'SENT',
    timestamp: nowIso,
    email_type: 'APPROVAL_NOTIFICATION',
    read_by: ['user-meena'],
  };

  db.update((draft) => {
    const target = draft.orders.find((o) => o.id === id);
    if (target) {
      target.step = 'REJECTED';
      target.approval_status = 'REJECTED';
      target.updated_at = nowIso;
      target.unread_by = ['user-ravi'];
    }
    draft.emails.push(rejectEmail);
    draft.stepLogs.push({
      id: uid('log'),
      po_id: order.id,
      step: 'REJECTED',
      actor: 'Meena Sharma',
      actor_role: 'MANAGER',
      timestamp: nowIso,
      notes: `Rejected by Manager: ${reason || 'Declined'}`,
    });
  });

  res.json({ success: true, message: 'Order rejected' });
});

// ----------------------------------------------------------------------
// SUPPLIER SIMULATOR CONTROLS
// ----------------------------------------------------------------------
app.post('/api/orders/:id/supplier-action', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { action, promised_date, tracking_number, carrier, invoice_amount, free_text } = req.body;
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const supplier = state.suppliers.find((s) => s.id === order.supplier_id);
  const nowIso = new Date().toISOString();
  const threadId = `th-${order.id}`;

  if (action === 'confirm') {
    const targetDate = promised_date || order.needed_by;

    const email: EmailMessage = {
      id: uid('em'),
      po_id: order.id,
      thread_id: threadId,
      direction: 'INBOUND',
      from_name: supplier?.name || 'Supplier Desk',
      from_email: supplier?.email || 'vendor@example.com',
      to_name: 'Acme Procurement Autopilot',
      to_email: 'procurement-bot@acme-corp.com',
      subject: `Re: Official Purchase Order: ${order.po_number} - ACCEPTED & CONFIRMED`,
      body: `Dear Acme Procurement Team,

We formally confirm acceptance of Purchase Order ${order.po_number} for ${order.qty} ${order.unit} of ${order.item}.
Our logistics department commits to delivery by: ${targetDate}.

Order processing has begun at our fulfillment center.

Sincerely,
${supplier?.contact_person || 'Fulfillment Desk'}
${supplier?.name}`,
      status: 'DELIVERED',
      timestamp: nowIso,
      email_type: 'SUPPLIER_CONFIRMATION',
      read_by: ['user-sunrise'],
    };

    db.update((draft) => {
      const target = draft.orders.find((o) => o.id === id);
      if (target) {
        target.step = 'CONFIRMED';
        target.promised_date = targetDate;
        target.confirmed_at = nowIso;
        target.updated_at = nowIso;
        target.flags = target.flags.filter((f) => f !== 'IDLE_RESPONSE_PENDING');
        target.unread_by = ['user-ravi', 'user-meena'];
      }
      draft.emails.push(email);
      draft.stepLogs.push({
        id: uid('log'),
        po_id: order.id,
        step: 'CONFIRMED',
        actor: supplier?.name || 'Supplier',
        actor_role: 'SUPPLIER',
        timestamp: nowIso,
        notes: `Supplier accepted PO. Promised delivery date: ${targetDate}`,
      });
    });

    res.json({ success: true, message: 'Order confirmed by supplier' });
    return;
  }

  if (action === 'ship') {
    const trackNum = tracking_number || `TRK-EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    const carrierName = carrier || 'Express Freight Lines';

    const email: EmailMessage = {
      id: uid('em'),
      po_id: order.id,
      thread_id: threadId,
      direction: 'INBOUND',
      from_name: supplier?.name || 'Supplier Desk',
      from_email: supplier?.email || 'vendor@example.com',
      to_name: order.handler_name,
      to_email: order.handler_email,
      subject: `DISPATCH NOTIFICATION: ${order.po_number} Dispatched (${trackNum})`,
      body: `Dear ${order.handler_name},

Your order ${order.po_number} (${order.qty} ${order.unit} of ${order.item}) has departed our facility.

CARRIER DETAILS:
- Carrier: ${carrierName}
- Tracking Number: ${trackNum}
- Consignment Status: IN TRANSIT
- Estimated Arrival: 24 to 48 hours

Please confirm physical receipt upon delivery.

Best regards,
${supplier?.contact_person || 'Dispatch Desk'}
${supplier?.name}`,
      status: 'DELIVERED',
      timestamp: nowIso,
      email_type: 'SHIPPING_NOTICE',
      read_by: ['user-sunrise'],
    };

    db.update((draft) => {
      const target = draft.orders.find((o) => o.id === id);
      if (target) {
        target.step = 'SHIPPED';
        target.tracking_number = trackNum;
        target.carrier = carrierName;
        target.shipped_at = nowIso;
        target.updated_at = nowIso;
        target.unread_by = ['user-ravi'];
      }
      draft.emails.push(email);
      draft.stepLogs.push({
        id: uid('log'),
        po_id: order.id,
        step: 'SHIPPED',
        actor: supplier?.name || 'Supplier',
        actor_role: 'SUPPLIER',
        timestamp: nowIso,
        notes: `Consignment dispatched via ${carrierName} (Tracking #${trackNum})`,
      });
    });

    res.json({ success: true, message: 'Order marked as shipped with tracking' });
    return;
  }

  if (action === 'invoice') {
    const amount = Number(invoice_amount) || order.total_value;
    const invNumber = `INV-${supplier?.name.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newDoc: OrderDocument = {
      id: uid('doc'),
      po_id: order.id,
      type: 'INVOICE',
      filename: `${invNumber}.pdf`,
      received_at: nowIso,
      status: 'VERIFIED',
      amount,
      notes: `Commercial invoice submitted by ${supplier?.name}`,
    };

    const email: EmailMessage = {
      id: uid('em'),
      po_id: order.id,
      thread_id: threadId,
      direction: 'INBOUND',
      from_name: supplier?.name || 'Billing Team',
      from_email: supplier?.email || 'billing@example.com',
      to_name: 'Procurement Accounts Payable',
      to_email: 'finance@acme-corp.com',
      subject: `INVOICE SUBMISSION: ${invNumber} for ${order.po_number} ($${amount.toLocaleString()})`,
      body: `Dear Accounts Payable,

Please find submitted our commercial invoice ${invNumber} for Purchase Order ${order.po_number}.
- Total Invoiced: $${amount.toLocaleString()}
- Terms: Net 30
- Attached Document: ${invNumber}.pdf

Kindly schedule payment upon delivery reconciliation.

Sincerely,
Accounts Receivable
${supplier?.name}`,
      status: 'DELIVERED',
      timestamp: nowIso,
      email_type: 'INVOICE_SUBMISSION',
      read_by: ['user-sunrise'],
    };

    db.update((draft) => {
      draft.documents.push(newDoc);
      draft.emails.push(email);
      const target = draft.orders.find((o) => o.id === id);
      if (target) {
        target.updated_at = nowIso;
        // Check if both docs now exist and received
        const orderDocs = draft.documents.filter((d) => d.po_id === id);
        const closureCheck = validateClosureRequirements(orderDocs);
        if (closureCheck.valid && target.step === 'RECEIVED') {
          target.step = 'DOCS_COMPLETE';
        }
      }
      draft.stepLogs.push({
        id: uid('log'),
        po_id: order.id,
        step: order.step,
        actor: supplier?.name || 'Supplier',
        actor_role: 'SUPPLIER',
        timestamp: nowIso,
        notes: `Commercial invoice ${invNumber} ($${amount.toLocaleString()}) received and verified.`,
      });
    });

    res.json({ success: true, message: 'Invoice submitted successfully' });
    return;
  }

  if (action === 'free_text_reply' && free_text) {
    // Process supplier natural language response with Gemini LLM
    const parsed = await parseSupplierReply(free_text);

    const email: EmailMessage = {
      id: uid('em'),
      po_id: order.id,
      thread_id: threadId,
      direction: 'INBOUND',
      from_name: supplier?.name || 'Supplier',
      from_email: supplier?.email || 'orders@example.com',
      to_name: 'Acme Procurement Autopilot',
      to_email: 'procurement-bot@acme-corp.com',
      subject: `Re: Status Update on ${order.po_number}`,
      body: free_text,
      status: 'DELIVERED',
      timestamp: nowIso,
      email_type: 'SUPPLIER_REPLY',
      read_by: ['user-sunrise'],
    };

    db.update((draft) => {
      const target = draft.orders.find((o) => o.id === id);
      if (target) {
        target.updated_at = nowIso;
        target.unread_by = ['user-ravi', 'user-meena'];

        if (parsed.intent === 'SHIP' && order.step !== 'SHIPPED') {
          target.step = 'SHIPPED';
          if (parsed.tracking_number) target.tracking_number = parsed.tracking_number;
          if (parsed.carrier) target.carrier = parsed.carrier;
          target.shipped_at = nowIso;
        } else if (parsed.intent === 'CONFIRM' && order.step === 'ORDERED') {
          target.step = 'CONFIRMED';
          if (parsed.promised_date) target.promised_date = parsed.promised_date;
          target.confirmed_at = nowIso;
        }
      }

      draft.emails.push(email);
      draft.stepLogs.push({
        id: uid('log'),
        po_id: order.id,
        step: target?.step || order.step,
        actor: supplier?.name || 'Supplier',
        actor_role: 'SUPPLIER',
        timestamp: nowIso,
        notes: `Supplier replied: "${parsed.notes}". AI parsed intent: ${parsed.intent}`,
      });
    });

    res.json({ success: true, parsed, message: 'Supplier reply parsed and recorded' });
    return;
  }

  res.status(400).json({ error: 'Invalid supplier action' });
});

// ----------------------------------------------------------------------
// HANDLER DELIVERY CONFIRMATION & FEEDBACK LOOP
// ----------------------------------------------------------------------
app.post('/api/orders/:id/confirm-delivery', (req: Request, res: Response) => {
  const { id } = req.params;
  const { result, damaged_qty, short_qty, notes } = req.body;
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const supplier = state.suppliers.find((s) => s.id === order.supplier_id);
  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found' });
    return;
  }

  const nowIso = new Date().toISOString();
  const damaged = Number(damaged_qty) || 0;
  const short = Number(short_qty) || 0;
  const outcomeResult = (result || (damaged > 0 ? 'DAMAGED' : 'PERFECT')) as OrderOutcome['result'];

  const outcome: OrderOutcome = {
    id: uid('out'),
    po_id: order.id,
    supplier_id: supplier.id,
    result: outcomeResult,
    damaged_qty: damaged,
    short_qty: short,
    notes: notes || (damaged > 0 ? `${damaged} units damaged during transit` : 'Delivered in full satisfactory condition'),
    created_at: nowIso,
  };

  const receiptDoc: OrderDocument = {
    id: uid('doc'),
    po_id: order.id,
    type: 'RECEIPT',
    filename: `Goods_Receipt_${order.po_number}.pdf`,
    received_at: nowIso,
    status: 'VERIFIED',
    notes: `Inspection completed by Ravi Kumar. Outcome: ${outcomeResult}. Damaged: ${damaged}.`,
  };

  const email: EmailMessage = {
    id: uid('em'),
    po_id: order.id,
    thread_id: `th-${order.id}`,
    direction: 'OUTBOUND',
    from_name: 'Ravi Kumar',
    from_email: 'ravi@acme-corp.com',
    to_name: supplier.name,
    to_email: supplier.email,
    subject: `DELIVERY CONFIRMATION: ${order.po_number} Receipt Verified (${outcomeResult})`,
    body: `Dear ${supplier.name} and Procurement Governance,

Goods receipt inspection for ${order.po_number} (${order.item}) is completed at Acme Central Warehouse:
- Quantity Ordered: ${order.qty} ${order.unit}
- Delivery Outcome: ${outcomeResult}
- Damaged Units: ${damaged}
- Short Units: ${short}
- Handler Notes: ${outcome.notes}

Official Goods Receipt document Goods_Receipt_${order.po_number}.pdf attached.

${damaged > 0 ? `WARNING: ${damaged} damaged units will result in an automated downward score adjustment on your supplier scorecard.` : 'Full delivery accepted with zero discrepancy.'}

Regards,
Ravi Kumar (Logistics Handler)`,
    status: 'SENT',
    timestamp: nowIso,
    email_type: 'DELIVERY_RECEIPT',
    read_by: ['user-ravi'],
  };

  let updatedSupplierScore = supplier.score;

  db.update((draft) => {
    // 1. Update Order Step
    const target = draft.orders.find((o) => o.id === id);
    if (target) {
      target.step = 'RECEIVED';
      target.received_at = nowIso;
      target.updated_at = nowIso;
      target.unread_by = ['user-meena', 'user-sunrise'];

      // Check if invoice already present
      const allDocs = [...draft.documents.filter((d) => d.po_id === id), receiptDoc];
      const check = validateClosureRequirements(allDocs);
      if (check.valid) {
        target.step = 'DOCS_COMPLETE';
      }
    }

    draft.outcomes.push(outcome);
    draft.documents.push(receiptDoc);
    draft.emails.push(email);

    draft.stepLogs.push({
      id: uid('log'),
      po_id: order.id,
      step: 'RECEIVED',
      actor: 'Ravi Kumar',
      actor_role: 'HANDLER',
      timestamp: nowIso,
      notes: `Delivery verified: ${outcomeResult}. Damaged: ${damaged}. Supplier scorecard updated.`,
    });

    // 2. CRITICAL FEEDBACK LOOP: Recalculate Supplier Score & Rates!
    const targetSupplier = draft.suppliers.find((s) => s.id === supplier.id);
    if (targetSupplier) {
      const updated = updateSupplierOutcome(targetSupplier, outcome, order.qty);
      Object.assign(targetSupplier, updated);
      updatedSupplierScore = updated.score;
    }
  });

  res.json({
    success: true,
    outcome,
    newSupplierScore: updatedSupplierScore,
    message: `Delivery confirmed. Supplier ${supplier.name} score updated to ${updatedSupplierScore.toFixed(1)}/10`,
  });
});

// ----------------------------------------------------------------------
// CLOSE ORDER (GUARANTEED DOCUMENT VALIDATION)
// ----------------------------------------------------------------------
app.post('/api/orders/:id/close', (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  // Validate state machine rule: both receipt and invoice required
  const docs = state.documents.filter((d) => d.po_id === id);
  const validation = validateClosureRequirements(docs);

  if (!validation.valid) {
    res.status(400).json({
      error: `Cannot close order: Missing required documentation (${validation.missing.join(', ')}). Both Goods Receipt and Commercial Invoice must be verified.`,
      missing: validation.missing,
    });
    return;
  }

  const nowIso = new Date().toISOString();

  const closeEmail: EmailMessage = {
    id: uid('em'),
    po_id: order.id,
    thread_id: `th-${order.id}`,
    direction: 'OUTBOUND',
    from_name: 'Acme Procurement Autopilot',
    from_email: 'procurement-bot@acme-corp.com',
    to_name: order.supplier_name,
    to_email: order.supplier_email,
    subject: `[CLOSED] ${order.po_number}: Fulfillment Reconciled & Order Closed`,
    body: `Dear ${order.supplier_name} and Finance Team,

Purchase Order ${order.po_number} has been fully reconciled.
- Goods Receipt: Verified
- Commercial Invoice: Verified
- Order State: CLOSED
- Payment: Approved for release per payment schedule

Thank you for your partnership.

Acme Autonomous Procurement Governance`,
    status: 'SENT',
    timestamp: nowIso,
    email_type: 'ORDER_CLOSED',
    read_by: ['user-ravi', 'user-meena', 'user-sunrise'],
  };

  db.update((draft) => {
    const target = draft.orders.find((o) => o.id === id);
    if (target) {
      target.step = 'CLOSED';
      target.closed_at = nowIso;
      target.updated_at = nowIso;
    }
    draft.emails.push(closeEmail);
    draft.stepLogs.push({
      id: uid('log'),
      po_id: order.id,
      step: 'CLOSED',
      actor: 'System Reconciler',
      actor_role: 'SYSTEM',
      timestamp: nowIso,
      notes: 'Order closed after 2-way matching of delivery receipt and supplier invoice.',
    });
  });

  res.json({ success: true, message: `Order ${order.po_number} successfully closed.` });
});

// ----------------------------------------------------------------------
// CHASER AGENT (SCHEDULED & MANUAL)
// ----------------------------------------------------------------------
app.post('/api/orders/:id/chase', async (req: Request, res: Response) => {
  const { id } = req.params;
  const state = db.getState();

  const order = state.orders.find((o) => o.id === id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const supplier = state.suppliers.find((s) => s.id === order.supplier_id);
  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found' });
    return;
  }

  const nextChaseCount = order.chase_count + 1;
  const chaserDraft = await draftChaserEmail(order, supplier, nextChaseCount);
  const nowIso = new Date().toISOString();

  const email: EmailMessage = {
    id: uid('em'),
    po_id: order.id,
    thread_id: `th-${order.id}`,
    direction: 'OUTBOUND',
    from_name: nextChaseCount >= 2 ? 'Meena Sharma (Escalations)' : 'Acme Procurement Autopilot',
    from_email: nextChaseCount >= 2 ? 'meena@acme-corp.com' : 'procurement-bot@acme-corp.com',
    to_name: supplier.name,
    to_email: supplier.email,
    subject: chaserDraft.subject,
    body: chaserDraft.body,
    status: 'SENT',
    timestamp: nowIso,
    email_type: 'CHASER',
    read_by: ['user-meena', 'user-ravi'],
  };

  db.update((draft) => {
    const target = draft.orders.find((o) => o.id === id);
    if (target) {
      target.chase_count = nextChaseCount;
      target.last_chased_at = nowIso;
      target.updated_at = nowIso;
      target.unread_by = ['user-sunrise'];
      if (nextChaseCount >= 2 && !target.flags.includes('ESCALATED_TO_MANAGER')) {
        target.flags.push('ESCALATED_TO_MANAGER');
      }
    }
    draft.emails.push(email);
    draft.stepLogs.push({
      id: uid('log'),
      po_id: order.id,
      step: order.step,
      actor: nextChaseCount >= 2 ? 'Chaser Agent (Escalated)' : 'Chaser Agent',
      actor_role: 'SYSTEM',
      timestamp: nowIso,
      notes: `Sent chase #${nextChaseCount} to ${supplier.name}. Escalated: ${nextChaseCount >= 2}`,
    });
  });

  res.json({
    success: true,
    chaseCount: nextChaseCount,
    subject: chaserDraft.subject,
    message: `Chaser #${nextChaseCount} dispatched to ${supplier.name}`,
  });
});

// ----------------------------------------------------------------------
// SCHEDULER TICK (SIMULATES BACKGROUND AP SCHEDULER)
// ----------------------------------------------------------------------
app.post('/api/scheduler/tick', async (req: Request, res: Response) => {
  const state = db.getState();
  const idleThresholdHours = state.policy.chase_interval_hours || 24;
  const now = Date.now();
  const flaggedOrders: string[] = [];
  const chasedOrders: string[] = [];

  for (const order of state.orders) {
    if (order.step === 'ORDERED' || order.step === 'CONFIRMED') {
      const orderTime = new Date(order.last_chased_at || order.created_at).getTime();
      const hoursIdle = (now - orderTime) / (1000 * 3600);

      if (hoursIdle >= idleThresholdHours) {
        flaggedOrders.push(order.po_number);

        // Auto trigger chaser if not yet exceeded max
        if (order.chase_count < state.policy.max_chases_before_escalate + 1) {
          const supplier = state.suppliers.find((s) => s.id === order.supplier_id);
          if (supplier) {
            const nextChase = order.chase_count + 1;
            const draft = await draftChaserEmail(order, supplier, nextChase);
            const nowIso = new Date().toISOString();

            const chaserEmail: EmailMessage = {
              id: uid('em'),
              po_id: order.id,
              thread_id: `th-${order.id}`,
              direction: 'OUTBOUND',
              from_name: 'Autonomous Chaser Agent',
              from_email: 'procurement-bot@acme-corp.com',
              to_name: supplier.name,
              to_email: supplier.email,
              subject: draft.subject,
              body: draft.body,
              status: 'SENT',
              timestamp: nowIso,
              email_type: 'CHASER',
              read_by: ['user-meena', 'user-ravi'],
            };

            db.update((d) => {
              const target = d.orders.find((o) => o.id === order.id);
              if (target) {
                target.chase_count = nextChase;
                target.last_chased_at = nowIso;
                target.updated_at = nowIso;
                if (!target.flags.includes('IDLE_RESPONSE_PENDING')) {
                  target.flags.push('IDLE_RESPONSE_PENDING');
                }
              }
              d.emails.push(chaserEmail);
              d.stepLogs.push({
                id: uid('log'),
                po_id: order.id,
                step: order.step,
                actor: 'Tracker Scheduler',
                actor_role: 'SYSTEM',
                timestamp: nowIso,
                notes: `Automated timer triggered chase #${nextChase} after ${hoursIdle.toFixed(1)}h idle.`,
              });
            });

            chasedOrders.push(order.po_number);
          }
        }
      }
    }
  }

  res.json({
    success: true,
    scanned: state.orders.length,
    flagged: flaggedOrders,
    chased: chasedOrders,
    message: `Scheduler tick complete: scanned ${state.orders.length} orders, chased ${chasedOrders.length} idle orders.`,
  });
});

// ----------------------------------------------------------------------
// ANALYTICS & INSIGHT AGENT
// ----------------------------------------------------------------------
app.get('/api/analytics', async (req: Request, res: Response) => {
  const state = db.getState();
  const total = state.orders.length;
  const closed = state.orders.filter((o) => o.step === 'CLOSED').length;
  const active = total - closed;
  const closeRate = total > 0 ? closed / total : 0;

  // Calculate average cycle time
  const closedOrders = state.orders.filter((o) => o.step === 'CLOSED' && o.closed_at);
  let totalDays = 0;
  for (const o of closedOrders) {
    const start = new Date(o.created_at).getTime();
    const end = new Date(o.closed_at!).getTime();
    totalDays += Math.max(0.5, (end - start) / (1000 * 3600 * 24));
  }
  const avgCycleDays = closedOrders.length > 0 ? totalDays / closedOrders.length : 3.8;

  // Supplier metrics
  const avgScore =
    state.suppliers.reduce((acc, s) => acc + s.score, 0) / (state.suppliers.length || 1);
  const avgOnTime =
    state.suppliers.reduce((acc, s) => acc + s.on_time_rate, 0) / (state.suppliers.length || 1);
  const avgDamage =
    state.suppliers.reduce((acc, s) => acc + s.damage_rate, 0) / (state.suppliers.length || 1);

  // Generate executive summary via Gemini
  const aiInsight = await generateWeeklyInsight(
    {
      totalOrders: total,
      closeRate,
      avgCycleDays,
      onTimeRate: avgOnTime,
      damageRate: avgDamage,
    },
    state.suppliers
  );

  const cycleTimesByStage = [
    { stage: 'Intake to Approval', days: 0.2 },
    { stage: 'PO Dispatch to Confirm', days: 1.1 },
    { stage: 'Confirm to Transit', days: 1.8 },
    { stage: 'Transit to Receipt', days: 0.9 },
    { stage: 'Receipt to 2-Way Match', days: 0.4 },
  ];

  res.json({
    total_orders: total,
    active_orders: active,
    closed_orders: closed,
    close_rate: closeRate,
    avg_cycle_days: avgCycleDays,
    avg_supplier_score: Math.round(avgScore * 10) / 10,
    on_time_percentage: Math.round(avgOnTime * 100),
    damage_percentage: Math.round(avgDamage * 100),
    ai_insight_summary: aiInsight,
    cycle_times_by_stage: cycleTimesByStage,
    supplier_rankings: [...state.suppliers].sort((a, b) => b.score - a.score),
  });
});

// ----------------------------------------------------------------------
// RESET DEMO SEED
// ----------------------------------------------------------------------
app.post('/api/demo/reset', (req: Request, res: Response) => {
  const fresh = db.reset();
  res.json({ success: true, message: 'Reset demo database to fresh scenario', state: fresh });
});

// ----------------------------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS
// ----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Order-to-Delivery Autopilot server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
