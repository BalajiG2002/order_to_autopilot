import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ThreadList } from './components/ThreadList.tsx';
import { ThreadView } from './components/ThreadView.tsx';
import { NewRequestModal } from './components/NewRequestModal.tsx';
import { ManagerApprovalModal } from './components/ManagerApprovalModal.tsx';
import { SupplierSimulatorModal } from './components/SupplierSimulatorModal.tsx';
import { DeliveryReceiptModal } from './components/DeliveryReceiptModal.tsx';
import { AnalyticsView } from './components/AnalyticsView.tsx';
import { PolicyModal } from './components/PolicyModal.tsx';
import { DemoTourModal } from './components/DemoTourModal.tsx';
import {
  AnalyticsSummary,
  EmailMessage,
  OrderDocument,
  OrderOutcome,
  ProcurementPolicy,
  PurchaseOrder,
  StepLog,
  Supplier,
  UserProfile,
} from './types/index.ts';

const FALLBACK_USER: UserProfile = {
  id: 'user-ravi',
  name: 'Ravi Kumar',
  email: 'ravi@acme-corp.com',
  role: 'HANDLER',
  title: 'Operations & Logistics Handler',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
};

const DEFAULT_POLICY: ProcurementPolicy = {
  auto_approve_max_value: 5000,
  min_supplier_score: 7.5,
  chase_interval_hours: 24,
  max_chases_before_escalate: 2,
};

