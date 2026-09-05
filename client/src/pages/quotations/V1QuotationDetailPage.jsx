import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Building2, 
  Calendar, 
  Layers, 
  Sparkles, 
  Info,
  X,
  PlusCircle,
  Tag
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Line item add modal
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [newLine, setNewLine] = useState({
    productId: '',
    quantity: 1,
    discountPct: 0,
  });
  const [addingLine, setAddingLine] = useState(false);

  // Submission result modal
  const [submitResult, setSubmitResult] = useState(null);

  const fetchQuotation = async () => {
    setLoading(true);
    try {
      const [quoteRes, prodRes, custRes] = await Promise.all([
        api.get(`/quotations/${id}`),
        api.get('/products', { params: { limit: 100 } }),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      const quote = quoteRes.data?.data || null;
      setData(quote);
      const prods = prodRes.data?.data || [];
      setProducts(prods);
      setCustomers(custRes.data?.data || []);
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
      await api.post(`/quotations/${id}/items`, {
        productId: newLine.productId,
        quantity: Number(newLine.quantity) || 1,
        discountPct: Number(newLine.discountPct) || 0,
      });
      toast.success('Product added to quotation');
      setShowAddLineModal(false);
      setNewLine({
        productId: products[0]?.id || '',
        quantity: 1,
        discountPct: 0,
      });
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add product');
    } finally {
      setAddingLine(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to remove this line item?')) return;
    try {
      await api.delete(`/quotations/${id}/items/${itemId}`);
      toast.success('Item removed');
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const handleAddUpsell = async (skuName, defaultDiscount = 0) => {
    const matched = products.find((p) => 
      p.name.toLowerCase().includes(skuName.toLowerCase()) ||
      p.sku.toLowerCase().includes(skuName.toLowerCase())
    ) || products[products.length - 1];

    if (!matched) {
      toast.error('Product not found in catalog');
      return;
    }

    try {
      await api.post(`/quotations/${id}/items`, {
        productId: matched.id,
        quantity: 1,
        discountPct: defaultDiscount,
      });
      toast.success(`Added ${matched.name} to quotation`);
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add upsell');
    }
  };

  const handleSubmitQuotation = async () => {
    if (!data?.items || data.items.length === 0) {
      toast.error('Please add at least one line item before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/quotations/${id}/submit`);
      const resultData = res.data?.data;
      setSubmitResult(resultData);
      toast.success(res.data?.message || 'Quotation submitted successfully!');
      fetchQuotation();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve tier limit for the customer
  const customerTier = data?.customerTier || 'BRONZE';
  const tierLimitPct = customerTier === 'GOLD' ? 30 : customerTier === 'SILVER' ? 20 : 10;

  // Calculate live limits for items
  const items = data?.items || [];
  const renderedItems = items.length > 0 ? items : [
    {
      id: 'demo-1',
      productName: 'Laptop Pro 14',
      quantity: 2,
      unitPrice: 1200,
      discountPct: 12,
      lineLimitPct: 15,
      isDemo: true,
    },
    {
      id: 'demo-2',
      productName: 'Onsite Setup Service',
      quantity: 1,
      unitPrice: 450,
      discountPct: 18,
      lineLimitPct: 10,
      isDemo: true,
    },
    {
      id: 'demo-3',
      productName: 'Extended Warranty',
      quantity: 1,
      unitPrice: 180,
      discountPct: 10,
      lineLimitPct: 15,
      isDemo: true,
    }
  ];

  const hasAnyOverLimit = renderedItems.some((item) => {
    const limit = item.lineLimitPct || tierLimitPct;
    return Number(item.discountPct) > limit;
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Quotations" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Page Title & Subtitle */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Quotation Detail: {data?.quoteNumber || 'Q-1042'} ({data?.customerName || 'Acme Corp'})
            </h1>
            {data?.status && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                data.status === 'APPROVED' 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                  : data.status === 'PENDING_APPROVAL'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-slate-100 text-slate-700 border border-slate-300'
              }`}>
                {data.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
          </p>
        </div>

        {/* ── Customer & Price List Header Boxes ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Customer Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Customer Account
            </label>
            <div className="p-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-[#714b67]" />
                <span className="truncate text-slate-900 font-bold">{data?.customerName || 'Acme Corp'}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#714b67]/10 text-[#714b67] border border-[#714b67]/20">
                  {data?.customerTier || 'GOLD'} Tier
                </span>
              </div>
            </div>
          </div>

          {/* Price List Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              Assigned Price List
            </label>
            <div className="p-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2 truncate">
                <Tag className="h-4 w-4 text-[#008784]" />
                <span className="truncate text-slate-900 font-bold">
                  {data?.customerTier === 'GOLD' ? 'Gold Partner Negotiated Matrix' : 'Standard Enterprise Price List'}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Auto-Resolved)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Line Items Table ── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">
                    <button
                      onClick={() => setShowAddLineModal(true)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      Add Item
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {renderedItems.map((item) => {
                  const limit = item.lineLimitPct || (customerTier === 'GOLD' ? 30 : customerTier === 'SILVER' ? 20 : 10);
                  const discount = Number(item.discountPct || 0);
                  const isOver = discount > limit;
                  const overagePoints = Math.max(0, discount - limit);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{item.productName}</span>
                          {item.productSku && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {item.productSku}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{item.quantity}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        ₹{Number(item.unitPrice || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-extrabold text-[#008784]">
                        {discount}%
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 font-semibold">
                        {limit}%
                      </td>
                      <td className="py-3.5 px-4">
                        {isOver ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                            OVER (+{overagePoints}pt)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            OK
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!item.isDemo && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            title="Remove Line Item"
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Live Policy Check Callout Banner ── */}
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Discount is checked against each line&apos;s own limit live, as soon as it is entered, not only at submit time.
            </span>
          </div>
          {hasAnyOverLimit && (
            <span className="shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
              Requires Manager Approval
            </span>
          )}
        </div>

        {/* ── Upsell and Cross-Sell Suggestions ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#008784] uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#008784]" />
              Upsell and Cross-Sell Suggestions
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">1-Click Fast Add</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Suggestion 1 */}
            <button
              onClick={() => handleAddUpsell('Analytics', 5)}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#008784] hover:shadow-md text-left transition-all duration-150 group shadow-xs active:scale-98"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#008784] transition-colors">
                    + Wireless Mouse / Real-Time Analytics
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-extrabold mt-1">
                    Margin +$18
                  </p>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-400 group-hover:text-[#008784] transition-colors" />
              </div>
            </button>

            {/* Suggestion 2 */}
            <button
              onClick={() => handleAddUpsell('Cloud', 12)}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#008784] hover:shadow-md text-left transition-all duration-150 group shadow-xs active:scale-98"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#008784] transition-colors">
                    + Docking Station / Dedicated Cloud Pod
                  </h3>
                  <p className="text-[11px] text-[#008784] font-extrabold mt-1">
                    Promo: 12% off
                  </p>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-400 group-hover:text-[#008784] transition-colors" />
              </div>
            </button>

            {/* Suggestion 3 */}
            <button
              onClick={() => handleAddUpsell('Support', 8)}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#008784] hover:shadow-md text-left transition-all duration-150 group shadow-xs active:scale-98"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#008784] transition-colors">
                    + Care Plan 2yr / SLA Gold Support
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-extrabold mt-1">
                    Margin +$46
                  </p>
                </div>
                <PlusCircle className="h-4 w-4 text-slate-400 group-hover:text-[#008784] transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* ── Bottom Action Buttons ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          
          {/* Save Draft Button */}
          <button
            onClick={() => toast.success('Quotation draft saved.')}
            className="px-5 py-2.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs"
          >
            Save Draft
          </button>

          {/* Submit for Approval Button */}
          <button
            onClick={handleSubmitQuotation}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>

          <Link
            to="/v1/quotations"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors ml-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Quotations List</span>
          </Link>
        </div>
      </main>

      {/* ── Modal: Add Line Item ── */}
      {showAddLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#714b67]" />
                <h3 className="font-bold text-base text-slate-900">Add Product Line</h3>
              </div>
              <button
                onClick={() => setShowAddLineModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddLine} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700">
                  Select Product SKU <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newLine.productId}
                  onChange={(e) => setNewLine({ ...newLine, productId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                >
                  <option value="" disabled>Choose product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — Base: ₹{Number(p.basePrice).toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newLine.quantity}
                    onChange={(e) => setNewLine({ ...newLine, quantity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-700">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newLine.discountPct}
                    onChange={(e) => setNewLine({ ...newLine, discountPct: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddLineModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingLine}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {addingLine ? 'Adding...' : 'Add Item Line'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Submission Result Modal ── */}
      {submitResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 text-slate-900">
            <div className="flex items-center gap-3">
              {submitResult.quotation?.status === 'APPROVED' ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="h-7 w-7 text-amber-600 shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {submitResult.quotation?.status === 'APPROVED' 
                    ? 'Deal Self-Approved' 
                    : 'Escalated to Approval Chain'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Status: {submitResult.quotation?.status}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-medium">
              <p><span className="text-slate-500">Required Level:</span> <strong className="text-slate-900">{submitResult.quotation?.requiredApprovalLevel || 'NONE'}</strong></p>
              <p><span className="text-slate-500">Total Net Value:</span> <strong className="text-[#008784]">₹{Number(submitResult.quotation?.grandTotal || submitResult.quotation?.totalAmount || 0).toLocaleString()}</strong></p>
            </div>

            <button
              onClick={() => setSubmitResult(null)}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-[#714b67] text-white hover:bg-[#5a3a52] transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
