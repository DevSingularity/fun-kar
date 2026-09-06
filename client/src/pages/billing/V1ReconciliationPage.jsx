import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ClipboardCheck,
  AlertTriangle,
  FileWarning,
  Undo2,
  Calendar,
  CheckCircle2,
  Receipt,
  ArrowUpRight,
  TrendingDown,
  RefreshCcw,
} from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';
import Spinner from '../../components/Spinner.jsx';

export default function V1ReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [invoicing, setInvoicing] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reconciliation/overview');
      setData(res.data?.data || null);
    } catch (err) {
      console.warn('Reconciliation fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInvoiceSchedule = async (scheduleId) => {
    setInvoicing((s) => ({ ...s, [scheduleId]: true }));
    try {
      const res = await api.post(`/billing-schedules/${scheduleId}/invoice`);
      const invNum = res.data?.data?.invoice?.invoiceNumber || 'New Invoice';
      toast.success(`Recurring billing cycle reconciled! Issued as ${invNum}.`);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Could not issue invoice for schedule.');
    } finally {
      setInvoicing((s) => ({ ...s, [scheduleId]: false }));
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
        <OdooTopNavbar activeTab="Reconciliation" />
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading billing reconciliation ledger...</p>
        </div>
      </div>
    );
  }

  const dueSchedules = data.dueSchedules || [];
  const overdueInvoices = data.overdueInvoices || [];
  const unappliedCreditNotes = data.unappliedCreditNotes || [];
  const summary = data.summary || {
    dueScheduleCount: dueSchedules.length,
    dueScheduleTotal: 0,
    overdueInvoiceCount: overdueInvoices.length,
    overdueInvoiceTotal: 0,
    unappliedCreditTotal: 0,
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Reconciliation" />
      <main className="flex-1 max-w-[1300px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#008784]/10 text-[#008784]">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Finance Billing &amp; Reconciliation Ledger</h1>
              <p className="text-xs text-slate-500">
                Cross-reference due recurring schedules, overdue commercial receivables, and issued credit notes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Calendar className="h-3.5 w-3.5 text-slate-400" /> Ledger As of: <strong className="text-slate-800">{data.asOfDate || new Date().toISOString().split('T')[0]}</strong>
            <button
              onClick={fetchData}
              className="ml-2 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
              title="Refresh ledger"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3 Overview Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Due Billing Cycles</span>
              <FileWarning className="h-4 w-4 text-[#008784]" />
            </div>
            <p className="text-2xl font-black text-slate-800">{summary.dueScheduleCount ?? dueSchedules.length}</p>
            <p className="text-xs font-semibold text-[#008784]">
              ₹{Number(summary.dueScheduleTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ready to invoice
            </p>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-rose-600 font-bold uppercase tracking-wider">Overdue Invoices</span>
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-700">{summary.overdueInvoiceCount ?? overdueInvoices.length}</p>
            <p className="text-xs font-semibold text-rose-600">
              ₹{Number(summary.overdueInvoiceTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} outstanding receivables
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">Unapplied Credit Notes</span>
              <Undo2 className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-800">{unappliedCreditNotes.length}</p>
            <p className="text-xs font-semibold text-amber-700">
              ₹{Number(summary.unappliedCreditTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} customer credits
            </p>
          </div>
        </div>

        {/* Section 1: Due Cycles */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-[#008784]" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Recurring Cycles Ready to Invoice
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-500">{dueSchedules.length} Due</span>
          </div>

          {dueSchedules.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
              All recurring subscription schedules are currently reconciled.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dueSchedules.map((row) => (
                <div key={row.schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 px-5 hover:bg-slate-50/70 gap-3 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{row.productName}</span>
                      <span className="text-[10px] text-slate-500 font-medium">· {row.customerName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Quote {row.quoteNumber} · Cycle Period: {row.schedule.billingPeriodStart} to {row.schedule.billingPeriodEnd}
                    </p>
                    <p className="text-xs font-bold text-[#008784]">
                      Amount: ₹{Number(row.schedule.amount || row.schedule.scheduledAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button
                    disabled={invoicing[row.schedule.id]}
                    onClick={() => handleInvoiceSchedule(row.schedule.id)}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-[#008784] text-white hover:bg-[#00706e] transition-colors shadow-xs disabled:opacity-50 shrink-0"
                  >
                    {invoicing[row.schedule.id] ? 'Issuing...' : 'Issue Invoice for This Cycle'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Overdue Invoices */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-rose-50/40">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <h2 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                Overdue Receivables
              </h2>
            </div>
            <span className="text-[11px] font-bold text-rose-700">{overdueInvoices.length} Overdue</span>
          </div>

          {overdueInvoices.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
              <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-emerald-500" />
              No commercial invoices are currently overdue.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {overdueInvoices.map((row) => (
                <div key={row.invoice.id} className="flex items-center justify-between p-4 px-5 hover:bg-slate-50/70 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{row.invoice.invoiceNumber}</span>
                    <span className="text-slate-500 ml-2">({row.customerName})</span>
                    <p className="text-[10px] text-slate-400">Order: {row.orderNumber} · Due: {row.invoice.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-rose-600">
                      ₹{(Number(row.invoice.total || 0) - Number(row.invoice.amountPaid || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })} overdue
                    </span>
                    <Link
                      to={`/v1/invoices/${row.invoice.id}`}
                      className="text-[#008784] font-bold hover:underline inline-flex items-center gap-0.5 text-xs"
                    >
                      Collect <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Unapplied Credit Notes */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-amber-50/40">
            <div className="flex items-center gap-2">
              <Undo2 className="h-4 w-4 text-amber-600" />
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Unapplied Credit Notes
              </h2>
            </div>
            <span className="text-[11px] font-bold text-amber-700">{unappliedCreditNotes.length} Credit Notes</span>
          </div>

          {unappliedCreditNotes.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
              No unapplied credit notes in ledger.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {unappliedCreditNotes.map((row) => (
                <div key={row.creditNote.id} className="flex items-center justify-between p-4 px-5 hover:bg-slate-50/70 text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{row.creditNote.creditNoteNumber || 'Credit Note'}</span>
                    <span className="text-slate-500 ml-2">({row.customerName} · {row.productName})</span>
                    <p className="text-[10px] text-slate-400">{row.creditNote.reason || 'Mid-cycle subscription modification'}</p>
                  </div>
                  <span className="font-bold text-amber-700">
                    ₹{Number(row.creditNote.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
