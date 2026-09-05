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
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';

export default function PricingPage() {
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dynamic Pricing Resolver Sandbox State
  const [simCustomerId, setSimCustomerId] = useState('');
  const [simProductId, setSimProductId] = useState('');
  const [simQuantity, setSimQuantity] = useState(1);
  const [simDiscountPct, setSimDiscountPct] = useState(10);
  const [resolvedPricing, setResolvedPricing] = useState(null);
  const [resolving, setResolving] = useState(false);

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

      if (lists.length > 0) setSelectedPriceList(lists[0]);
      if (custs.length > 0) setSimCustomerId(custs[0].id);
      if (prods.length > 0) setSimProductId(prods[0].id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      toast.error(err.response?.data?.message || 'Failed to resolve price');
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    if (simProductId && simCustomerId) {
      handleResolvePrice();
    }
  }, [simProductId, simCustomerId, simQuantity, simDiscountPct]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Price Lists & Dynamic Pricing Matrix"
          subtitle="Configure tier-specific price rules, negotiated account rates, and resolve margins in real time."
        />
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-(--app-color-border) bg-white px-3.5 py-2 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated) transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Lists
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Configured Price Lists" value={priceLists.length.toString()} change="INR Primary" trend="neutral" />
        <StatCard label="Catalog Items Covered" value={products.length.toString()} change="All Tiers" trend="up" />
        <StatCard label="Tier Matrices" value="3 Levels" change="Bronze / Silver / Gold" trend="neutral" />
        <StatCard label="Resolver Engine" value="Active" change="Real-Time Margin Check" trend="up" />
      </div>

      {/* Main Grid: Price Lists Overview + Interactive Resolver Widget */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Price Lists & Matrix (7 Cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-(--app-color-text) mb-3 uppercase tracking-wider">
              Active Price Lists
            </h3>

            <div className="grid gap-3 sm:grid-cols-2">
              {priceLists.map((pl) => {
                const isSelected = selectedPriceList?.id === pl.id;
                return (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPriceList(pl)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all ${
                      isSelected
                        ? 'border-(--app-color-primary) bg-(--app-color-primary-soft)/30 shadow-xs ring-1 ring-(--app-color-primary)'
                        : 'border-(--app-color-border) bg-white hover:border-(--app-color-primary)/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-(--app-color-text)">{pl.name}</h4>
                        <span className="text-[11px] font-medium text-(--app-color-text-muted) mt-0.5 block">
                          Currency: {pl.currency}
                        </span>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Table */}
          <div className="overflow-hidden rounded-xl border border-(--app-color-border) bg-white shadow-xs">
            <div className="p-4 border-b border-(--app-color-border) bg-(--app-color-surface-elevated)/40">
              <h4 className="text-xs font-bold text-(--app-color-text) uppercase tracking-wider">
                Base Catalog Rates vs Tier Negotiated Rates
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-(--app-color-border) bg-(--app-color-surface-elevated)/70 text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
                  <tr>
                    <th className="px-4 py-3">Product SKU</th>
                    <th className="px-4 py-3">Standard List Price</th>
                    <th className="px-4 py-3">Gold Tier Rate</th>
                    <th className="px-4 py-3">Est. Unit Cost</th>
                    <th className="px-4 py-3 text-right">Standard Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--app-color-border)">
                  {products.map((p) => {
                    const bp = Number(p.basePrice || 0);
                    const ec = Number(p.estimatedCost || 0);
                    const stdMargin = bp > 0 ? (((bp - ec) / bp) * 100).toFixed(1) : '0';
                    const isGoldOverridden = p.sku === 'DF-ENT-01';

                    return (
                      <tr key={p.id} className="hover:bg-(--app-color-surface-elevated)/30">
                        <td className="px-4 py-3 font-semibold text-(--app-color-text)">
                          <div>{p.name}</div>
                          <span className="font-mono text-[10px] text-(--app-color-primary)">{p.sku}</span>
                        </td>
                        <td className="px-4 py-3 font-bold text-(--app-color-text)">
                          ₹{bp.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {isGoldOverridden ? (
                            <span className="font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
                              ₹95,000.00 (Negotiated)
                            </span>
                          ) : (
                            <span className="text-(--app-color-text-muted) font-medium">Standard</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-(--app-color-text-muted)">
                          ₹{ec.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-teal-700">
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
          <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-(--app-color-border)">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
                <Calculator className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-(--app-color-text)">Dynamic Pricing Resolver</h3>
                <p className="text-[11px] text-(--app-color-text-muted)">Live simulated unit price & margin resolution</p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Customer Account
                </label>
                <select
                  value={simCustomerId}
                  onChange={(e) => setSimCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                  Select Product SKU
                </label>
                <select
                  value={simProductId}
                  onChange={(e) => setSimProductId(e.target.value)}
                  className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simQuantity}
                    onChange={(e) => setSimQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
                    Discount ({simDiscountPct}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={simDiscountPct}
                    onChange={(e) => setSimDiscountPct(Number(e.target.value))}
                    className="w-full accent-(--app-color-primary) mt-2"
                  />
                </div>
              </div>

              {/* Resolved Output Card */}
              {resolvedPricing && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900">
                      Resolved Pricing Details
                    </span>
                    <span className="rounded-md bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-bold">
                      {resolvedPricing.customerTier} TIER
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-(--app-color-text-muted)">Base Catalog Price:</span>
                      <span className="font-semibold text-(--app-color-text)">
                        ₹{resolvedPricing.basePrice.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {resolvedPricing.hasTierOverride && (
                      <div className="flex justify-between text-teal-800">
                        <span>Tier Matrix Negotiated Rate:</span>
                        <span className="font-bold">
                          ₹{resolvedPricing.tierPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-(--app-color-text-muted)">Requested Discount ({simDiscountPct}%):</span>
                      <span className="font-semibold text-rose-600">
                        - ₹{(resolvedPricing.tierPrice * (simDiscountPct / 100)).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="border-t border-teal-200 pt-2 flex justify-between items-baseline">
                      <span className="font-bold text-(--app-color-text)">Effective Unit Price:</span>
                      <span className="text-base font-extrabold text-(--app-color-primary)">
                        ₹{resolvedPricing.effectiveUnitPrice.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex justify-between font-bold text-xs pt-1">
                      <span>Total Quotation Amount ({resolvedPricing.quantity}x):</span>
                      <span>₹{resolvedPricing.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Margin Bar */}
                  <div className="border-t border-teal-200 pt-3">
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>Deal Margin Contribution:</span>
                      <span className={resolvedPricing.estimatedMarginPct > 50 ? 'text-emerald-700' : 'text-amber-700'}>
                        {resolvedPricing.estimatedMarginPct}% (₹{resolvedPricing.unitMargin.toLocaleString('en-IN')}/unit)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full ${
                          resolvedPricing.estimatedMarginPct > 50
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
    </div>
  );
}
