import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Repeat,
  RefreshCcw,
  RefreshCw,
  XCircle,
  PauseCircle,
  PlayCircle,
  Calendar,
  ArrowUpRight,
  Plus,
  Search,
  Building2,
  Sparkles,
  Layers,
  HelpCircle,
  X,
  Edit3,
  Sliders,
  CheckCircle2,
  ShieldCheck,
  Check,
  DollarSign,
  Clock,
  Settings2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';
import useAuthStore from '../../store/auth.store.js';
import Spinner from '../../components/Spinner.jsx';

const STATUS_PILL_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 border-amber-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
};

const NOTICE_PRESETS = [0, 15, 30, 60, 90];

export default function V1SubscriptionsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const canManageSubscriptions = ['SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ ACTIVE: 0, PAUSED: 0, CANCELLED: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionState, setActionState] = useState({});

  // Subscription Plans Master Catalog (Admin)
  const [plansList, setPlansList] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlansCatalog, setShowPlansCatalog] = useState(false);

  // Create / Edit Plan Modal State (for Admin)
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planName, setPlanName] = useState('');
  const [planFrequency, setPlanFrequency] = useState('MONTHLY');
  const [planPrice, setPlanPrice] = useState('0.00');
  const [planNoticeDays, setPlanNoticeDays] = useState('0');
  const [planProrationEnabled, setPlanProrationEnabled] = useState(true);
  const [planIsActive, setPlanIsActive] = useState(true);
  const [submittingPlan, setSubmittingPlan] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/subscriptions', {
        params: {
          status: statusFilter,
          search: search || undefined,
          limit: 100,
        },
      });
      const data = res.data?.data;
      setSubscriptions(Array.isArray(data) ? data : data?.items || []);
      if (data?.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
    } catch (err) {
      console.warn('Subscriptions fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    setLoadingPlans(true);
    try {
      const res = await api.get('/subscription-plans');
      const data = res.data?.data;
      setPlansList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Subscription plans fetch note:', err);
    } finally {
      setLoadingPlans(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPlans();
  }, [statusFilter]);

  const setBusy = (id, busy) => setActionState((s) => ({ ...s, [id]: busy }));

  const handlePause = async (e, id) => {
    e.stopPropagation();
    setBusy(id, true);
    try {
      await api.post(`/subscriptions/${id}/pause`);
      toast.success('Subscription paused.');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not pause subscription.');
    } finally {
      setBusy(id, false);
    }
  };

  const handleResume = async (e, id) => {
    e.stopPropagation();
    setBusy(id, true);
    try {
      await api.post(`/subscriptions/${id}/resume`);
      toast.success('Subscription resumed active.');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not resume subscription.');
    } finally {
      setBusy(id, false);
    }
  };

  const handleCancel = async (e, id, productName) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to cancel the subscription for "${productName}"? An automatic credit note will be issued for any unused period.`)) {
      return;
    }
    setBusy(id, true);
    try {
      const res = await api.post(`/subscriptions/${id}/cancel`, {
        reason: 'Customer requested cancellation via portal',
      });
      const cn = res.data?.data?.creditNote;
      if (cn && Number(cn.amount) > 0) {
        toast.success(`Cancelled. Credit note for ₹${Number(cn.amount).toFixed(2)} issued.`);
      } else {
        toast.success('Subscription cancelled.');
      }
      fetchData();
    } catch (err) {
      const code = err?.response?.data?.error?.code;
      if (code === 'NOTICE_PERIOD_REQUIRED') {
        const msg = err.response?.data?.error?.message || 'Cancellation notice required.';
        if (window.confirm(`${msg}\n\nCancel immediately anyway?`)) {
          try {
            const overrideRes = await api.post(`/subscriptions/${id}/cancel`, {
              reason: 'Immediate cancellation override',
              overrideNotice: true,
            });
            const cn = overrideRes.data?.data?.creditNote;
            if (cn && Number(cn.amount) > 0) {
              toast.success(`Cancelled immediately (notice overridden). Credit note for ₹${Number(cn.amount).toFixed(2)} issued.`);
            } else {
              toast.success('Subscription cancelled immediately (notice period overridden).');
            }
            fetchData();
            return;
          } catch (overrideErr) {
            toast.error(overrideErr?.response?.data?.error?.message || 'Could not cancel subscription.');
            return;
          }
        }
        return;
      }
      toast.error(err?.response?.data?.error?.message || 'Could not cancel subscription.');
    } finally {
      setBusy(id, false);
    }
  };

  // Open Create Plan Modal
  const handleOpenCreatePlan = () => {
    setEditingPlanId(null);
    setPlanName('');
    setPlanFrequency('MONTHLY');
    setPlanPrice('0.00');
    setPlanNoticeDays('0');
    setPlanProrationEnabled(true);
    setPlanIsActive(true);
    setShowPlanModal(true);
  };

  // Open Edit Plan Modal
  const handleOpenEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setPlanName(plan.name || '');
    setPlanFrequency(plan.frequency || 'MONTHLY');
    setPlanPrice(plan.price !== undefined ? String(plan.price) : '0.00');
    setPlanNoticeDays(plan.cancellationNoticeDays !== undefined ? String(plan.cancellationNoticeDays) : '0');
    setPlanProrationEnabled(plan.prorationEnabled !== undefined ? Boolean(plan.prorationEnabled) : true);
    setPlanIsActive(plan.isActive !== undefined ? Boolean(plan.isActive) : true);
    setShowPlanModal(true);
  };

  // Toggle Active Status on Plan
  const handleTogglePlanActive = async (plan) => {
    const nextStatus = !plan.isActive;
    try {
      await api.patch(`/subscription-plans/${plan.id}`, {
        isActive: nextStatus,
      });
      toast.success(`Plan "${plan.name}" is now ${nextStatus ? 'Active' : 'Inactive'}.`);
      fetchPlans();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not update plan status.');
    }
  };

  // Submit Create or Edit Plan
  const handleSavePlan = async (e) => {
    e.preventDefault();
    if (!planName.trim()) {
      toast.error('Plan name is required.');
      return;
    }
    if (isNaN(Number(planPrice)) || Number(planPrice) < 0) {
      toast.error('A valid non-negative base price is required.');
      return;
    }

    setSubmittingPlan(true);
    try {
      const payload = {
        name: planName.trim(),
        frequency: planFrequency,
        price: Number(planPrice),
        cancellationNoticeDays: Math.max(0, parseInt(planNoticeDays, 10) || 0),
        prorationEnabled: Boolean(planProrationEnabled),
        isActive: Boolean(planIsActive),
      };

      if (editingPlanId) {
        await api.patch(`/subscription-plans/${editingPlanId}`, payload);
        toast.success(`Plan "${planName}" updated successfully.`);
      } else {
        await api.post('/subscription-plans', payload);
        toast.success(`Plan "${planName}" created successfully.`);
      }

      setShowPlanModal(false);
      fetchPlans();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not save subscription plan.');
    } finally {
      setSubmittingPlan(false);
    }
  };

  const filtered = subscriptions.filter((sub) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      sub.customerName?.toLowerCase().includes(term) ||
      sub.productName?.toLowerCase().includes(term) ||
      sub.planName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Subscriptions" />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 space-y-5">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">Subscriptions (List)</h1>
            <p className="text-xs text-slate-500 font-medium">
              Every recurring plan across every customer, regardless of which order it came from
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowPlansCatalog(!showPlansCatalog)}
                  className={`px-3.5 py-1.5 rounded-lg border text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5 ${
                    showPlansCatalog
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Plan Templates</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/70 text-slate-800 font-black">
                    {plansList.length}
                  </span>
                  {showPlansCatalog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <button
                  onClick={handleOpenCreatePlan}
                  className="px-4 py-1.5 rounded-lg bg-[#008784] hover:bg-[#00706e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> + New Plan (Admin)
                </button>
              </>
            )}
          </div>
        </div>

        {/* Admin Plan Templates Master Catalog Section */}
        {isAdmin && showPlansCatalog && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[#008784]" />
                  <h2 className="text-sm font-black text-slate-800 tracking-tight">Subscription Plan Templates Master</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#008784]/10 text-[#008784]">
                    Admin CRUD Catalog
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Manage recurring cadence, base pricing, notice policies, and proration rules for all subscription product lines.
                </p>
              </div>

              <button
                onClick={handleOpenCreatePlan}
                className="px-3 py-1 rounded-lg bg-[#008784] hover:bg-[#00706e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1 shrink-0 self-start sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" /> Define Plan
              </button>
            </div>

            {loadingPlans ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                <Spinner size="sm" variant="primary" /> Loading plan catalog...
              </div>
            ) : plansList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No subscription plan templates configured yet. Click "+ Define Plan" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {plansList.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-3.5 transition-all space-y-3 ${
                      plan.isActive
                        ? 'border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs'
                        : 'border-dashed border-slate-200 bg-slate-50/30 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-800 text-xs truncate" title={plan.name}>
                            {plan.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                          <span className="uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-bold">
                            {plan.frequency}
                          </span>
                          <span>•</span>
                          <span>{plan.cancellationNoticeDays > 0 ? `${plan.cancellationNoticeDays}d notice` : 'Immediate cancel'}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase shrink-0 ${
                          plan.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Base Recurring Price</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          ₹{Number(plan.price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          /{plan.frequency?.toLowerCase().replace('ly', '') || 'cycle'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Proration Policy</span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${plan.prorationEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {plan.prorationEnabled ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Proration Enabled
                            </>
                          ) : (
                            'No Proration'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleTogglePlanActive(plan)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                          plan.isActive
                            ? 'border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {plan.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditPlan(plan)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#008784] hover:bg-[#00706e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-white" />
                        <span>Edit Plan</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Filter Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-[#1e293b] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              All ({statusCounts.ACTIVE + statusCounts.PAUSED + statusCounts.CANCELLED})
            </button>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              {statusCounts.ACTIVE} Active
            </button>
            <button
              onClick={() => setStatusFilter('PAUSED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === 'PAUSED'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              {statusCounts.PAUSED} Paused
            </button>
            <button
              onClick={() => setStatusFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === 'CANCELLED'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {statusCounts.CANCELLED} Cancelled
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, plan, SKU..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008784]/30"
            />
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
              <Spinner size="lg" variant="primary" />
              <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading subscriptions ledger...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium space-y-1">
              <Repeat className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">No subscriptions found for this view.</p>
              <p className="text-[11px] text-slate-400">Convert an approved order with SUBSCRIPTION products to initiate recurring contracts.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3.5 font-semibold">Customer</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Plan & Product</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Cycle Cadence</th>
                    <th className="text-right px-5 py-3.5 font-semibold">Recurring Amount</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Next Bill Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                    <th className="text-right px-5 py-3.5 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((sub) => (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/v1/subscriptions/${sub.id}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 group-hover:text-[#008784] transition-colors">
                          {sub.customerName}
                        </div>
                        {sub.customerTier && (
                          <span className="text-[10px] text-slate-400 font-medium">{sub.customerTier} Tier · {sub.orderNumber}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{sub.productName}</div>
                        <span className="text-[10px] text-slate-400 font-medium">{sub.planName} (Qty {sub.quantity})</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {sub.frequency}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        ₹{Number(sub.recurringAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        {sub.status === 'CANCELLED' ? '—' : sub.nextBillingDate || '—'}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${STATUS_PILL_STYLES[sub.status] || STATUS_PILL_STYLES.ACTIVE}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageSubscriptions && (
                            <>
                              {sub.status === 'ACTIVE' && (
                                <button
                                  disabled={actionState[sub.id]}
                                  onClick={(e) => handlePause(e, sub.id)}
                                  title="Pause Subscription"
                                  className="p-1.5 rounded hover:bg-amber-50 text-slate-400 hover:text-amber-700 transition-colors"
                                >
                                  <PauseCircle className="h-4 w-4" />
                                </button>
                              )}
                              {sub.status === 'PAUSED' && (
                                <button
                                  disabled={actionState[sub.id]}
                                  onClick={(e) => handleResume(e, sub.id)}
                                  title="Resume Subscription"
                                  className="p-1.5 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 transition-colors"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </button>
                              )}
                              {sub.status !== 'CANCELLED' && (
                                <button
                                  disabled={actionState[sub.id]}
                                  onClick={(e) => handleCancel(e, sub.id, sub.productName)}
                                  title="Cancel & Issue Credit Note"
                                  className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-700 transition-colors"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                          <Link
                            to={`/v1/subscriptions/${sub.id}`}
                            className="text-[#008784] font-bold text-xs hover:underline inline-flex items-center gap-0.5 ml-2"
                          >
                            Detail <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Helper Banner */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-700 shrink-0" />
          <span>Click any subscription row to open its complete billing schedules, cycle history, and mid-cycle proration delta ledger.</span>
        </div>

        {/* Rich Admin Create / Edit Plan Modal with ALL Fields */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#008784]/10 text-[#008784]">
                      <Settings2 className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-black text-slate-800">
                      {editingPlanId ? 'Edit Subscription Plan' : 'Define New Subscription Plan'}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Configure recurring pricing, billing cadence, cancellation notice period, and proration terms.
                  </p>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
                {/* 1. Plan Name */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Plan Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Enterprise SLA Care Plan 24M"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008784]/30 focus:border-[#008784]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Unique display identifier shown in sales quotes and invoices.
                  </p>
                </div>

                {/* 2. Billing Cadence & Base Recurring Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Billing Cadence / Frequency <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={planFrequency}
                      onChange={(e) => setPlanFrequency(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008784]/30 focus:border-[#008784]"
                    >
                      <option value="MONTHLY">Monthly (Every 1 Mo)</option>
                      <option value="QUARTERLY">Quarterly (Every 3 Mos)</option>
                      <option value="YEARLY">Yearly (Every 12 Mos)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Base Recurring Price (₹) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={planPrice}
                        onChange={(e) => setPlanPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008784]/30 focus:border-[#008784]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Cancellation Notice Period (Days) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Cancellation Notice Period (Days)
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {Number(planNoticeDays) === 0 ? 'Immediate cancellation allowed' : `Requires ${planNoticeDays} days advance notice`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={planNoticeDays}
                      onChange={(e) => setPlanNoticeDays(e.target.value)}
                      placeholder="0"
                      className="w-28 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008784]/30 focus:border-[#008784]"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {NOTICE_PRESETS.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setPlanNoticeDays(String(days))}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors border ${
                            Number(planNoticeDays) === days
                              ? 'bg-[#008784] text-white border-[#008784]'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {days === 0 ? 'Immediate (0d)' : `${days}d`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 4. Policy Toggles: Proration & Active Status */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  {/* Proration Toggle */}
                  <label className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={planProrationEnabled}
                      onChange={(e) => setPlanProrationEnabled(e.target.checked)}
                      className="mt-0.5 rounded text-[#008784] focus:ring-[#008784] h-4 w-4 border-slate-300"
                    />
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#008784]" />
                        <span>Allow Mid-Cycle Proration Credit Notes</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        When enabled, cancellations or mid-cycle tier changes automatically compute unconsumed days and issue a refund/credit note.
                      </p>
                    </div>
                  </label>

                  {/* Active Toggle */}
                  <label className="flex items-start gap-3 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={planIsActive}
                      onChange={(e) => setPlanIsActive(e.target.checked)}
                      className="mt-0.5 rounded text-[#008784] focus:ring-[#008784] h-4 w-4 border-slate-300"
                    />
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Active in Quotation Catalog</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Allows sales reps to select this recurring plan when quoting subscription-based products.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPlan}
                    className="px-5 py-2 rounded-lg bg-[#008784] text-white text-xs font-bold hover:bg-[#00706e] disabled:opacity-50 shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    {submittingPlan ? (
                      <>
                        <Spinner size="sm" variant="white" />
                        <span>Saving Plan...</span>
                      </>
                    ) : editingPlanId ? (
                      'Update Plan'
                    ) : (
                      'Save & Publish Plan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
