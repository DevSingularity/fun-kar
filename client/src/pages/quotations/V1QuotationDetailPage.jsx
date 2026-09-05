import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Building2, 
  ArrowLeft,
  Sparkles, 
  Info,
  X,
  PlusCircle,
  Tag,
  Save,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const isNew = id === 'new';

  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Data lists
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Quotation header state
  const [quoteData, setQuoteData] = useState(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [promisedDeliveryDate, setPromisedDeliveryDate] = useState('');

  // Line items state
  const [items, setItems] = useState([]);

  // Line item add modal
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [newLine, setNewLine] = useState({
    productId: '',
    quantity: 1,
    discountPct: 0,
  });
  const [addingLine, setAddingLine] = useState(false);

  // Delete confirmation modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, itemId: null, itemName: '' });
  const [deletingLine, setDeletingLine] = useState(false);

  // Submission result modal
  const [submitResult, setSubmitResult] = useState(null);

  // Debounce ref for persisting item edits to backend
  const patchTimerRef = useRef({});

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, custRes] = await Promise.all([
        api.get('/products', { params: { limit: 100 } }),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      const prods = prodRes.data?.data || [];
      const custs = custRes.data?.data || [];
      setProducts(prods);
      setCustomers(custs);

      if (isNew) {
        const defaultCust = custs[0] || null;
        setSelectedCustomerId(defaultCust?.id || '');
        setQuoteData({
          id: 'new',
          quoteNumber: 'New Draft',
          status: 'DRAFT',
          customerName: defaultCust?.name || 'Select Customer',
          customerTier: defaultCust?.tier || 'BRONZE',
        });
        // Default with 1 starter item if catalog is available
        if (prods.length > 0) {
          const firstProd = prods[0];
          setItems([
            {
              id: 'temp-' + Date.now(),
              productId: firstProd.id,
              productName: firstProd.name,
              sku: firstProd.sku,
              quantity: 2,
              unitPrice: Number(firstProd.basePrice || 0),
              discountPct: 25,
              lineLimitPct: 10,
              isLocal: true,
            },
          ]);
        } else {
          setItems([]);
        }
      } else {
        const quoteRes = await api.get(`/quotations/${id}`);
        const quote = quoteRes.data?.data;
        if (!quote) throw new Error('Quotation not found');
        setQuoteData(quote);
        setSelectedCustomerId(quote.customerId || '');
        setPromisedDeliveryDate(quote.promisedDeliveryDate ? quote.promisedDeliveryDate.slice(0, 10) : '');
        setItems(quote.items || []);
      }

      if (prods.length > 0 && !newLine.productId) {
        setNewLine((prev) => ({ ...prev, productId: prods[0].id }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // Selected customer metadata
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const customerTier = selectedCustomer?.tier || quoteData?.customerTier || 'BRONZE';
  const customerName = selectedCustomer?.name || quoteData?.customerName || 'Customer';

  // Dynamic Tier Limit & Price List
  const tierLimitPct = customerTier === 'GOLD' ? 30 : customerTier === 'SILVER' ? 20 : 10;
  const assignedPriceList = customerTier === 'GOLD' 
    ? 'Gold Partner Negotiated Matrix' 
    : customerTier === 'SILVER' 
    ? 'Silver Preferential Matrix' 
    : 'Standard Enterprise Price List';

  const isDraft = !quoteData?.status || quoteData?.status === 'DRAFT';

  // Handle Customer Account Change
  const handleCustomerChange = async (newCustId) => {
    setSelectedCustomerId(newCustId);
    const newCust = customers.find((c) => c.id === newCustId);
    if (!newCust) return;

    setQuoteData((prev) => ({
      ...prev,
      customerId: newCustId,
      customerName: newCust.name,
      customerTier: newCust.tier,
    }));

    if (!isNew && quoteData?.id) {
      try {
        await api.patch(`/quotations/${quoteData.id}`, { customerId: newCustId });
        toast.success(`Updated customer to ${newCust.name} (${newCust.tier} Tier)`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update quotation customer');
      }
    }
  };

  // Handle inline changes for quantity and discount
  const handleItemFieldChange = (itemId, field, value) => {
    const numVal = field === 'quantity' ? Math.max(1, parseInt(value) || 1) : Math.min(100, Math.max(0, parseFloat(value) || 0));

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id !== itemId) return item;
        return { ...item, [field]: numVal };
      })
    );

    // If existing persistent quotation, debounce update to backend
    if (!isNew && quoteData?.id && !String(itemId).startsWith('temp-')) {
      if (patchTimerRef.current[itemId]) {
        clearTimeout(patchTimerRef.current[itemId]);
      }
      patchTimerRef.current[itemId] = setTimeout(async () => {
        try {
          await api.patch(`/quotations/${quoteData.id}/items/${itemId}`, {
            [field]: numVal,
          });
        } catch (err) {
          console.warn('Auto-save item error:', err);
        }
      }, 500);
    }
  };

  // Check if any line discount exceeds allowed limit
  const hasAnyOverLimit = items.some((item) => {
    const limit = item.lineLimitPct || tierLimitPct;
    return Number(item.discountPct) > limit;
  });

  // Add Item to Quotation
  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!newLine.productId) {
      toast.error('Please select a product');
      return;
    }

    const prod = products.find((p) => p.id === newLine.productId);
    if (!prod) return;

    const qty = Number(newLine.quantity) || 1;
    const disc = Number(newLine.discountPct) || 0;

    if (isNew) {
      setItems((prev) => [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          quantity: qty,
          unitPrice: Number(prod.basePrice || 0),
          discountPct: disc,
          lineLimitPct: tierLimitPct,
          isLocal: true,
        },
      ]);
      toast.success(`Added ${prod.name}`);
      setShowAddLineModal(false);
      setNewLine({ productId: products[0]?.id || '', quantity: 1, discountPct: 0 });
    } else {
      setAddingLine(true);
      try {
        await api.post(`/quotations/${id}/items`, {
          productId: prod.id,
          quantity: qty,
          discountPct: disc,
        });
        toast.success(`Added ${prod.name} to quotation`);
        setShowAddLineModal(false);
        setNewLine({ productId: products[0]?.id || '', quantity: 1, discountPct: 0 });
        const quoteRes = await api.get(`/quotations/${id}`);
        setQuoteData(quoteRes.data?.data);
        setItems(quoteRes.data?.data?.items || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to add product');
      } finally {
        setAddingLine(false);
      }
    }
  };

  // 1-Click Add Upsell SKU
  const handleAddUpsell = async (skuName, defaultDiscount = 0) => {
    const matched = products.find((p) => 
      p.name.toLowerCase().includes(skuName.toLowerCase()) ||
      p.sku.toLowerCase().includes(skuName.toLowerCase())
    ) || products[products.length - 1];

    if (!matched) {
      toast.error('Product not found in catalog');
      return;
    }

    if (isNew) {
      setItems((prev) => [
        ...prev,
        {
          id: 'temp-' + Date.now(),
          productId: matched.id,
          productName: matched.name,
          sku: matched.sku,
          quantity: 1,
          unitPrice: Number(matched.basePrice || 0),
          discountPct: defaultDiscount,
          lineLimitPct: tierLimitPct,
          isLocal: true,
        },
      ]);
      toast.success(`Added ${matched.name}`);
    } else {
      try {
        await api.post(`/quotations/${id}/items`, {
          productId: matched.id,
          quantity: 1,
          discountPct: defaultDiscount,
        });
        toast.success(`Added ${matched.name} to quotation`);
        const quoteRes = await api.get(`/quotations/${id}`);
        setQuoteData(quoteRes.data?.data);
        setItems(quoteRes.data?.data?.items || []);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to add upsell');
      }
    }
  };

  // Delete line item
  const confirmDeleteItem = async () => {
    if (!deleteModal.itemId) return;

    if (isNew || String(deleteModal.itemId).startsWith('temp-')) {
      setItems((prev) => prev.filter((it) => it.id !== deleteModal.itemId));
      toast.success('Line item removed');
      setDeleteModal({ open: false, itemId: null, itemName: '' });
      return;
    }

    setDeletingLine(true);
    try {
      await api.delete(`/quotations/${id}/items/${deleteModal.itemId}`);
      toast.success('Line item removed successfully');
      setDeleteModal({ open: false, itemId: null, itemName: '' });
      const quoteRes = await api.get(`/quotations/${id}`);
      setQuoteData(quoteRes.data?.data);
      setItems(quoteRes.data?.data?.items || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    } finally {
      setDeletingLine(false);
    }
  };

  // Save Draft handler
  const handleSaveDraft = async () => {
    if (!selectedCustomerId) {
      toast.error('Please select a customer account');
      return;
    }

    setSavingDraft(true);
    try {
      if (isNew) {
        // 1. Create quotation header
        const res = await api.post('/quotations', {
          customerId: selectedCustomerId,
          promisedDeliveryDate: promisedDeliveryDate || undefined,
        });
        const createdQuote = res.data?.data?.quotation || res.data?.data;
        const newId = createdQuote.id;

        // 2. Add all configured line items
        for (const it of items) {
          await api.post(`/quotations/${newId}/items`, {
            productId: it.productId,
            quantity: Number(it.quantity) || 1,
            discountPct: Number(it.discountPct) || 0,
          });
        }

        toast.success(`Quotation ${createdQuote.quoteNumber || 'Draft'} created & saved!`);
        navigate(`/v1/quotations/${newId}`, { replace: true });
      } else {
        // Update header fields
        await api.patch(`/quotations/${id}`, {
          customerId: selectedCustomerId,
          promisedDeliveryDate: promisedDeliveryDate || null,
        });
        toast.success('Quotation draft saved.');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft quotation');
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit for Approval handler
  const handleSubmitQuotation = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one line item before submitting.');
      return;
    }

    if (!selectedCustomerId) {
      toast.error('Please select a customer account');
      return;
    }

    setSubmitting(true);
    try {
      let targetId = id;

      if (isNew) {
        // Save first
        const res = await api.post('/quotations', {
          customerId: selectedCustomerId,
          promisedDeliveryDate: promisedDeliveryDate || undefined,
        });
        const createdQuote = res.data?.data?.quotation || res.data?.data;
        targetId = createdQuote.id;

        for (const it of items) {
          await api.post(`/quotations/${targetId}/items`, {
            productId: it.productId,
            quantity: Number(it.quantity) || 1,
            discountPct: Number(it.discountPct) || 0,
          });
        }
      }

      // Submit
      const submitRes = await api.post(`/quotations/${targetId}/submit`);
      const resultData = submitRes.data?.data;
      setSubmitResult(resultData);
      toast.success(submitRes.data?.message || 'Quotation submitted successfully!');

      if (isNew) {
        navigate(`/v1/quotations/${targetId}`, { replace: true });
      } else {
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Withdraw Quotation (from PENDING_APPROVAL back to DRAFT)
  const handleWithdrawQuotation = async () => {
    setWithdrawing(true);
    try {
      await api.post(`/quotations/${id}/withdraw`);
      toast.success('Quotation withdrawn to DRAFT for editing');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to withdraw quotation');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <OdooTopNavbar activeTab="Quotations" />
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-16 text-center">
          <p className="text-xs font-semibold text-slate-400">Loading quotation details...</p>
        </main>
      </div>
    );
  }

  if (!quoteData && !isNew) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <OdooTopNavbar activeTab="Quotations" />
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-16 text-center space-y-4">
          <p className="text-sm font-bold text-slate-700">Quotation not found</p>
          <Link
            to="/v1/quotations"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] text-white"
          >
            ← Return to Quotations List
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Quotations" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Quotation Header Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Quotation Detail: {quoteData?.quoteNumber || (isNew ? 'New Draft' : 'Quotation')} ({customerName})
          </h1>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
            quoteData?.status === 'APPROVED' 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
              : quoteData?.status === 'PENDING_APPROVAL'
              ? 'bg-amber-100 text-amber-800 border border-amber-300'
              : 'bg-slate-100 text-slate-700 border border-slate-300'
          }`}>
            {(quoteData?.status || 'DRAFT').replace('_', ' ')}
          </span>
        </div>

        {/* ── Customer & Price List Dynamic Header Boxes ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Customer Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Customer Account</span>
              {isDraft && <span className="text-[10px] font-semibold text-[#714b67]">Editable</span>}
            </label>

            {isDraft ? (
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-[#714b67]" />
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full pl-10 pr-24 py-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all shadow-xs cursor-pointer appearance-none"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.tier} Tier ({c.country || 'Global'})
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#714b67]/10 text-[#714b67] border border-[#714b67]/20">
                    {customerTier} Tier
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="h-4 w-4 text-[#714b67]" />
                  <span className="truncate text-slate-900 font-bold">{customerName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#714b67]/10 text-[#714b67] border border-[#714b67]/20">
                    {customerTier} Tier
                  </span>
                </div>
              </div>
            )}
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
                  {assignedPriceList}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Auto-Resolved)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dynamic Editable Line Items Table ── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4 w-28">Qty</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 w-32">Discount</th>
                  <th className="py-3 px-4">Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">
                    {isDraft && (
                      <button
                        onClick={() => setShowAddLineModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Add Item
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No line items configured. Click &quot;+ Add Item&quot; or select an upsell SKU below.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const lineLimit = item.lineLimitPct || tierLimitPct;
                    const isOverLimit = Number(item.discountPct) > lineLimit;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        {/* Product SKU / Title */}
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.productName || item.sku || 'Product Item'}
                        </td>

                        {/* Editable Quantity */}
                        <td className="py-3 px-4">
                          {isDraft ? (
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemFieldChange(item.id, 'quantity', e.target.value)}
                              className="w-20 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                            />
                          ) : (
                            <span className="font-bold">{item.quantity}</span>
                          )}
                        </td>

                        {/* Unit Price */}
                        <td className="py-3 px-4">₹{Number(item.unitPrice || 0).toLocaleString()}</td>

                        {/* Editable Discount % */}
                        <td className="py-3 px-4">
                          {isDraft ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={item.discountPct}
                                onChange={(e) => handleItemFieldChange(item.id, 'discountPct', e.target.value)}
                                className={`w-20 px-2.5 py-1 text-xs font-extrabold rounded-lg border outline-hidden transition-all ${
                                  isOverLimit
                                    ? 'border-amber-400 bg-amber-50/50 text-amber-800 focus:border-amber-600 focus:ring-1 focus:ring-amber-500'
                                    : 'border-slate-300 bg-white text-slate-900 focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67]'
                                }`}
                              />
                              <span className="font-bold text-slate-500">%</span>
                            </div>
                          ) : (
                            <span className={`font-extrabold ${isOverLimit ? 'text-amber-700' : 'text-slate-800'}`}>
                              {item.discountPct}%
                            </span>
                          )}
                        </td>

                        {/* Allowed Limit */}
                        <td className="py-3 px-4 font-semibold text-slate-500">
                          {lineLimit}%
                        </td>

                        {/* Real-time Status Badge */}
                        <td className="py-3 px-4">
                          {isOverLimit ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              Approval Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Auto-Approved
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          {isDraft && (
                            <button
                              onClick={() => setDeleteModal({ open: true, itemId: item.id, itemName: item.productName || item.sku })}
                              title="Remove Line Item"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Upsell and Cross-Sell Suggestions (Real Products from Catalog) ── */}
        {isDraft && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#008784] uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#008784]" />
                Upsell and Cross-Sell Suggestions
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">1-Click Add Real Catalog SKUs</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {products.slice(0, 3).map((p, idx) => {
                const basePrice = Number(p.basePrice || 0);
                const cost = Number(p.estimatedCost || 0);
                const marginBoost = Math.round(basePrice - cost);
                const defaultDiscount = idx === 1 ? 12 : 5;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleAddUpsell(p.name, defaultDiscount)}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-[#008784] hover:shadow-md text-left transition-all duration-150 group shadow-xs active:scale-98"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 group-hover:text-[#008784] transition-colors line-clamp-1">
                          + {p.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {p.sku} — Base: ₹{basePrice.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-emerald-600 font-extrabold mt-1">
                          Margin Boost: +₹{marginBoost.toLocaleString()}
                        </p>
                      </div>
                      <PlusCircle className="h-4 w-4 text-slate-400 group-hover:text-[#008784] shrink-0 transition-colors ml-2" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Bottom Action Buttons ── */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
          
          {/* Save Draft Button */}
          {isDraft && (
            <button
              onClick={handleSaveDraft}
              disabled={savingDraft}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 text-slate-600" />
              <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
            </button>
          )}

          {/* Submit for Approval Button */}
          {isDraft && (
            <button
              onClick={handleSubmitQuotation}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submitting ? 'Submitting...' : 'Submit for Approval'}</span>
            </button>
          )}

          {/* Withdraw to Draft Button (if PENDING_APPROVAL) */}
          {quoteData?.status === 'PENDING_APPROVAL' && (
            <button
              onClick={handleWithdrawQuotation}
              disabled={withdrawing}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-bold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-all shadow-xs disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-700" />
              <span>{withdrawing ? 'Withdrawing...' : 'Withdraw to Draft'}</span>
            </button>
          )}

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
                    step="0.5"
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
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              {(submitResult.quotation?.status === 'APPROVED' || submitResult.status === 'APPROVED') ? (
                <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="h-7 w-7 text-amber-600 shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {(submitResult.quotation?.status === 'APPROVED' || submitResult.status === 'APPROVED')
                    ? 'Deal Self-Approved' 
                    : 'Escalated to Approval Chain'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Status: {submitResult.quotation?.status || submitResult.status || 'PENDING_APPROVAL'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-medium">
              <p><span className="text-slate-500">Required Level:</span> <strong className="text-slate-900">{submitResult.quotation?.requiredApprovalLevel || submitResult.requiredApprovalLevel || submitResult.riskEvaluation?.summary?.requiredApprovalLevel || 'NONE'}</strong></p>
              <p><span className="text-slate-500">Total Net Value:</span> <strong className="text-[#008784]">₹{Number(submitResult.quotation?.grandTotal || submitResult.grandTotal || submitResult.riskEvaluation?.summary?.totalNetAmount || 0).toLocaleString()}</strong></p>
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

      {/* ── Custom Modal: Delete Item Confirmation ── */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Remove Line Item</h3>
                <p className="text-xs text-slate-500 font-medium truncate max-w-[220px]">
                  {deleteModal.itemName || 'Selected item'}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove this line item? Quotation totals and margin calculations will automatically update.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false, itemId: null, itemName: '' })}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingLine}
                onClick={confirmDeleteItem}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingLine ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
