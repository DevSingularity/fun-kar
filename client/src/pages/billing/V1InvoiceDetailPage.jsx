import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Receipt, IndianRupee, ArrowLeft, Calendar, User, FileText, CheckCircle2, CreditCard } from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOID: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function V1InvoiceDetailPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data?.data || null);
    } catch (err) {
      console.warn('Invoice detail fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const recordPayment = async (e) => {
    e?.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid payment amount.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/invoices/${id}/payments`, { amount, method });
      toast.success('Payment recorded successfully.');
      setAmount('');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !invoice) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
        <OdooTopNavbar activeTab="Invoices" />
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-medium">
          Loading invoice details...
        </div>
      </div>
    );
  }

  const remaining = Number(invoice.invoice.total) - Number(invoice.invoice.amountPaid);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Invoices" />
      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Back Link */}
        <Link
          to="/v1/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>

        {/* Invoice Card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs p-6 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#008784]" />
                <h1 className="text-xl font-extrabold text-slate-800">{invoice.invoice.invoiceNumber}</h1>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Created on {new Date(invoice.invoice.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase border ${STATUS_STYLES[invoice.invoice.status] || STATUS_STYLES.DRAFT}`}>
                {invoice.invoice.status.replace('_', ' ')}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-slate-100 text-slate-600">
                {invoice.invoice.invoiceType}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Customer</span>
              <p className="font-bold text-slate-800">{invoice.customerName}</p>
              {invoice.customerTier && (
                <span className="text-[10px] font-semibold text-slate-500">{invoice.customerTier} Tier</span>
              )}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Order Number</span>
              <p className="font-bold text-slate-800">{invoice.orderNumber || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Due Date</span>
              <p className="font-bold text-slate-800">{invoice.invoice.dueDate || 'Immediate'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Issued At</span>
              <p className="font-bold text-slate-800">
                {invoice.invoice.issuedAt ? new Date(invoice.invoice.issuedAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Invoice Lines</h3>
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">Description</th>
                    <th className="text-right px-4 py-2.5 font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">{l.description}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-800">
                        ₹{Number(l.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{Number(invoice.invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax Total</span>
                <span>₹{Number(invoice.invoice.taxTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-800 pt-2 border-t border-slate-100">
                <span>Grand Total</span>
                <span>₹{Number(invoice.invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>Amount Paid</span>
                <span>₹{Number(invoice.invoice.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-slate-100">
                <span>Balance Due</span>
                <span>₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Record Payment Form */}
          {remaining > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-[#008784]" /> Record Payment
              </h3>
              <form onSubmit={recordPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Max ₹${remaining.toFixed(2)}`}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008784]/30"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008784]/30"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CARD">Corporate Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-[#008784] text-white text-xs font-bold hover:bg-[#00706e] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-1.5 h-[34px]"
                >
                  <IndianRupee className="h-3.5 w-3.5" /> Record Payment
                </button>
              </form>
            </div>
          )}

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Payment Transaction History</h3>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-slate-50/50 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{p.method.replace('_', ' ')}</span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(p.paymentDate || p.createdAt).toLocaleString()} · Ref: {p.referenceNumber || p.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-600 block">
                        +₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