export default function App() {
  // Authentication & Users
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(FALLBACK_USER);

  // Core Data
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [policy, setPolicy] = useState<ProcurementPolicy>(DEFAULT_POLICY);
  const [orders, setOrders] = useState<any[]>([]);
  const [folderCounts, setFolderCounts] = useState({
    all: 0,
    inbox: 0,
    exceptions: 0,
    drafts: 0,
    sent: 0,
  });

  // Selected Order Detail
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<{
    order: PurchaseOrder;
    thread: EmailMessage[];
    documents: OrderDocument[];
    stepLogs: StepLog[];
    outcome?: OrderOutcome;
    supplier?: Supplier;
  } | null>(null);

  // Navigation Filters
  const [activeFolder, setActiveFolder] = useState<string>('inbox');
  const [activeStepFilter, setActiveStepFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isSupplierOpen, setIsSupplierOpen] = useState(false);
  const [supplierDefaultAction, setSupplierDefaultAction] = useState<'confirm' | 'ship' | 'invoice' | 'reply'>('confirm');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Analytics data
  const [analyticsData, setAnalyticsData] = useState<AnalyticsSummary | null>(null);

  // Loading States
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isSchedulerRunning, setIsSchedulerRunning] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  // 1. Initial Load: Users, Suppliers, Policy
  useEffect(() => {
    async function init() {
      try {
        const [uRes, sRes, pRes] = await Promise.all([
          fetch('/api/users').then((r) => r.json()),
          fetch('/api/suppliers').then((r) => r.json()),
          fetch('/api/policy').then((r) => r.json()),
        ]);

        if (uRes.users && uRes.users.length > 0) {
          setUsers(uRes.users);
          // Set Ravi as default or match previous
          const ravi = uRes.users.find((u: UserProfile) => u.id === 'user-ravi') || uRes.users[0];
          setCurrentUser(ravi);
        }
        if (sRes.suppliers) setSuppliers(sRes.suppliers);
        if (pRes.policy) setPolicy(pRes.policy);
      } catch (err) {
        console.error('Initial fetch failed:', err);
      }
    }
    init();
  }, []);

  // 2. Fetch Orders on filter change
  const fetchOrders = useCallback(async (selectIdAfter?: string) => {
    setIsLoadingOrders(true);
    try {
      const params = new URLSearchParams({
        role: currentUser.role,
        userId: currentUser.id,
        folder: activeFolder,
      });
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();

      let list = data.orders || [];
      if (activeStepFilter !== 'ALL') {
        list = list.filter((o: PurchaseOrder) => o.step === activeStepFilter);
      }

      setOrders(list);
      if (data.counts) setFolderCounts(data.counts);

      // Select order if needed
      const targetId = selectIdAfter || selectedOrderId || list[0]?.id;
      if (targetId && list.some((o: PurchaseOrder) => o.id === targetId)) {
        setSelectedOrderId(targetId);
      } else if (list.length > 0) {
        setSelectedOrderId(list[0].id);
      } else {
        setSelectedOrderId(null);
        setSelectedOrderDetail(null);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [currentUser, activeFolder, activeStepFilter, searchQuery, selectedOrderId]);

  useEffect(() => {
    fetchOrders();
  }, [currentUser, activeFolder, activeStepFilter, searchQuery]);

  // 3. Fetch Selected Order Detail
  const fetchOrderDetail = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}?userId=${currentUser.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setSelectedOrderDetail(data);
    } catch (err) {
      console.error('Failed to fetch order detail:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchOrderDetail(selectedOrderId);
    } else {
      setSelectedOrderDetail(null);
    }
  }, [selectedOrderId, fetchOrderDetail]);

  // 4. Fetch Analytics when modal opened
  const fetchAnalytics = async () => {
    setIsAnalyticsOpen(true);
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  // 5. Actions: Create Order
  const handleCreateOrder = async (payload: any) => {
    setIsActionLoading(true);
    try {
      const res = await fetch('/api/orders/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.order) {
        setIsNewRequestOpen(false);
        await fetchOrders(data.order.id);
        setSelectedOrderId(data.order.id);
      }
    } catch (err) {
      console.error('Failed to create order:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 6. Actions: Manager Approve Exception
  const handleApproveOrder = async (notes: string) => {
    if (!selectedOrderId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setIsApproveOpen(false);
        await Promise.all([fetchOrders(selectedOrderId), fetchOrderDetail(selectedOrderId)]);
      }
    } catch (err) {
      console.error('Failed to approve order:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 7. Actions: Manager Reject Exception
  const handleRejectOrder = async (reason: string) => {
    if (!selectedOrderId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setIsApproveOpen(false);
        await Promise.all([fetchOrders(selectedOrderId), fetchOrderDetail(selectedOrderId)]);
      }
    } catch (err) {
      console.error('Failed to reject order:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 8. Actions: Supplier Simulation
  const handleSupplierAction = async (payload: any) => {
    if (!selectedOrderId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/supplier-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsSupplierOpen(false);
        await Promise.all([fetchOrders(selectedOrderId), fetchOrderDetail(selectedOrderId)]);
      }
    } catch (err) {
      console.error('Failed supplier action:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 9. Actions: Handler Confirm Goods Delivery (Feedback Loop!)
  const handleConfirmDelivery = async (payload: any) => {
    if (!selectedOrderId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setIsReceiptOpen(false);
        // Refresh suppliers list to immediately show updated scorecard!
        const supRes = await fetch('/api/suppliers');
        const supData = await supRes.json();
        if (supData.suppliers) setSuppliers(supData.suppliers);

        await Promise.all([fetchOrders(selectedOrderId), fetchOrderDetail(selectedOrderId)]);
      }
    } catch (err) {
      console.error('Failed delivery confirmation:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 10. Actions: Close Order
  const handleCloseOrder = async () => {
    if (!selectedOrderId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to close order');
      } else {
        await Promise.all([fetchOrders(selectedOrderId), fetchOrderDetail(selectedOrderId)]);
      }
    } catch (err) {
      console.error('Failed to close order:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 11. Actions: Send Chaser Email
  const handleSendChaser = async () => {
    if (!selectedOrderId) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/orders/${selectedOrderId}/chase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        await Promise.all([fetchOrders(selectedOrderId), fetchOrderDetail(selectedOrderId)]);
      }
    } catch (err) {
      console.error('Failed to send chaser:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // 12. Actions: Run Background Scheduler Tick
  const handleRunScheduler = async () => {
    setIsSchedulerRunning(true);
    try {
      const res = await fetch('/api/scheduler/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSchedulerMessage(data.message || 'Scheduler tick completed');
      setTimeout(() => setSchedulerMessage(null), 6000);
      await fetchOrders(selectedOrderId || undefined);
      if (selectedOrderId) await fetchOrderDetail(selectedOrderId);
    } catch (err) {
      console.error('Failed to run scheduler tick:', err);
    } finally {
      setIsSchedulerRunning(false);
    }
  };

  // 13. Actions: Update Policy Rules
  const handleUpdatePolicy = async (updated: Partial<ProcurementPolicy>) => {
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.policy) setPolicy(data.policy);
    } catch (err) {
      console.error('Failed to update policy:', err);
    }
  };

  // 14. Actions: Reset Demo Database
  const handleResetDemo = async () => {
    if (!window.confirm('Reset database to initial seed scenario (Ravi, Meena & Sunrise)?')) return;
    try {
      await fetch('/api/demo/reset', { method: 'POST' });
      // Reload everything
      const [uRes, sRes, pRes] = await Promise.all([
        fetch('/api/users').then((r) => r.json()),
        fetch('/api/suppliers').then((r) => r.json()),
        fetch('/api/policy').then((r) => r.json()),
      ]);
      if (uRes.users) setUsers(uRes.users);
      if (sRes.suppliers) setSuppliers(sRes.suppliers);
      if (pRes.policy) setPolicy(pRes.policy);
      const ravi = uRes.users?.find((u: UserProfile) => u.id === 'user-ravi') || uRes.users?.[0];
      if (ravi) setCurrentUser(ravi);
      setActiveFolder('inbox');
      await fetchOrders('po-081');
    } catch (err) {
      console.error('Failed to reset demo:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        currentUser={currentUser}
        users={users}
        onSelectUser={(u) => setCurrentUser(u)}
        onOpenDemoTour={() => setIsTourOpen(true)}
        onRunScheduler={handleRunScheduler}
        onResetDemo={handleResetDemo}
        isSchedulerRunning={isSchedulerRunning}
        schedulerMessage={schedulerMessage}
      />

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto shadow-sm bg-white">
        {/* Left Folder Navigation Sidebar */}
        <Sidebar
          currentUser={currentUser}
          activeFolder={activeFolder}
          onSelectFolder={(f) => setActiveFolder(f)}
          activeStepFilter={activeStepFilter}
          onSelectStepFilter={(s) => setActiveStepFilter(s)}
          onOpenNewRequest={() => setIsNewRequestOpen(true)}
          onOpenPolicy={() => setIsPolicyOpen(true)}
          onOpenAnalytics={fetchAnalytics}
          folderCounts={folderCounts}
        />

        {/* Middle Thread List */}
        <ThreadList
          orders={orders}
          selectedOrderId={selectedOrderId}
          onSelectOrder={(id) => setSelectedOrderId(id)}
          searchQuery={searchQuery}
          onSearchChange={(q) => setSearchQuery(q)}
          isLoading={isLoadingOrders}
        />

        {/* Right Thread Detail & Actions */}
        {selectedOrderDetail ? (
          <ThreadView
            currentUser={currentUser}
            order={selectedOrderDetail.order}
            thread={selectedOrderDetail.thread}
            documents={selectedOrderDetail.documents}
            stepLogs={selectedOrderDetail.stepLogs}
            outcome={selectedOrderDetail.outcome}
            supplier={selectedOrderDetail.supplier}
            onOpenApproveModal={() => setIsApproveOpen(true)}
            onOpenRejectModal={() => setIsApproveOpen(true)}
            onOpenSupplierModal={(action) => {
              setSupplierDefaultAction(action || 'confirm');
              setIsSupplierOpen(true);
            }}
            onOpenReceiptModal={() => setIsReceiptOpen(true)}
            onCloseOrder={handleCloseOrder}
            onSendChaser={handleSendChaser}
            isActionLoading={isActionLoading}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 text-slate-400">
            <p className="text-xs">Select an order thread from the list to view full email trail and actions.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        onSubmit={handleCreateOrder}
        suppliers={suppliers}
        policy={policy}
        isSubmitting={isActionLoading}
      />

      <ManagerApprovalModal
        isOpen={isApproveOpen}
        order={selectedOrderDetail?.order || null}
        onClose={() => setIsApproveOpen(false)}
        onApprove={handleApproveOrder}
        onReject={handleRejectOrder}
        isLoading={isActionLoading}
      />

      <SupplierSimulatorModal
        isOpen={isSupplierOpen}
        order={selectedOrderDetail?.order || null}
        defaultAction={supplierDefaultAction}
        onClose={() => setIsSupplierOpen(false)}
        onExecuteAction={handleSupplierAction}
        isLoading={isActionLoading}
      />

      <DeliveryReceiptModal
        isOpen={isReceiptOpen}
        order={selectedOrderDetail?.order || null}
        supplier={selectedOrderDetail?.supplier}
        onClose={() => setIsReceiptOpen(false)}
        onConfirmDelivery={handleConfirmDelivery}
        isLoading={isActionLoading}
      />

      <AnalyticsView
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        data={analyticsData}
        isLoading={!analyticsData}
      />

      <PolicyModal
        isOpen={isPolicyOpen}
        onClose={() => setIsPolicyOpen(false)}
        policy={policy}
        onUpdatePolicy={handleUpdatePolicy}
        isLoading={isActionLoading}
      />

      <DemoTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onSelectRole={(userId) => {
          const u = users.find((x) => x.id === userId);
          if (u) setCurrentUser(u);
        }}
        onOpenNewRequest={() => setIsNewRequestOpen(true)}
        onOpenAnalytics={fetchAnalytics}
        onRunScheduler={handleRunScheduler}
      />
    </div>
  );
}
