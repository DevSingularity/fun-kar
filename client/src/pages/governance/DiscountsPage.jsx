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
  UserCheck, 
  Building2,
  Info,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';

export default function DiscountsPage() {
  const [governance, setGovernance] = useState({
    tierLimits: [],
    categoryLimits: [],
    approvalBands: [],
  });
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const [govRes, custRes, prodRes] = await Promise.all([
        api.get('/governance/overview'),
        api.get('/customers', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 100 } }),
      ]);
      setGovernance(govRes.data?.data || {});
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

  const handleEvaluateRisk = async () => {
    if (!simCustomerId || simLines.some((l) => !l.productId)) {
      toast.error('Please select customer and products for simulation');
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
      toast.error(err.response?.data?.message || 'Risk evaluation failed');
    } finally {
      setEvaluating(false);
    }
  };

  // Auto-run simulation when parameters change
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Discount Governance & Explainable Risk Engine"
          subtitle="Self-governing discount limits, category caps, multi-tier approval chains, and live policy explanation."
        />
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-(--app-color-border) bg-white px-3.5 py-2 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated) transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Policies
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customer Tier Limits" value="3 Tiers" change="Bronze (10%) / Silver (20%) / Gold (30%)" trend="neutral" />
        <StatCard label="Category Caps" value={`${governance.categoryLimits.length} Rules`} change="Strict Limits Active" trend="up" />
        <StatCard label="Approval Levels" value="3 Bands" change="Instant / Manager / Finance" trend="up" />
        <StatCard label="Self-Governing Engine" value="100% Active" change="Zero Stalled Deals" trend="up" />
      </div>

      {/* Governance Rules Cards Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tier Limits */}
        <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-(--app-color-border)">
            <ShieldCheck className="h-4 w-4 text-(--app-color-primary)" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-(--app-color-text)">
              Customer Tier Baseline Caps
            </h3>
          </div>
          <div className="space-y-2.5">
            {governance.tierLimits.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-(--app-color-border) p-3 bg-(--app-color-surface-elevated)/30">
                <div>
                  <span className="font-bold text-xs text-(--app-color-text)">{t.tier} Tier</span>
                  <span className="text-[10px] text-(--app-color-text-muted) block">Baseline discount delegation</span>
                </div>
                <span className="rounded-md bg-purple-50 px-2.5 py-1 text-xs font-extrabold text-(--app-color-primary) border border-purple-200">
                  {Number(t.maxDiscountPct)}% Max
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Limits */}
        <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-(--app-color-border)">
            <Layers className="h-4 w-4 text-teal-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-(--app-color-text)">
              Product Category Hard Caps
            </h3>
          </div>
          <div className="space-y-2">
            {governance.categoryLimits.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-(--app-color-border)/50 text-xs last:border-none">
                <span className="font-semibold text-(--app-color-text)">{c.categoryName}</span>
                <span className="font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-[11px]">
                  {Number(c.maxDiscountPct)}% Cap
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Routing Bands */}
        <div className="rounded-xl border border-(--app-color-border) bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-(--app-color-border)">
            <Scale className="h-4 w-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-(--app-color-text)">
              Multi-Tier Routing Bands
            </h3>
          </div>
          <div className="space-y-2">
            {governance.approvalBands.map((band) => {
              const min = Number(band.minOveragePct);
              const max = band.maxOveragePct !== null ? Number(band.maxOveragePct) : '∞';
              return (
                <div key={band.id} className="flex items-center justify-between rounded-lg border border-(--app-color-border) p-2.5 bg-slate-50 text-xs">
                  <div>
                    <span className="font-bold text-(--app-color-text)">Overage [{min}% - {max}%)</span>
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    band.requiredLevel === 'NONE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : band.requiredLevel === 'MANAGER'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {band.requiredLevel === 'NONE' ? 'Instant Sign-Off' : band.requiredLevel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Explainable Risk Engine Simulation Sandbox */}
      <div className="rounded-xl border border-(--app-color-border) bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-(--app-color-border)">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-(--app-color-primary-soft) text-(--app-color-primary)">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-(--app-color-text)">
                Explainable Risk Engine Sandbox
              </h3>
              <p className="text-[11px] text-(--app-color-text-muted)">
                Test quotation discount requests live to inspect boundary limits, overages, and dynamic approval routing.
              </p>
            </div>
          </div>
          <button
            onClick={addLine}
            className="flex items-center gap-1 rounded-lg border border-(--app-color-border) px-3 py-1.5 text-xs font-semibold text-(--app-color-text) hover:bg-(--app-color-surface-elevated)"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Line Item
          </button>
        </div>

        {/* Simulator Controls */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Customer Selection */}
          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-1">
              Select Customer Account (Tier Context)
            </label>
            <select
              value={simCustomerId}
              onChange={(e) => setSimCustomerId(e.target.value)}
              className="w-full rounded-lg border border-(--app-color-border) px-3 py-2 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.tier} Tier ({c.tier === 'GOLD' ? '30%' : c.tier === 'SILVER' ? '20%' : '10%'} Max)
                </option>
              ))}
            </select>
          </div>

          {/* Quotation Lines Config */}
          <div className="space-y-3 lg:col-span-8">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
              Quotation Line Items & Requested Discounts
            </label>

            {simLines.map((line, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-3 rounded-lg border border-(--app-color-border) p-3 bg-(--app-color-surface-elevated)/40">
                <span className="text-xs font-bold text-(--app-color-text-muted) w-5">#{idx + 1}</span>

                <div className="flex-1 min-w-[200px]">
                  <select
                    value={line.productId}
                    onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                    className="w-full rounded-lg border border-(--app-color-border) bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-(--app-color-primary) focus:outline-none"
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
                    className="w-full rounded-lg border border-(--app-color-border) bg-white px-2 py-1.5 text-xs font-semibold text-center focus:border-(--app-color-primary) focus:outline-none"
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
                    className="flex-1 accent-(--app-color-primary)"
                  />
                  <span className="w-12 text-right text-xs font-extrabold text-(--app-color-primary)">
                    {line.requestedDiscountPct}%
                  </span>
                </div>

                {simLines.length > 1 && (
                  <button
                    onClick={() => removeLine(idx)}
                    className="text-xs font-bold text-rose-500 hover:text-rose-700 px-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live Risk Evaluation Output */}
        {riskResult && (
          <div className="rounded-xl border border-(--app-color-border) bg-(--app-color-surface-elevated)/20 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-(--app-color-border)">
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

                <div className="text-xs font-semibold text-(--app-color-text)">
                  Required Approval Route:
                  <span className={`ml-2 rounded-md px-2 py-0.5 font-extrabold ${
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

              <div className="flex items-center gap-4 text-xs font-bold text-(--app-color-text)">
                <div>Blended Overage: <span className="text-rose-600 font-extrabold">{riskResult.summary.blendedOveragePct}%</span></div>
                <div>Deal Margin: <span className="text-teal-700 font-extrabold">{riskResult.summary.overallMarginPct}%</span></div>
                <div>Net Total: <span className="text-(--app-color-primary) font-extrabold">₹{riskResult.summary.totalNetAmount.toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            {/* Line-by-Line Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-(--app-color-border) bg-(--app-color-surface-elevated) text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
                  <tr>
                    <th className="px-3 py-2">Line</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Requested</th>
                    <th className="px-3 py-2 text-right">Tier Limit</th>
                    <th className="px-3 py-2 text-right">Category Cap</th>
                    <th className="px-3 py-2 text-right">Effective Cap</th>
                    <th className="px-3 py-2 text-right">Overage</th>
                    <th className="px-3 py-2 text-right">Line Margin</th>
                    <th className="px-3 py-2 text-center">Policy Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--app-color-border) bg-white">
                  {riskResult.lineEvaluations.map((line) => (
                    <tr key={line.lineNumber}>
                      <td className="px-3 py-2.5 font-bold text-(--app-color-text-muted)">#{line.lineNumber}</td>
                      <td className="px-3 py-2.5 font-semibold text-(--app-color-text)">{line.productName}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-(--app-color-primary)">{line.requestedDiscountPct}%</td>
                      <td className="px-3 py-2.5 text-right text-(--app-color-text-muted)">{line.tierMaxDiscountPct}%</td>
                      <td className="px-3 py-2.5 text-right text-(--app-color-text-muted)">{line.categoryMaxDiscountPct ?? '-'}%</td>
                      <td className="px-3 py-2.5 text-right font-bold text-teal-800">{line.effectiveAllowedDiscountPct}%</td>
                      <td className={`px-3 py-2.5 text-right font-extrabold ${line.overagePct > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {line.overagePct}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-teal-700">{line.lineMarginPct}%</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
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

            {/* Explainable Rationale Callout Box */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-(--app-color-primary)">
                <Info className="h-4 w-4" />
                Explainable Risk Engine Audit Rationale:
              </div>
              <ul className="list-disc pl-5 text-xs text-(--app-color-text) space-y-1">
                {riskResult.explanations.map((exp, i) => (
                  <li key={i}>{exp}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
