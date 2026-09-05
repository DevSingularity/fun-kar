import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  ShieldAlert, 
  MessageSquare, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  Building2, 
  User, 
  Calendar, 
  Clock, 
  DollarSign, 
  Percent, 
  TrendingUp, 
  Tag, 
  Package, 
  MapPin, 
  Mail, 
  Phone, 
  RefreshCw,
  Flame,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1DealDetailPage() {
  const { quotationId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/deal-health/${quotationId}`);
      setData(res.data?.data || null);
      setTimeline(res.data?.data?.timeline || []);
    } catch (err) {
      console.warn('Deal detail fetch note:', err);
      toast.error('Failed to load deal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, [quotationId]);

  const handleNudge = async () => {
    setActionInProgress(true);
    try {
      await api.post(`/deal-health/${quotationId}/nudge`, {
        message: 'Sales Manager follow-up: Please update deal status and follow up with client.',
      });
      toast.success('Nudge recorded in deal discussion timeline.');
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send nudge');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEscalate = async () => {
    setActionInProgress(true);
    try {
      await api.post(`/deal-health/${quotationId}/escalate`, {
        reason: 'Sales Manager escalated deal to Executive / Finance review due to risk indicators.',
      });
      toast.success('Deal escalated successfully.');
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to escalate deal');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleAlertAction = async (alertId, action) => {
    setActionInProgress(true);
    try {
      await api.post(`/deal-health/alerts/${alertId}/${action}`);
      toast.success(`Alert marked as ${action}d`);
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Could not ${action} alert`);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setActionInProgress(true);
    try {
      await api.post(`/deal-health/${quotationId}/comments`, {
        message: newMessage.trim(),
      });
      setNewMessage('');
      toast.success('Comment posted to deal timeline.');
      fetchAll();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to post comment');
    } finally {
      setActionInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <OdooTopNavbar activeTab="Deal Health" />
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-20 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-[#714b67] mb-3" />
          <p className="text-xs font-semibold text-slate-500">Loading comprehensive deal data and signals...</p>
        </main>
      </div>
    );
  }

  if (!data || !data.quotation) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <OdooTopNavbar activeTab="Deal Health" />
        <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-20 text-center space-y-4">
          <ShieldAlert className="mx-auto h-10 w-10 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">Deal or Quotation Not Found</p>
          <Link
            to="/v1/deal-health"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] text-white shadow-xs"
          >
            ← Back to Deal Health Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const q = data.quotation;
  const items = data.items || [];
  const alerts = data.alerts || [];
  const summary = data.summary || {};

  const grandTotal = Number(q.grandTotal || 0);
  const subtotal = Number(q.subtotal || 0);
  const discountTotal = Number(q.discountTotal || 0);
  const discountPct = subtotal > 0 ? ((discountTotal / subtotal) * 100).toFixed(1) : '0';
  const marginPct = Number(q.estimatedMarginPct || 0).toFixed(1);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Deal Health" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Top Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              to="/v1/deal-health"
              className="p-2 rounded-lg border border-slate-300 bg-white text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Deal: {q.quoteNumber}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  q.status === 'APPROVED' || q.status === 'CONFIRMED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : q.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : q.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-purple-100 text-purple-800 border border-purple-300'
                }`}>
                  {q.status}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  summary.riskLevel === 'HIGH'
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : summary.riskLevel === 'MEDIUM'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  Risk: {summary.riskLevel}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Account: <strong className="text-slate-800">{q.customerName}</strong> ({q.customerTier} Tier) &bull; Representative: <strong className="text-slate-800">{q.salesRepName}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleNudge}
              disabled={actionInProgress}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#74b9ff] hover:bg-[#0984e3] text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Nudge Rep</span>
            </button>
            <button
              onClick={handleEscalate}
              disabled={actionInProgress}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#ff7675] hover:bg-[#d63031] text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Escalate Deal</span>
            </button>
          </div>
        </div>

        {/* ── Financial & Deal Metrics Overview ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Grand Total Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Subtotal: ₹{subtotal.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Discount Concession</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">
              {discountPct}%
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Total: ₹{discountTotal.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Estimated Margin</p>
            <h3 className="text-2xl font-black text-teal-700 mt-1">
              {marginPct}%
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {Number(marginPct) >= 50 ? 'Healthy Baseline' : 'Sub-Optimal Margin'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Timeline & Delivery</p>
            <h3 className="text-base font-bold text-slate-900 mt-1 truncate">
              {q.promisedDeliveryDate ? new Date(q.promisedDeliveryDate).toLocaleDateString() : 'Immediate / N/A'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Last Active: {q.lastActivityAt ? new Date(q.lastActivityAt).toLocaleDateString() : 'Recent'}
            </p>
          </div>
        </div>

        {/* ── Customer Profile & Risk Signals Banner ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer & Rep Details */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="h-4 w-4 text-[#714b67]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Metadata</h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Company Name:</span>
                <p className="font-bold text-slate-900">{q.customerName}</p>
              </div>
              {q.customerEmail && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{q.customerEmail}</span>
                </div>
              )}
              {q.customerPhone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{q.customerPhone}</span>
                </div>
              )}
              {q.customerBillingAddress && (
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">{q.customerBillingAddress}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium">Assigned Representative:</span>
                <p className="font-bold text-slate-800">{q.salesRepName} ({q.salesRepEmail || 'rep@dealflow.io'})</p>
              </div>
            </div>
          </div>

          {/* Active Risk Signals / Alerts */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Active Health Flags ({alerts.length})
                </h3>
              </div>
            </div>

            {alerts.length === 0 ? (
              <div className="p-6 rounded-lg bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="text-xs font-bold text-emerald-900">No Anomaly Flags for this Quotation</p>
                <p className="text-[11px] text-emerald-700">All pricing rules and turnaround SLAs are healthy.</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {alerts.map((alert) => (
                  <li key={alert.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{alert.alertType}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          alert.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-200 text-slate-700">
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {alert.status === 'OPEN' && (
                        <>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                            disabled={actionInProgress}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleAlertAction(alert.id, 'escalate')}
                            disabled={actionInProgress}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors disabled:opacity-50"
                          >
                            Escalate
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Line Items Breakdown Table ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-[#714b67]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Quotation Line Items ({items.length})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3 px-4">Product & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price (INR)</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Tax (GST)</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                      No line items recorded for this quotation header.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{item.productName}</div>
                        <div className="font-mono text-[11px] text-[#714b67] font-semibold">{item.productSku}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600">
                        {item.categoryName || 'General'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {item.quantity} <span className="text-[10px] text-slate-400 font-normal">({item.unit || 'unit'})</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        ₹{Number(item.unitPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {Number(item.discountPct || 0) > 0 ? (
                          <span className="font-bold text-rose-600">
                            {Number(item.discountPct)}% (₹{Number(item.discountAmount || 0).toLocaleString('en-IN')})
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                        ₹{Number(item.taxAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ₹{Number(item.lineTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Live Discussion & Negotiation Timeline Chat ── */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-[#714b67]" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Deal Discussion & Negotiation Timeline
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Internal & Customer Communications</span>
          </div>

          <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {timeline.map((t) => (
              <li key={t.id} className="text-xs bg-slate-50/80 rounded-lg p-3.5 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={`font-bold ${
                    t.authorType === 'CUSTOMER' ? 'text-blue-700' : 'text-[#714b67]'
                  }`}>
                    {t.kind === 'REQUEST' ? `Negotiation: ${t.requestType}` : (t.authorType === 'CUSTOMER' ? 'Customer Contact' : 'Sales Operations')}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">{t.message}</p>
              </li>
            ))}
            {timeline.length === 0 && (
              <li className="text-xs text-slate-400 italic py-6 text-center">
                No negotiation requests or discussion comments logged yet on this deal.
              </li>
            )}
          </ul>

          {/* Post Message Form */}
          <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              placeholder="Type internal note, client instruction, or team update..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
            />
            <button
              type="submit"
              disabled={actionInProgress || !newMessage.trim()}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Post Note</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
