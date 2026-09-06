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

export default function V1SubscriptionsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const canManageSubscriptions = ['FINANCE', 'ADMIN'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ ACTIVE: 0, PAUSED: 0, CANCELLED: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [actionState, setActionState] = useState({});

  // New Plan Modal State (for Admin)
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planFrequency, setPlanFrequency] = useState('MONTHLY');
  const [planPrice, setPlanPrice] = useState('0.00');
  const [planNoticeDays, setPlanNoticeDays] = useState('0');
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

  useEffect(() => {
    fetchData();
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
      toast.error(err?.response?.data?.error?.message || 'Could not cancel subscription.');
    } finally {
      setBusy(id, false);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planName) {
      toast.error('Plan name is required.');
      return;
    }
    setSubmittingPlan(true);
    try {
      await api.post('/subscription-plans', {
        name: planName,
        frequency: planFrequency,
        price: Number(planPrice),
        cancellationNoticeDays: Number(planNoticeDays),
      });
      toast.success('New subscription plan created successfully.');
      setShowPlanModal(false);
      setPlanName('');
      setPlanPrice('0.00');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not create plan.');
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
        
        {/* Wireframe 9 Header */}
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
              <button
                onClick={() => setShowPlanModal(true)}
                className="px-4 py-1.5 rounded-lg bg-[#008784] hover:bg-[#00706e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> + New Plan (Admin)
              </button>
            )}
          </div>
        </div>

        {/* Wireframe 9 Status Filter Buttons */}
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

        {/* Wireframe 9 Subscriptions Table */}
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

        {/* Wireframe 9 Helper Banner */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 text-xs flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-700 shrink-0" />
          <span>Click any subscription row to open its complete billing schedules, cycle history, and mid-cycle proration delta ledger.</span>
        </div>

        {/* Admin Create Plan Modal */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Define New Subscription Plan</h3>
                <button onClick={() => setShowPlanModal(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Plan Name</label>
                  <input
                    required
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Enterprise SLA Care Plan 2yr"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Cadence / Frequency</label>
                    <select
                      value={planFrequency}
                      onChange={(e) => setPlanFrequency(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Cancellation Notice (Days)</label>
                    <input
                      type="number"
                      value={planNoticeDays}
                      onChange={(e) => setPlanNoticeDays(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPlanModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPlan}
                    className="px-4 py-2 rounded-lg bg-[#008784] text-white font-bold hover:bg-[#00706e] disabled:opacity-50"
                  >
                    {submittingPlan ? 'Creating...' : 'Create Plan'}
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
