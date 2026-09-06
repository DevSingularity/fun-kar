import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Repeat,
  ArrowLeft,
  Calendar,
  Building2,
  Receipt,
  RefreshCcw,
  PauseCircle,
  PlayCircle,
  XCircle,
  CheckCircle2,
  Clock,
  Undo2,
  FileText,
  DollarSign,
  ShieldAlert,
  Sparkles,
  ArrowUpRight,
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

const SCHEDULE_STATUS_STYLES = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  INVOICED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAID: 'bg-teal-50 text-teal-700 border-teal-200',
  SKIPPED: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function V1SubscriptionDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const canManageSubscriptions = ['FINANCE', 'ADMIN'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Change Modal State
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [newQuantity, setNewQuantity] = useState('1');
  const [submittingChange, setSubmittingChange] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/subscriptions/${id}`);
      const data = res.data?.data;
      setSubscription(data || null);
      if (data) setNewQuantity(String(data.quantity));
    } catch (err) {
      console.warn('Subscription detail fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await api.post(`/subscriptions/${id}/pause`);
      toast.success('Subscription paused successfully.');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not pause subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await api.post(`/subscriptions/${id}/resume`);
      toast.success('Subscription resumed active.');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not resume subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this subscription? A calculated credit note will be issued for any unused period.')) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.post(`/subscriptions/${id}/cancel`, {
        reason: 'Customer requested mid-cycle cancellation',
      });
      const cn = res.data?.data?.creditNote;
      if (cn && Number(cn.amount) > 0) {
        toast.success(`Subscription cancelled. Credit Note of ₹${Number(cn.amount).toFixed(2)} issued.`);
      } else {
        toast.success('Subscription cancelled.');
      }
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not cancel subscription.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeQuantity = async (e) => {
    e.preventDefault();
    if (!newQuantity || isNaN(Number(newQuantity)) || Number(newQuantity) <= 0) {
      toast.error('Enter a valid positive quantity.');
      return;
    }
    setSubmittingChange(true);
    try {
      const res = await api.post(`/subscriptions/${id}/change`, {
        quantity: Number(newQuantity),
      });
      const { delta } = res.data?.data || {};
      if (delta > 0) {
        toast.success(`Subscription upgraded! Supplemental proration charge of ₹${Number(delta).toFixed(2)} applied.`);
      } else if (delta < 0) {
        toast.success(`Subscription downgraded! Credit note of ₹${Math.abs(Number(delta)).toFixed(2)} issued.`);
      } else {
        toast.success('Subscription quantity updated.');
      }
      setShowChangeModal(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not change subscription.');
    } finally {
      setSubmittingChange(false);
    }
  };

  if (loading || !subscription) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
        <OdooTopNavbar activeTab="Subscriptions" />
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading subscription contract details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Subscriptions" />
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Back Link */}
        <Link
          to="/v1/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Subscriptions List
        </Link>

        {/* Wireframe 10 Billing Detail Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              Billing Detail: {subscription.customerName} - {subscription.planName || subscription.productName}
            </h1>
            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${STATUS_PILL_STYLES[subscription.status] || STATUS_PILL_STYLES.ACTIVE}`}>
              {subscription.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Opened by clicking a row on the Subscriptions list &bull; Originating Order: <span className="font-mono font-bold text-slate-700">{subscription.orderNumber}</span>
          </p>
        </div>

        {/* Wireframe 10 Section 1: One-Time Lines (from originating order) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-sky-600" /> One-Time Lines (from originating order)
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              {subscription.oneTimeLines?.length || 0} Item(s)
            </span>
          </div>

          {!subscription.oneTimeLines || subscription.oneTimeLines.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              No one-time lines in originating order {subscription.orderNumber}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Product</th>
                    <th className="text-center px-5 py-3 font-semibold">Qty</th>
                    <th className="text-right px-5 py-3 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscription.oneTimeLines.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {item.productName}
                        {item.sku && <span className="ml-2 text-[10px] font-mono font-normal text-slate-400">({item.sku})</span>}
                      </td>
                      <td className="px-5 py-3.5 text-center font-semibold text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Wireframe 10 Section 2: Recurring Lines */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden space-y-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <h2 className="text-xs font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1.5">
              <Repeat className="h-3.5 w-3.5 text-sky-600" /> Recurring Lines
            </h2>
            <span className="text-xs text-slate-500 font-semibold">
              {subscription.recurringLines?.length || 1} Recurring Plan(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Plan</th>
                  <th className="text-left px-5 py-3 font-semibold">Cycle</th>
                  <th className="text-left px-5 py-3 font-semibold">Next Bill Date</th>
                  <th className="text-right px-5 py-3 font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscription.recurringLines && subscription.recurringLines.length > 0 ? (
                  subscription.recurringLines.map((rec) => (
                    <tr key={rec.id} className={`hover:bg-slate-50/70 transition-colors ${rec.id === subscription.id ? 'bg-[#008784]/5 font-semibold' : ''}`}>
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {rec.planName || rec.productName}
                        {rec.id === subscription.id && (
                          <span className="ml-2 text-[10px] px-2 py-0.5 rounded font-bold bg-[#008784]/15 text-[#008784]">
                            Selected
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 capitalize font-medium text-slate-700">
                        {rec.frequency?.toLowerCase() || 'Monthly'}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-700">
                        {rec.status === 'CANCELLED' ? '—' : (rec.nextBillingDate ? new Date(rec.nextBillingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900">
                        ₹{Number(rec.recurringAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-bold text-slate-800">
                      {subscription.planName || subscription.productName}
                    </td>
                    <td className="px-5 py-3.5 capitalize font-medium text-slate-700">
                      {subscription.frequency?.toLowerCase()}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-700">
                      {subscription.status === 'CANCELLED' ? '—' : (subscription.nextBillingDate || '—')}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-slate-900">
                      ₹{Number(subscription.recurringAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Wireframe 10 Action Buttons */}
          {canManageSubscriptions && (
            <div className="p-5 bg-slate-50/40 border-t border-slate-100 flex flex-wrap items-center gap-3">
              {subscription.status !== 'CANCELLED' && (
                <button
                  onClick={() => setShowChangeModal(true)}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Modify Subscription
                </button>
              )}

              {subscription.status === 'ACTIVE' && (
                <button
                  onClick={handlePause}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <PauseCircle className="h-3.5 w-3.5" /> Pause Subscription
                </button>
              )}

              {subscription.status === 'PAUSED' && (
                <button
                  onClick={handleResume}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Resume Subscription
                </button>
              )}

              {subscription.status !== 'CANCELLED' && (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-lg border border-rose-400 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" /> Cancel Subscription
                </button>
              )}
            </div>
          )}
        </div>

        {/* Billing Schedules Ledger */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#008784]" /> Billing Schedules & Historical Cycles
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{subscription.schedules?.length || 0} Cycles Logged</span>
          </div>

          {!subscription.schedules || subscription.schedules.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No billing schedules recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-semibold">Billing Period</th>
                    <th className="text-right px-5 py-3 font-semibold">Cycle Amount</th>
                    <th className="text-left px-5 py-3 font-semibold">Prorated</th>
                    <th className="text-left px-5 py-3 font-semibold">Status</th>
                    <th className="text-right px-5 py-3 font-semibold">Invoice Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscription.schedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-800">
                        {sch.billingPeriodStart} → {sch.billingPeriodEnd}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{Number(sch.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5">
                        {sch.isProrated ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Prorated Delta
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Standard</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${SCHEDULE_STATUS_STYLES[sch.status] || SCHEDULE_STATUS_STYLES.SCHEDULED}`}>
                          {sch.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {sch.invoiceId ? (
                          <Link
                            to={`/v1/invoices/${sch.invoiceId}`}
                            className="text-[#008784] font-bold hover:underline inline-flex items-center gap-0.5"
                          >
                            View Invoice <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Credit Notes Ledger */}
        {subscription.creditNotes && subscription.creditNotes.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-white shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50/50">
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Undo2 className="h-3.5 w-3.5 text-amber-700" /> Issued Credit Notes & Proration Refunds
              </h2>
              <span className="text-xs font-bold text-amber-700">{subscription.creditNotes.length} Credit Notes</span>
            </div>

            <div className="divide-y divide-slate-100">
              {subscription.creditNotes.map((cn) => (
                <div key={cn.id} className="p-4 px-5 flex items-center justify-between hover:bg-slate-50/60 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{cn.creditNoteNumber || 'Credit Note'}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">{cn.reason}</p>
                    <p className="text-[10px] text-slate-400">{new Date(cn.issuedAt || cn.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-amber-800 block">
                      ₹{Number(cn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900">
                      {cn.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Change Quantity Modal */}
        {showChangeModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Change Subscription Quantity</h3>
                <button onClick={() => setShowChangeModal(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleChangeQuantity} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Product</label>
                  <input
                    disabled
                    value={subscription.productName}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    New Quantity (Current: {subscription.quantity})
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#008784]/20"
                  />
                </div>

                <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-[11px] space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Automatic Day-Based Proration:
                  </p>
                  <p>
                    Upgrading will apply an immediate supplemental charge for the remaining active days in the current cycle. Downgrading will issue a credit note automatically.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowChangeModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingChange}
                    className="px-4 py-2 rounded-lg bg-[#008784] text-white font-bold hover:bg-[#00706e] disabled:opacity-50"
                  >
                    {submittingChange ? 'Prorating...' : 'Confirm Change'}
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
