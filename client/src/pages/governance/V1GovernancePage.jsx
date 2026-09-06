import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Percent, 
  Sliders, 
  Zap, 
  RefreshCw,
  Plus, 
  Building2,
  Info,
  Scale,
  Trash2,
  Edit2,
  X,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1GovernancePage() {
  const [governance, setGovernance] = useState({
    tierLimits: [],
    categoryLimits: [],
    approvalBands: [],
  });
  const [allCategories, setAllCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals / State for CRUD
  const [tierModal, setTierModal] = useState({ open: false, tier: '', maxDiscountPct: 10 });
  const [categoryModal, setCategoryModal] = useState({ open: false, id: null, categoryId: '', maxDiscountPct: 20 });
  const [bandModal, setBandModal] = useState({ 
    open: false, 
    id: null, 
    minOveragePct: 0, 
    maxOveragePct: '', 
    requiredLevel: 'NONE' 
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Risk Simulation State
  const [simCustomerId, setSimCustomerId] = useState('');
  const [simLines, setSimLines] = useState([
    { productId: '', quantity: 1, requestedDiscountPct: 15 },
  ]);
  const [riskResult, setRiskResult] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [govRes, catRes, custRes, prodRes] = await Promise.all([
        api.get('/governance/overview'),
        api.get('/categories').catch(() => ({ data: { data: [] } })),
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 100 } }),
      ]);
      setGovernance(govRes.data?.data || {});
      setAllCategories(catRes.data?.data || []);
      const custs = custRes.data?.data || [];
      const prods = prodRes.data?.data || [];
      setCustomers(custs);
      setProducts(prods);

      if (custs.length > 0 && !simCustomerId) {
        setSimCustomerId(custs[0].id);
      }
      if (prods.length > 0 && !simLines[0].productId) {
        setSimLines([{ productId: prods[0].id, quantity: 1, requestedDiscountPct: 15 }]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load governance rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ─── 1. Tier Limit CRUD ───
  const handleSaveTier = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/governance/tier-limits', {
        tier: tierModal.tier,
        maxDiscountPct: Number(tierModal.maxDiscountPct),
      });
      toast.success(`${tierModal.tier} tier discount limit updated to ${tierModal.maxDiscountPct}%`);
      setTierModal({ open: false, tier: '', maxDiscountPct: 10 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tier limit');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── 2. Category Limit CRUD ───
  const handleSaveCategoryLimit = async (e) => {
    e.preventDefault();
    if (!categoryModal.categoryId) {
      toast.error('Please select a product category');
      return;
    }
    setActionLoading(true);
    try {
      await api.post('/governance/category-limits', {
        categoryId: categoryModal.categoryId,
        maxDiscountPct: Number(categoryModal.maxDiscountPct),
      });
      toast.success('Category discount cap saved successfully');
      setCategoryModal({ open: false, id: null, categoryId: '', maxDiscountPct: 20 });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category limit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategoryLimit = async (id, name) => {
    if (!confirm(`Delete discount cap for category "${name}"?`)) return;
    setActionLoading(true);
    try {
      await api.delete(`/governance/category-limits/${id}`);
      toast.success('Category discount cap removed');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category cap');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── 3. Approval Routing Bands CRUD ───
  const handleSaveBand = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload = {
        minOveragePct: Number(bandModal.minOveragePct),
        maxOveragePct: bandModal.maxOveragePct !== '' && bandModal.maxOveragePct !== null ? Number(bandModal.maxOveragePct) : null,
        requiredLevel: bandModal.requiredLevel,
      };

      if (bandModal.id) {
        await api.patch(`/governance/approval-rules/${bandModal.id}`, payload);
        toast.success('Approval routing band updated successfully');
      } else {
        await api.post('/governance/approval-rules', payload);
        toast.success('New approval routing band created');
      }
      setBandModal({ open: false, id: null, minOveragePct: 0, maxOveragePct: '', requiredLevel: 'NONE' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save approval band');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBand = async (id) => {
    if (!confirm('Are you sure you want to delete this approval routing rule?')) return;
    setActionLoading(true);
    try {
      await api.delete(`/governance/approval-rules/${id}`);
      toast.success('Approval routing band deleted');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete approval band');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Risk Simulation Engine ───
  const handleEvaluateRisk = async () => {
    if (!simCustomerId || simLines.some((l) => !l.productId)) {
      return;
    }
    setEvaluating(true);
    try {
      const res = await api.post('/risk/evaluate', {
        customerId: simCustomerId,
        lines: simLines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          requestedDiscountPct: Number(l.requestedDiscountPct),
        })),
      });
      setRiskResult(res.data?.data || null);
    } catch (err) {
      console.warn('Risk evaluation note:', err);
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    if (simCustomerId && simLines.length > 0 && simLines[0].productId) {
      handleEvaluateRisk();
    }
  }, [simCustomerId, simLines]);

  const addLine = () => {
    if (products.length > 0) {
      setSimLines([
        ...simLines,
        { productId: products[0].id, quantity: 1, requestedDiscountPct: 10 },
      ]);
    }
  };

  const removeLine = (index) => {
    if (simLines.length > 1) {
      setSimLines(simLines.filter((_, i) => i !== index));
    }
  };

  const updateLine = (index, field, value) => {
    const updated = [...simLines];
    updated[index][field] = value;
    setSimLines(updated);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Governance" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Top Control Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-[#714b67]" />
              Discount Governance & Explainable Risk Engine
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Self-governing discount limits, category caps, multi-tier approval chains, and live policy explanation.
            </p>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Policies</span>
          </button>
        </div>

        {/* ── Governance Rules Cards Grid (With Full CRUD for Admin) ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Card 1: Customer Tier Baseline Caps */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#714b67]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Customer Tier Baseline Caps
                  </h3>
                </div>
              </div>

              <div className="space-y-2.5">
                {(governance.tierLimits || []).map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-slate-900">{t.tier} Tier</span>
                      <span className="text-[10px] text-slate-500 block">Baseline discount delegation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-extrabold text-[#714b67] border border-purple-200">
                        {Number(t.maxDiscountPct)}% Max
                      </span>
                      <button
                        onClick={() => setTierModal({ open: true, tier: t.tier, maxDiscountPct: Number(t.maxDiscountPct) })}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-[#714b67] hover:border-[#714b67] transition-colors shadow-2xs"
                        title="Edit Tier Cap"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!governance.tierLimits || governance.tierLimits.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No tier limits configured.</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Product Category Hard Caps */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-teal-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Product Category Hard Caps
                  </h3>
                </div>
                <button
                  onClick={() => setCategoryModal({ open: true, id: null, categoryId: allCategories[0]?.id || '', maxDiscountPct: 20 })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Cap</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                {(governance.categoryLimits || []).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 text-xs transition-colors group">
                    <span className="font-semibold text-slate-800 truncate max-w-[160px]">{c.categoryName}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-[11px]">
                        {Number(c.maxDiscountPct)}% Cap
                      </span>
                      <button
                        onClick={() => setCategoryModal({ open: true, id: c.id, categoryId: c.categoryId, maxDiscountPct: Number(c.maxDiscountPct) })}
                        className="p-1 rounded text-slate-400 hover:text-teal-700 transition-colors"
                        title="Edit Cap"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategoryLimit(c.id, c.categoryName)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Cap"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {(!governance.categoryLimits || governance.categoryLimits.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No category caps configured.</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Multi-Tier Approval Routing Bands */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Scale className="h-4 w-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Multi-Tier Routing Bands
                  </h3>
                </div>
                <button
                  onClick={() => setBandModal({ open: true, id: null, minOveragePct: 0, maxOveragePct: '', requiredLevel: 'NONE' })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-2xs"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Band</span>
                </button>
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {(governance.approvalBands || []).map((band) => {
                  const min = Number(band.minOveragePct);
                  const max = band.maxOveragePct !== null ? Number(band.maxOveragePct) : '∞';
                  return (
                    <div key={band.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 bg-slate-50 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">Overage [{min}% - {max}%)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          band.requiredLevel === 'NONE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : band.requiredLevel === 'MANAGER'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {band.requiredLevel === 'NONE' ? 'Instant Sign-Off' : band.requiredLevel}
                        </span>
                        <button
                          onClick={() => setBandModal({ 
                            open: true, 
                            id: band.id, 
                            minOveragePct: min, 
                            maxOveragePct: band.maxOveragePct !== null ? Number(band.maxOveragePct) : '', 
                            requiredLevel: band.requiredLevel 
                          })}
                          className="p-1 rounded text-slate-400 hover:text-amber-700 transition-colors"
                          title="Edit Band"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteBand(band.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Band"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {(!governance.approvalBands || governance.approvalBands.length === 0) && (
                  <p className="text-xs text-slate-400 italic">No routing bands configured.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Interactive Explainable Risk Engine Simulation Sandbox ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 text-[#714b67]">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Explainable Risk Engine Sandbox
                </h3>
                <p className="text-[11px] text-slate-500">
                  Test quotation discount requests live to inspect boundary limits, overages, and dynamic approval routing.
                </p>
              </div>
            </div>
            <button
              onClick={addLine}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Line Item</span>
            </button>
          </div>

          {/* Simulator Controls */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Customer Selection */}
            <div className="lg:col-span-4 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Select Customer Account (Tier Context)
              </label>
              <select
                value={simCustomerId}
                onChange={(e) => setSimCustomerId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] outline-hidden shadow-xs transition-all"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.tier} Tier ({c.tier === 'GOLD' ? '30%' : c.tier === 'SILVER' ? '20%' : c.tier === 'BRONZE' ? '10%' : '0%'} Max)
                  </option>
                ))}
              </select>
            </div>

            {/* Quotation Lines Config */}
            <div className="space-y-3 lg:col-span-8">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Quotation Line Items & Requested Discounts
              </label>

              {simLines.map((line, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 bg-slate-50/60 shadow-xs">
                  <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>

                  <div className="flex-1 min-w-[200px]">
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] outline-hidden shadow-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Base: ₹{Number(p.basePrice).toLocaleString('en-IN')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-center text-slate-800 focus:border-[#714b67] outline-hidden shadow-xs"
                      placeholder="Qty"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-48">
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={line.requestedDiscountPct}
                      onChange={(e) => updateLine(idx, 'requestedDiscountPct', Number(e.target.value))}
                      className="flex-1 accent-[#714b67] cursor-pointer"
                    />
                    <span className="w-12 text-right text-xs font-extrabold text-[#714b67]">
                      {line.requestedDiscountPct}%
                    </span>
                  </div>

                  {simLines.length > 1 && (
                    <button
                      onClick={() => removeLine(idx)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                      title="Remove Line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Risk Evaluation Output */}
          {riskResult && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                    riskResult.summary.policyStatus === 'COMPLIANT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {riskResult.summary.policyStatus === 'COMPLIANT' ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {riskResult.summary.policyStatus}
                  </span>

                  <div className="text-xs font-semibold text-slate-700">
                    Required Approval Route:
                    <span className={`ml-2 rounded-md px-2.5 py-0.5 font-extrabold ${
                      riskResult.summary.requiredApprovalLevel === 'NONE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : riskResult.summary.requiredApprovalLevel === 'MANAGER'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {riskResult.summary.requiredApprovalLevel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-800">
                  <div>Blended Overage: <span className="text-rose-600 font-black">{riskResult.summary.blendedOveragePct}%</span></div>
                  <div>Deal Margin: <span className="text-teal-700 font-black">{riskResult.summary.overallMarginPct}%</span></div>
                  <div>Net Total: <span className="text-[#714b67] font-black">₹{riskResult.summary.totalNetAmount.toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              {/* Line-by-Line Breakdown Table */}
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5">Line</th>
                        <th className="px-3 py-2.5">Product</th>
                        <th className="px-3 py-2.5 text-right">Requested</th>
                        <th className="px-3 py-2.5 text-right">Tier Limit</th>
                        <th className="px-3 py-2.5 text-right">Category Cap</th>
                        <th className="px-3 py-2.5 text-right">Effective Cap</th>
                        <th className="px-3 py-2.5 text-right">Overage</th>
                        <th className="px-3 py-2.5 text-right">Line Margin</th>
                        <th className="px-3 py-2.5 text-center">Policy Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                      {riskResult.lineEvaluations.map((line) => (
                        <tr key={line.lineNumber} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3 py-2.5 font-bold text-slate-400">#{line.lineNumber}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">{line.productName}</td>
                          <td className="px-3 py-2.5 text-right font-extrabold text-[#714b67]">{line.requestedDiscountPct}%</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{line.tierMaxDiscountPct}%</td>
                          <td className="px-3 py-2.5 text-right text-slate-500">{line.categoryMaxDiscountPct ?? '-'}%</td>
                          <td className="px-3 py-2.5 text-right font-bold text-teal-800">{line.effectiveAllowedDiscountPct}%</td>
                          <td className={`px-3 py-2.5 text-right font-extrabold ${line.overagePct > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {line.overagePct}%
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-teal-700">{line.lineMarginPct}%</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              line.status === 'WITHIN_POLICY'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {line.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Explainable Rationale Callout Box */}
              <div className="rounded-lg border border-purple-200 bg-purple-50/70 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#714b67]">
                  <Info className="h-4 w-4" />
                  <span>Explainable Risk Engine Audit Rationale:</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1">
                  {riskResult.explanations.map((exp, i) => (
                    <li key={i}>{exp}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal 1: Edit Customer Tier Limit ── */}
      {tierModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#714b67]" />
                <h3 className="font-bold text-sm text-slate-900">Configure {tierModal.tier} Tier Discount Cap</h3>
              </div>
              <button
                onClick={() => setTierModal({ open: false, tier: '', maxDiscountPct: 10 })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTier} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Maximum Allowed Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={tierModal.maxDiscountPct}
                  onChange={(e) => setTierModal({ ...tierModal, maxDiscountPct: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Sales representatives assigned to accounts with {tierModal.tier} tier can delegate up to this limit without triggering approval.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTierModal({ open: false, tier: '', maxDiscountPct: 10 })}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Tier Cap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Add / Edit Product Category Cap ── */}
      {categoryModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-teal-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {categoryModal.id ? 'Edit Category Discount Cap' : 'Add Category Discount Cap'}
                </h3>
              </div>
              <button
                onClick={() => setCategoryModal({ open: false, id: null, categoryId: '', maxDiscountPct: 20 })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategoryLimit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Product Category</label>
                <select
                  value={categoryModal.categoryId}
                  onChange={(e) => setCategoryModal({ ...categoryModal, categoryId: e.target.value })}
                  disabled={Boolean(categoryModal.id)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-teal-700 disabled:bg-slate-100"
                >
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Maximum Allowed Category Discount (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={categoryModal.maxDiscountPct}
                  onChange={(e) => setCategoryModal({ ...categoryModal, maxDiscountPct: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: false, id: null, categoryId: '', maxDiscountPct: 20 })}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Category Cap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Add / Edit Approval Routing Band ── */}
      {bandModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-slate-900 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {bandModal.id ? 'Edit Approval Routing Band' : 'Add Approval Routing Band'}
                </h3>
              </div>
              <button
                onClick={() => setBandModal({ open: false, id: null, minOveragePct: 0, maxOveragePct: '', requiredLevel: 'NONE' })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBand} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1.5 text-slate-700">Min Overage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    value={bandModal.minOveragePct}
                    onChange={(e) => setBandModal({ ...bandModal, minOveragePct: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1.5 text-slate-700">Max Overage (%) <span className="text-slate-400 font-normal">(Empty for ∞)</span></label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={bandModal.maxOveragePct}
                    onChange={(e) => setBandModal({ ...bandModal, maxOveragePct: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                    placeholder="∞"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5 text-slate-700">Required Approval Level</label>
                <select
                  value={bandModal.requiredLevel}
                  onChange={(e) => setBandModal({ ...bandModal, requiredLevel: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-hidden focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                >
                  <option value="NONE">NONE (Instant Sign-Off)</option>
                  <option value="MANAGER">MANAGER (Sales Manager Approval)</option>
                  <option value="MANAGER_FINANCE">MANAGER_FINANCE (Sales Manager + Finance Dual Approval)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBandModal({ open: false, id: null, minOveragePct: 0, maxOveragePct: '', requiredLevel: 'NONE' })}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Routing Band'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
