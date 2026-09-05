import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Send, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Building2, 
  User, 
  Calendar, 
  Percent, 
  Layers, 
  DollarSign,
  Zap,
  Info,
  Award,
  RotateCcw,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';

const STATUS_COLORS = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-300',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 border-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  UNDER_NEGOTIATION: 'bg-blue-100 text-blue-800 border-blue-300',
  CONFIRMED: 'bg-teal-100 text-teal-800 border-teal-300',
  FULFILLING: 'bg-purple-100 text-purple-800 border-purple-300',
  COMPLETED: 'bg-green-100 text-green-800 border-green-300',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-300',
  CANCELLED: 'bg-gray-100 text-gray-700 border-gray-300',
};

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showPdfView, setShowPdfView] = useState(false);

  // New Item Line State
  const [showAddItem, setShowAddItem] = useState(false);
  const [newLine, setNewLine] = useState({
    productId: '',
    quantity: 1,
    discountPct: 0,
  });
  const [addingLine, setAddingLine] = useState(false);

  // Submission Result Modal
  const [submitResult, setSubmitResult] = useState(null);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const [quoteRes, prodRes] = await Promise.all([
        api.get(`/quotations/${id}`),
        api.get('/products', { params: { limit: 100 } }),
      ]);
      setData(quoteRes.data?.data || null);
      const prods = prodRes.data?.data || [];
      setProducts(prods);
      if (prods.length > 0 && !newLine.productId) {
        setNewLine((prev) => ({ ...prev, productId: prods[0].id }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!newLine.productId) {
      toast.error('Please select a product');
      return;
    }
    setAddingLine(true);
    try {
      const res = await api.post(`/quotations/${id}/items`, {
        productId: newLine.productId,
        quantity: Number(newLine.quantity),
        discountPct: Number(newLine.discountPct || 0),
      });
      setData(res.data?.data || null);
      toast.success('Line item added');
      setShowAddItem(false);
      setNewLine({ productId: products[0]?.id || '', quantity: 1, discountPct: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add line item');
    } finally {
      setAddingLine(false);
    }
  };

  const handleUpdateItem = async (itemId, quantity, discountPct) => {
    try {
      const res = await api.patch(`/quotations/${id}/items/${itemId}`, {
        quantity: Number(quantity),
        discountPct: Number(discountPct),
      });
      setData(res.data?.data || null);
      toast.success('Line updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update line');
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await api.delete(`/quotations/${id}/items/${itemId}`);
      setData(res.data?.data || null);
      toast.success('Line item removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove line');
    }
  };

  const handleSubmitQuotation = async () => {
    if (!data?.items || data.items.length === 0) {
      toast.error('Please add at least one line item before submitting');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/quotations/${id}/submit`);
      const resultData = res.data?.data;
      setSubmitResult(resultData);
      setData((prev) => ({
        ...prev,
        quotation: resultData.quotation || resultData,
      }));
      if (resultData?.quotation?.status === 'APPROVED') {
        toast.success('Quotation automatically approved within delegation threshold.');
      } else {
        toast.success('Quotation submitted for multi-tier approval');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawQuotation = async () => {
    setWithdrawing(true);
    try {
      const res = await api.post(`/quotations/${id}/withdraw`);
      setData(res.data?.data || null);
      toast.success('Quotation withdrawn to DRAFT for editing');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw quotation');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-(--app-color-primary)" />
      </div>
    );
  }

  const { quotation, customer, salesRep, items, marginHealth } = data;
  const isDraft = quotation.status === 'DRAFT';
  const isPendingApproval = quotation.status === 'PENDING_APPROVAL';
  const subtotal = Number(quotation.subtotal || 0);
  const discountTotal = Number(quotation.discountTotal || 0);
  const taxTotal = Number(quotation.taxTotal || 0);
  const grandTotal = Number(quotation.grandTotal || 0);
  const marginPct = Number(quotation.estimatedMarginPct || 0);
  const preTaxRevenue = subtotal - discountTotal;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard/quotations')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-(--app-color-border) bg-white text-(--app-color-text-muted) hover:text-(--app-color-text)"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-mono text-lg font-extrabold text-(--app-color-primary)">
                {quotation.quoteNumber}
              </h2>
              <span
                className={`inline-flex rounded-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                  STATUS_COLORS[quotation.status] || 'bg-slate-100 text-slate-700'
                }`}
              >
                {quotation.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-(--app-color-text-muted)">
              Deal created on {new Date(quotation.createdAt).toLocaleDateString()} for {customer.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPdfView(!showPdfView)}
            className="flex items-center gap-1.5 rounded-lg border border-(--app-color-border) bg-white px-3.5 py-2 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated) transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            {showPdfView ? 'Back to Editor' : 'Printable Sheet'}
          </button>

          {isDraft && (
            <button
              onClick={handleSubmitQuotation}
              disabled={submitting || items.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-(--app-color-primary) px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
              {submitting ? 'Evaluating Risk...' : 'Submit for Approval'}
            </button>
          )}

          {isPendingApproval && (
            <button
              onClick={handleWithdrawQuotation}
              disabled={withdrawing}
              className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50 transition-colors shadow-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {withdrawing ? 'Withdrawing...' : 'Withdraw to Draft'}
            </button>
          )}
        </div>
      </div>

      {/* PDF Printable Document Mode */}
      {showPdfView ? (
        <div className="max-w-4xl mx-auto rounded-2xl border border-(--app-color-border) bg-white p-8 shadow-md space-y-6 print:shadow-none print:border-none">
          <div className="flex justify-between items-start pb-6 border-b border-(--app-color-border)">
            <div>
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
                <span className="font-extrabold text-lg tracking-tight text-(--app-color-primary)">
                  DealFlow<span className="text-(--app-color-accent)">360</span>
                </span>
              </div>
              <p className="text-xs text-(--app-color-text-muted) mt-1">Enterprise B2B Quote-to-Cash Platform</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold font-mono text-(--app-color-primary)">{quotation.quoteNumber}</h3>
              <p className="text-xs text-(--app-color-text-muted)">Date: {new Date().toLocaleDateString()}</p>
              <p className="text-xs text-(--app-color-text-muted)">Valid Until: 30 Days from Issue</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-(--app-color-text-muted) block mb-1">Customer Details</span>
              <p className="font-bold text-sm text-(--app-color-text)">{customer.name}</p>
              <p className="text-(--app-color-text-muted)">{customer.email}</p>
              <p className="text-(--app-color-text-muted) mt-1">{customer.billingAddress || 'Corporate Headquarters'}</p>
              <span className="inline-block mt-2 font-bold text-(--app-color-primary)">Customer Tier: {customer.tier}</span>
            </div>
            <div className="text-right">
              <span className="font-bold uppercase tracking-wider text-(--app-color-text-muted) block mb-1">Commercial Terms</span>
              <p><span className="text-(--app-color-text-muted)">Sales Officer:</span> <span className="font-semibold">{salesRep.name}</span></p>
              <p><span className="text-(--app-color-text-muted)">Target Delivery:</span> <span className="font-semibold">{quotation.promisedDeliveryDate || 'Immediate'}</span></p>
              <p><span className="text-(--app-color-text-muted)">Currency:</span> <span className="font-semibold">INR (₹)</span></p>
            </div>
          </div>

          {/* PDF Line Items Table */}
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-800 text-[11px] font-bold uppercase text-slate-800">
                <th className="py-2">Item Description</th>
                <th className="py-2 text-center">Qty</th>
                <th className="py-2 text-right">Unit Price</th>
                <th className="py-2 text-right">Discount</th>
                <th className="py-2 text-right">Tax (18%)</th>
                <th className="py-2 text-right">Net Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--app-color-border)">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2.5">
                    <div className="font-bold">{it.productName}</div>
                    <span className="font-mono text-[10px] text-(--app-color-text-muted)">{it.productSku}</span>
                  </td>
                  <td className="py-2.5 text-center font-medium">{it.quantity} {it.unit}</td>
                  <td className="py-2.5 text-right font-medium">₹{Number(it.unitPrice).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 text-right font-medium">₹{Number(it.discountAmount).toLocaleString('en-IN')} ({Number(it.discountPct)}%)</td>
                  <td className="py-2.5 text-right font-medium">₹{Number(it.taxAmount).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 text-right font-bold">₹{Number(it.lineTotal).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PDF Totals */}
          <div className="flex justify-end pt-4 border-t border-(--app-color-border)">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-(--app-color-text-muted)">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-rose-600">
                <span>Discount Total:</span>
                <span>- ₹{discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-(--app-color-text-muted)">
                <span>GST (Tax):</span>
                <span>₹{taxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t border-slate-800 pt-1 text-(--app-color-text)">
                <span>Grand Total:</span>
                <span className="text-(--app-color-primary)">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Workspace Editor Mode */
        <>
          {/* Header Metadata Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">Customer Account</span>
              <div className="font-bold text-xs text-(--app-color-text) mt-1">{customer.name}</div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                <Award className="h-3 w-3" /> {customer.tier} Tier ({customer.tier === 'GOLD' ? '30%' : customer.tier === 'SILVER' ? '20%' : '10%'} Max)
              </span>
            </div>

            <div className="rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">Assigned Sales Rep</span>
              <div className="font-bold text-xs text-(--app-color-text) mt-1">{salesRep.name}</div>
              <span className="text-[10px] text-(--app-color-text-muted) block mt-1">{salesRep.email}</span>
            </div>

            <div className="rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">Target Delivery Date</span>
              <div className="font-bold text-xs text-(--app-color-text) mt-1">
                {quotation.promisedDeliveryDate ? new Date(quotation.promisedDeliveryDate).toLocaleDateString() : 'Not Specified'}
              </div>
              <span className="text-[10px] text-(--app-color-text-muted) block mt-1">Standard SLA window</span>
            </div>

            <div className="rounded-xl border border-(--app-color-border) bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">Governance Route</span>
              <div className="font-bold text-xs text-(--app-color-text) mt-1">
                {quotation.requiredApprovalLevel || 'NONE'}
              </div>
              <span className="text-[10px] text-(--app-color-text-muted) block mt-1">
                {quotation.requiredApprovalLevel === 'NONE' ? 'Instant Sign-off Eligible' : 'Requires Approval Chain'}
              </span>
            </div>
          </div>

          {/* Live Deal Margin Indicator Banner */}
          <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-(--app-color-border)">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-(--app-color-text)">
                    Live Deal Margin & Real-Time Financials
                  </h3>
                  <p className="text-[11px] text-(--app-color-text-muted)">Real-time profit margin computed over pre-tax revenue</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                  marginHealth === 'HEALTHY'
                    ? 'bg-emerald-100 text-emerald-800'
                    : marginHealth === 'WATCH'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {marginHealth === 'HEALTHY' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {marginHealth} MARGIN ({marginPct}%)
                </span>
              </div>
            </div>

            <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <span className="text-(--app-color-text-muted) block text-[10px] font-bold uppercase">List Subtotal</span>
                <span className="text-sm font-bold text-(--app-color-text)">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-(--app-color-text-muted) block text-[10px] font-bold uppercase">Discount Given</span>
                <span className="text-sm font-bold text-rose-600">- ₹{discountTotal.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-(--app-color-text-muted) block text-[10px] font-bold uppercase">Pre-tax Revenue</span>
                <span className="text-sm font-bold text-teal-800">₹{preTaxRevenue.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-(--app-color-text-muted) block text-[10px] font-bold uppercase">Net Grand Total</span>
                <span className="text-base font-extrabold text-(--app-color-primary)">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table & Editor */}
          <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-(--app-color-border)">
              <h3 className="text-xs font-bold uppercase tracking-wider text-(--app-color-text)">
                Quotation Line Items ({items.length})
              </h3>
              {isDraft && (
                <button
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="flex items-center gap-1 rounded-lg bg-(--app-color-primary) px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:opacity-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Product Line
                </button>
              )}
            </div>

            {/* Add Item Inline Panel */}
            {showAddItem && (
              <form onSubmit={handleAddLine} className="rounded-xl border border-(--app-color-primary)/30 bg-(--app-color-primary-soft)/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-(--app-color-primary) uppercase tracking-wider">
                    Add Product to Quotation
                  </h4>
                  <button type="button" onClick={() => setShowAddItem(false)} className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[10px] font-bold uppercase text-(--app-color-text-muted) mb-1">Product SKU *</label>
                    <select
                      value={newLine.productId}
                      onChange={(e) => setNewLine({ ...newLine, productId: e.target.value })}
                      className="w-full rounded-lg border border-(--app-color-border) bg-white px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} (₹{Number(p.basePrice).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-(--app-color-text-muted) mb-1">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newLine.quantity}
                      onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                      className="w-full rounded-lg border border-(--app-color-border) bg-white px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-(--app-color-text-muted) mb-1">
                      Discount % ({newLine.discountPct}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={newLine.discountPct}
                      onChange={(e) => setNewLine({ ...newLine, discountPct: e.target.value })}
                      className="w-full accent-(--app-color-primary) mt-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddItem(false)}
                    className="rounded-lg border border-(--app-color-border) bg-white px-3 py-1.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingLine}
                    className="rounded-lg bg-(--app-color-primary) px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {addingLine ? 'Adding...' : 'Add Line'}
                  </button>
                </div>
              </form>
            )}

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-(--app-color-border) bg-(--app-color-surface-elevated)/70 text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
                  <tr>
                    <th className="px-3 py-2.5">Product & SKU</th>
                    <th className="px-3 py-2.5 text-center">Type</th>
                    <th className="px-3 py-2.5 text-right">Unit Price</th>
                    <th className="px-3 py-2.5 text-center">Qty</th>
                    <th className="px-3 py-2.5 text-right">Allowed Cap</th>
                    <th className="px-3 py-2.5 text-right">Discount</th>
                    <th className="px-3 py-2.5 text-right">Tax (18%)</th>
                    <th className="px-3 py-2.5 text-right">Line Total</th>
                    {isDraft && <th className="px-3 py-2.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--app-color-border)">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-3 py-8 text-center text-xs text-(--app-color-text-muted)">
                        No products added yet. Click "+ Add Product Line" above.
                      </td>
                    </tr>
                  ) : (
                    items.map((it) => (
                      <tr key={it.id} className="hover:bg-(--app-color-surface-elevated)/30">
                        <td className="px-3 py-3">
                          <div className="font-bold text-(--app-color-text)">{it.productName}</div>
                          <span className="font-mono text-[10px] text-(--app-color-primary) font-semibold">{it.productSku}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase bg-slate-100 text-slate-700">
                            {it.productType}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium">
                          ₹{Number(it.unitPrice).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-3 text-center font-bold">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="px-3 py-3 text-right text-(--app-color-text-muted) font-semibold">
                          {Number(it.allowedDiscountPct)}%
                        </td>
                        <td className="px-3 py-3 text-right font-extrabold text-rose-600">
                          - ₹{Number(it.discountAmount).toLocaleString('en-IN')} ({Number(it.discountPct)}%)
                        </td>
                        <td className="px-3 py-3 text-right text-(--app-color-text-muted)">
                          ₹{Number(it.taxAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-(--app-color-text)">
                          ₹{Number(it.lineTotal).toLocaleString('en-IN')}
                        </td>
                        {isDraft && (
                          <td className="px-3 py-3 text-right">
                            <button
                              onClick={() => handleDeleteItem(it.id)}
                              className="text-rose-500 hover:text-rose-700 transition-colors p-1"
                              title="Delete Line"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submission Result Callout Modal */}
          {submitResult && (
            <div className="rounded-xl border border-teal-300 bg-teal-50/50 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-teal-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                  Governance Engine Evaluation Complete
                </h4>
              </div>
              <p className="text-xs text-teal-950 font-medium">
                Quotation state updated to <span className="font-extrabold uppercase">{submitResult.quotation?.status}</span>.
                Required approval level: <span className="font-extrabold">{submitResult.quotation?.requiredApprovalLevel}</span>.
              </p>
              {submitResult.riskEvaluation?.explanations && (
                <ul className="list-disc pl-5 text-xs text-teal-900 space-y-0.5">
                  {submitResult.riskEvaluation.explanations.map((exp, i) => (
                    <li key={i}>{exp}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
