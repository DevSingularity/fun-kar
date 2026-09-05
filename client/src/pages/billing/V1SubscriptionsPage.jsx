import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Repeat, RefreshCcw, XCircle, Calendar, ArrowUpRight, DollarSign, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1SubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [dueSchedules, setDueSchedules] = useState([]);
  const [actionState, setActionState] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reconciliation/overview');
      setDueSchedules(res.data?.data?.dueSchedules || []);
    } catch (err) {
      console.warn('Subscriptions fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const setBusy = (id, busy) => setActionState((s) => ({ ...s, [id]: busy }));

  const changeQuantity = async (subscriptionLineId, currentQty) => {
    const quantity = window.prompt(`Enter new subscription quantity (current: ${currentQty || 1}):`, currentQty || '2');
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) return;
    
    setBusy(subscriptionLineId, true);
    try {
      const res = await api.post(`/subscriptions/${subscriptionLineId}/change`, { quantity: Number(quantity) });
      const { delta, newCycleAmount } = res.data.data;
      if (delta > 0) {
        toast.success(`Subscription upgraded! Supplemental charge of ₹${delta.toFixed(2)} applied.`);
      } else if (delta < 0) {
        toast.success(`Subscription downgraded! Credit note of ₹${Math.abs(delta).toFixed(2)} issued.`);
      } else {
        toast.success('Subscription quantity updated.');
      }
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not change subscription.');
    } finally {
      setBusy(subscriptionLineId, false);
    }
  };

  const cancelLine = async (subscriptionLineId, productName) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the subscription for "${productName}"? A calculated credit note will be issued for any unused period.`
    );
    if (!confirmed) return;

    setBusy(subscriptionLineId, true);
    try {
      const res = await api.post(`/subscriptions/${subscriptionLineId}/cancel`, {
        reason: 'Customer requested mid-cycle termination',
      });
      const cn = res.data.data.creditNote;
      if (cn && Number(cn.amount) > 0) {
        toast.success(`Subscription cancelled. Credit Note ${cn.creditNoteNumber || ''} for ₹${Number(cn.amount).toFixed(2)} issued.`);
      } else {
        toast.success('Subscription cancelled successfully.');
      }
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not cancel subscription.');
    } finally {
      setBusy(subscriptionLineId, false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Subscriptions" />
      <main className="flex-1 max-w-[1300px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#008784]/10 text-[#008784]">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Recurring Subscriptions & Hybrid Lines</h1>
              <p className="text-xs text-slate-500">
                Automated cadence management, day-based mid-cycle proration, and recurring billing schedules
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-xs text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Recurring Cycles</span>
            <span className="font-bold text-slate-800">{dueSchedules.length} Subscriptions Tracked</span>
          </div>
        </div>

        {/* Subscription Lines Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#008784]" /> Recurring Subscription Billing Cycles
            </h2>
            <button
              onClick={fetchData}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1"
            >
              <RefreshCcw className="h-3 w-3" /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium">Loading subscription lines...</div>
          ) : dueSchedules.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 font-medium space-y-1">
              <Repeat className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-600">No subscription cycles due right now.</p>
              <p className="text-[11px] text-slate-400">
                Convert an approved quotation with SUBSCRIPTION products (e.g. Dedicated Private Cloud Pod) to generate active cycles.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dueSchedules.map((row) => (
                <div
                  key={row.schedule.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">{row.productName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {row.schedule.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" /> {row.customerName}
                      </span>
                      <span>Quote Ref: <strong className="text-slate-700">{row.quoteNumber}</strong></span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        Cycle: {row.schedule.billingPeriodStart} → {row.schedule.billingPeriodEnd}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#008784]">
                      ₹{Number(row.schedule.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / billing period
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={actionState[row.subscriptionLineId]}
                      onClick={() => changeQuantity(row.subscriptionLineId)}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <RefreshCcw className="h-3.5 w-3.5 text-slate-500" /> Change Qty / Prorate
                    </button>
                    <button
                      disabled={actionState[row.subscriptionLineId]}
                      onClick={() => cancelLine(row.subscriptionLineId, row.productName)}
                      className="px-3.5 py-2 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5 text-rose-600" /> Cancel & Credit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
