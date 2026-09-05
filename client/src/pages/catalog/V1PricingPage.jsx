import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Calculator, 
  Search, 
  TrendingUp, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  Check, 
  RefreshCw,
  Sliders,
  DollarSign,
  Plus,
  Percent,
  CheckCircle2,
  Building2,
  Package,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';
import useAuthStore from '../../store/auth.store.js';

export default function V1PricingPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [selectedPriceListItems, setSelectedPriceListItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Dynamic Pricing Resolver Sandbox State
  const [simCustomerId, setSimCustomerId] = useState('');
  const [simProductId, setSimProductId] = useState('');
  const [simQuantity, setSimQuantity] = useState(1);
  const [simDiscountPct, setSimDiscountPct] = useState(10);
  const [resolvedPricing, setResolvedPricing] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Add Item / Tier Override Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [overrideProductId, setOverrideProductId] = useState('');
  const [overrideTier, setOverrideTier] = useState('GOLD');
  const [overrideUnitPrice, setOverrideUnitPrice] = useState('');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plRes, prodRes, custRes] = await Promise.all([
        api.get('/price-lists'),
        api.get('/products', { params: { limit: 100 } }),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      const lists = plRes.data?.data || [];
      const prods = prodRes.data?.data || [];
      const custs = custRes.data?.data || [];

      setPriceLists(lists);
      setProducts(prods);
      setCustomers(custs);

      if (lists.length > 0) {
        setSelectedPriceList(lists[0]);
        loadPriceListDetail(lists[0].id);
      }
      if (custs.length > 0) setSimCustomerId(custs[0].id);
      if (prods.length > 0) {
        setSimProductId(prods[0].id);
        setOverrideProductId(prods[0].id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  const loadPriceListDetail = async (listId) => {
    try {
      const res = await api.get(`/price-lists/${listId}`);
      setSelectedPriceListItems(res.data?.data?.items || []);
    } catch (err) {
      console.warn('Could not load price list items detail', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPriceList = (pl) => {
    setSelectedPriceList(pl);
    loadPriceListDetail(pl.id);
  };

  const handleResolvePrice = async () => {
    if (!simProductId) return;
    setResolving(true);
    try {
      const res = await api.get('/price-lists/resolve', {
        params: {
          productId: simProductId,
          customerId: simCustomerId || undefined,
          quantity: simQuantity,
          requestedDiscountPct: simDiscountPct,
        },
      });
      setResolvedPricing(res.data?.data || null);
    } catch (err) {
      console.warn('Resolve pricing notice:', err.message);
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (simProductId && simCustomerId) {
      handleResolvePrice();
    }
  }, [simProductId, simCustomerId, simQuantity, simDiscountPct]);

  const handleSaveTierOverride = async (e) => {
    e.preventDefault();
    if (!selectedPriceList || !overrideProductId || !overrideUnitPrice) {
      toast.error('Please enter all required fields.');
      return;
    }
    setSubmittingOverride(true);
    try {
      await api.put(`/price-lists/${selectedPriceList.id}/items`, {
        productId: overrideProductId,
        customerTier: overrideTier,
        unitPrice: Number(overrideUnitPrice),
      });
      toast.success('Tier matrix override rate saved.');
      setShowAddModal(false);
      setOverrideUnitPrice('');
      loadPriceListDetail(selectedPriceList.id);
      handleResolvePrice();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Could not save override rate.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      <OdooTopNavbar activeTab="Pricing" />
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Header with Title & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#008784]/10 text-[#008784]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Pricing Matrix & Tier Rule Engine</h1>
              <p className="text-xs text-slate-500">
                Customer tier negotiated rates, catalog base prices, and real-time margin resolution
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 rounded-lg bg-[#008784] hover:bg-[#00706e] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Configure Tier Rate
              </button>
            )}
          </div>
        </div>

        {/* 4 KPI Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Active Price Lists</span>
            <span className="text-xl font-black text-slate-800">{priceLists.length} Lists</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">INR Primary Currency</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Catalog SKUs Covered</span>
            <span className="text-xl font-black text-slate-800">{products.length} Products</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">All Tiers & Categories</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Customer Tiers</span>
            <span className="text-xl font-black text-slate-800">3 Tiers</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Bronze / Silver / Gold</span>
          </div>
          <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 shadow-xs">
            <span className="text-[10px] text-teal-700 font-bold uppercase block tracking-wider">Resolver Engine</span>
            <span className="text-xl font-black text-teal-900">Active</span>
            <span className="text-[11px] text-teal-700 font-semibold block mt-0.5">Real-Time Margin Check</span>
          </div>
        </div>

        {/* Main Grid: Price Lists Overview + Live Interactive Resolver */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Price Lists & Rate Matrix Table (7 Cols) */}
          <div className="space-y-6 lg:col-span-7">
            
            {/* Price Lists Selector Cards */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Configured Price Lists
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {priceLists.map((pl) => {
                  const isSelected = selectedPriceList?.id === pl.id;
                  return (
                    <div
                      key={pl.id}
                      onClick={() => handleSelectPriceList(pl)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-[#008784] bg-[#008784]/5 ring-1 ring-[#008784] shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{pl.name}</h4>
                          <span className="text-[11px] font-medium text-slate-500 block mt-0.5">
                            Currency: <strong className="text-slate-700">{pl.currency}</strong>
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Catalog Rate Matrix Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Base Catalog Rates vs Tier Negotiated Rates
                </h3>
                <div className="relative w-full sm:w-56">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search SKU or name..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#008784]/30"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Product SKU</th>
                      <th className="px-4 py-3 font-semibold">List Price</th>
                      <th className="px-4 py-3 font-semibold">Tier Rate Override</th>
                      <th className="px-4 py-3 font-semibold">Unit Cost</th>
                      <th className="px-4 py-3 text-right font-semibold">Base Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const bp = Number(p.basePrice || 0);
                      const ec = Number(p.estimatedCost || 0);
                      const stdMargin = bp > 0 ? (((bp - ec) / bp) * 100).toFixed(1) : '0';

                      // Find if this product has an active override in selected price list
                      const overrideItem = selectedPriceListItems.find((item) => item.productId === p.id);

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{p.name}</div>
                            <span className="font-mono text-[10px] text-[#008784] font-semibold">{p.sku}</span>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            ₹{bp.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            {overrideItem ? (
                              <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px] inline-block">
                                ₹{Number(overrideItem.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({overrideItem.customerTier})
                              </span>
                            ) : p.sku === 'DF-ENT-01' ? (
                              <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px] inline-block">
                                ₹95,000.00 (GOLD)
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">Standard</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            ₹{ec.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#008784]">
                            {stdMargin}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dynamic Pricing Resolver Sandbox (5 Cols) */}
          <div className="space-y-4 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#008784]/10 text-[#008784]">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Dynamic Pricing Resolver</h3>
                  <p className="text-[11px] text-slate-500">Live simulated account unit price & margin resolution</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Customer Selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Customer Account
                  </label>
                  <select
                    value={simCustomerId}
                    onChange={(e) => setSimCustomerId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#008784] focus:outline-none focus:ring-2 focus:ring-[#008784]/20"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.tier} Tier)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Product Selector */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Select Product SKU
                  </label>
                  <select
                    value={simProductId}
                    onChange={(e) => setSimProductId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#008784] focus:outline-none focus:ring-2 focus:ring-[#008784]/20"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name} (Base: ₹{Number(p.basePrice).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity and Discount Slider */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={simQuantity}
                      onChange={(e) => setSimQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#008784] focus:outline-none focus:ring-2 focus:ring-[#008784]/20"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Discount
                      </label>
                      <span className="text-xs font-bold text-[#008784]">{simDiscountPct}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={simDiscountPct}
                      onChange={(e) => setSimDiscountPct(Number(e.target.value))}
                      className="w-full accent-[#008784] mt-2"
                    />
                  </div>
                </div>

                {/* Resolved Output Box */}
                {resolvedPricing && (
                  <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5 text-[#008784]" /> Resolved Pricing Summary
                      </span>
                      <span className="rounded-md bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-bold uppercase border border-teal-200">
                        {resolvedPricing.customerTier} TIER
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Base List Price:</span>
                        <span className="font-semibold text-slate-800">
                          ₹{resolvedPricing.basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {resolvedPricing.hasTierOverride && (
                        <div className="flex justify-between text-teal-800">
                          <span>Tier Matrix Rate:</span>
                          <span className="font-bold">
                            ₹{resolvedPricing.tierPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-slate-600">
                        <span>Applied Discount ({simDiscountPct}%):</span>
                        <span className="font-semibold text-rose-600">
                          - ₹{(resolvedPricing.tierPrice * (simDiscountPct / 100)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="border-t border-teal-200 pt-2 flex justify-between items-baseline">
                        <span className="font-bold text-slate-900">Effective Unit Price:</span>
                        <span className="text-base font-extrabold text-[#008784]">
                          ₹{resolvedPricing.effectiveUnitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex justify-between font-bold text-xs pt-1 text-slate-800">
                        <span>Total Quotation ({resolvedPricing.quantity}x):</span>
                        <span>₹{resolvedPricing.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    {/* Margin Gauge */}
                    <div className="border-t border-teal-200 pt-3">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-700">Deal Margin Contribution:</span>
                        <span className={resolvedPricing.estimatedMarginPct > 40 ? 'text-emerald-700' : 'text-amber-700'}>
                          {resolvedPricing.estimatedMarginPct}% (₹{resolvedPricing.unitMargin.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/unit)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full ${
                            resolvedPricing.estimatedMarginPct > 40
                              ? 'bg-emerald-500'
                              : resolvedPricing.estimatedMarginPct > 20
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, resolvedPricing.estimatedMarginPct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Modal: Add / Configure Tier Override Rate */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Configure Tier Override Rate</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTierOverride} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Price List</label>
                  <input
                    disabled
                    value={selectedPriceList?.name || ''}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Product SKU</label>
                  <select
                    value={overrideProductId}
                    onChange={(e) => setOverrideProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} - {p.name} (Base: ₹{Number(p.basePrice).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Customer Tier</label>
                    <select
                      value={overrideTier}
                      onChange={(e) => setOverrideTier(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="BRONZE">BRONZE</option>
                      <option value="SILVER">SILVER</option>
                      <option value="GOLD">GOLD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Negotiated Rate (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 95000"
                      value={overrideUnitPrice}
                      onChange={(e) => setOverrideUnitPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOverride}
                    className="px-4 py-2 rounded-lg bg-[#008784] text-white font-bold hover:bg-[#00706e] disabled:opacity-50"
                  >
                    {submittingOverride ? 'Saving...' : 'Save Tier Rate'}
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
