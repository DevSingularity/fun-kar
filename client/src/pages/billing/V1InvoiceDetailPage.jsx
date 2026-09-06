import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Receipt,
  IndianRupee,
  ArrowLeft,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  CreditCard,
  Printer,
  Download,
  Building2,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';
import useAuthStore from '../../store/auth.store.js';
import Spinner from '../../components/Spinner.jsx';

const STATUS_STYLES = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  ISSUED: 'bg-blue-50 text-blue-700 border-blue-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  VOID: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function V1InvoiceDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const canRecordPayment = ['FINANCE', 'ADMIN'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [submitting, setSubmitting] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);

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

  const handlePrintPdf = () => {
    window.print();
  };

  const recordPayment = async (e) => {
    e?.preventDefault();
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      toast.error('Enter a valid payment amount greater than zero.');
      return;
    }
    const remaining = Number(invoice.invoice.total) - Number(invoice.invoice.amountPaid);
    if (numAmount > remaining + 0.01) {
      toast.error(`Payment amount cannot exceed remaining balance of ₹${remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/invoices/${id}/payments`, { amount: numAmount, method });
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
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 text-center">
          <Spinner size="lg" variant="primary" />
          <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading invoice details...</p>
        </div>
      </div>
    );
  }

  const remaining = Number(invoice.invoice.total) - Number(invoice.invoice.amountPaid);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans print:bg-white print:p-0">
      <div className="print:hidden">
        <OdooTopNavbar activeTab="Invoices" />
      </div>

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6 print:p-0 print:max-w-none print:w-full">
        
        {/* Back Link & Action Bar */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            to="/v1/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrintView(!showPrintView)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" />
              {showPrintView ? 'Standard View' : 'Formal Tax Invoice View'}
            </button>
            <button
              onClick={handlePrintPdf}
              className="px-4 py-1.5 rounded-lg bg-[#008784] hover:bg-[#00706e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> Generate PDF / Print
            </button>
          </div>
        </div>

        {/* Formal PDF / Printable Tax Invoice Document */}
        {showPrintView ? (
          <div className="rounded-xl border border-slate-300 bg-white p-8 sm:p-12 shadow-sm space-y-8 print:shadow-none print:border-none print:p-0">
            {/* Tax Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-[#714b67] text-white flex items-center justify-center font-black text-sm">
                    DF
                  </div>
                  <span className="font-black text-xl tracking-tight text-slate-900">DealFlow360</span>
                </div>
                <p className="text-xs text-slate-500">Enterprise B2B Sales Operations Platform</p>
                <p className="text-[11px] text-slate-400">GSTIN: 27AABCT3518Q1ZQ · PAN: AABCT3518Q</p>
              </div>

              <div className="text-right space-y-1">
                <span className="text-[10px] font-black tracking-widest text-[#008784] uppercase bg-[#008784]/10 px-2 py-0.5 rounded">
                  TAX INVOICE
                </span>
                <h2 className="text-lg font-black text-slate-900">{invoice.invoice.invoiceNumber}</h2>
                <p className="text-xs text-slate-500">Date: {new Date(invoice.invoice.createdAt).toLocaleDateString()}</p>
                <p className="text-xs text-slate-500">Due: {invoice.invoice.dueDate || 'Immediate'}</p>
              </div>
            </div>

            {/* Billed To & Billed From */}
            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">BILLED TO</span>
                <p className="font-bold text-sm text-slate-900">{invoice.customerName}</p>
                {invoice.customerTier && (
                  <p className="text-slate-500">Enterprise Tier: {invoice.customerTier}</p>
                )}
                <p className="text-slate-500">Order Reference: {invoice.orderNumber || '—'}</p>
              </div>

              <div className="space-y-1 text-right sm:text-left">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">SUPPLIER DETAILS</span>
                <p className="font-bold text-sm text-slate-900">DealFlow Operations Pvt. Ltd.</p>
                <p className="text-slate-500">Level 8, Tech Nexus Tower, Bandra-Kurla Complex</p>
                <p className="text-slate-500">Mumbai, Maharashtra 400051, India</p>
              </div>
            </div>

            {/* Table of Items */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3 font-bold">#</th>
                    <th className="text-left px-5 py-3 font-bold">Item & Description</th>
                    <th className="text-right px-5 py-3 font-bold">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lines.map((l, index) => (
                    <tr key={l.id}>
                      <td className="px-5 py-3.5 text-slate-400 font-mono">{index + 1}</td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">{l.description}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                        ₹{Number(l.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Signatory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 items-start">
              <div className="space-y-2 text-xs text-slate-500 p-4 rounded-lg bg-slate-50 border border-slate-100">
                <p className="font-bold text-slate-700">Bank Transfer Payment Information:</p>
                <p>Account Name: DealFlow Operations Pvt. Ltd.</p>
                <p>Bank: HDFC Bank Ltd, Fort Mumbai Branch</p>
                <p>Account No: 50200084920194</p>
                <p>IFSC Code: HDFC0000060</p>
              </div>

              <div className="space-y-2 text-xs text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>₹{Number(invoice.invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax Total (GST 18%):</span>
                  <span>₹{Number(invoice.invoice.taxTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Total Amount Due:</span>
                  <span>₹{Number(invoice.invoice.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600">
                  <span>Total Amount Paid:</span>
                  <span>₹{Number(invoice.invoice.amountPaid).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-600 pt-1 border-t border-slate-200">
                  <span>Balance Outstanding:</span>
                  <span>₹{remaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Signatory Note */}
            <div className="flex justify-between items-end pt-8 border-t border-slate-200 text-xs text-slate-400">
              <div>
                <p className="text-[10px]">Computer-generated electronic invoice under DealFlow360 platform.</p>
                <p className="text-[10px]">No physical signature required under IT Act 2000.</p>
              </div>
              <div className="text-right">
                <div className="h-10 w-32 border-b border-dashed border-slate-300 ml-auto mb-1 flex items-center justify-center text-[10px] text-slate-300">
                  Authorized Signatory
                </div>
                <p className="font-bold text-slate-700">For DealFlow360</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Standard Interactive Management Card */}
        {!showPrintView && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs p-6 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#008784]" />
                <h1 className="text-xl font-extrabold text-slate-800">
                  Invoice Detail: {invoice.invoice.invoiceNumber} ({invoice.customerName})
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Opened by clicking a row on the Invoices list
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

          {/* Wireframe 13: Order Lifecycle Progress Pipeline */}
          <div className="py-2 px-4 rounded-xl bg-slate-50/80 border border-slate-100">
            <div className="flex items-center justify-between max-w-xl mx-auto py-3">
              
              {/* Step 1: Order Confirmed */}
              <div className="flex flex-col items-center text-center space-y-1">
                <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Order Confirmed</span>
              </div>

              <div className="flex-1 h-0.5 bg-emerald-400 mx-2 -mt-4" />

              {/* Step 2: Shipped */}
              <div className="flex flex-col items-center text-center space-y-1">
                <div className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Shipped</span>
              </div>

              <div className="flex-1 h-0.5 bg-blue-400 mx-2 -mt-4" />

              {/* Step 3: Invoiced */}
              <div className="flex flex-col items-center text-center space-y-1">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-4 ring-blue-100">
                  <Receipt className="h-4 w-4" />
                </div>
                <span className="text-[11px] font-bold text-blue-700">Invoiced</span>
              </div>

              <div className={`flex-1 h-0.5 mx-2 -mt-4 ${invoice.invoice.status === 'PAID' ? 'bg-emerald-400' : 'bg-slate-200'}`} />

              {/* Step 4: Paid */}
              <div className="flex flex-col items-center text-center space-y-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${
                  invoice.invoice.status === 'PAID'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  <CreditCard className="h-4 w-4" />
                </div>
                <span className={`text-[11px] font-bold ${invoice.invoice.status === 'PAID' ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Paid
                </span>
              </div>

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
          {remaining > 0 && canRecordPayment && (
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
        )}
      </main>
    </div>
  );
}
