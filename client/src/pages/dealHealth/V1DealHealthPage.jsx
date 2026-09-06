import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  RefreshCw, 
  ShieldAlert, 
  Search, 
  Clock, 
  TrendingDown, 
  Truck, 
  Send, 
  Flame, 
  CheckCircle2, 
  Building2, 
  User, 
  ChevronRight,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1DealHealthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    stalledCount: 0,
    discountAnomalyCount: 0,
    deliverySlippageCount: 0,
    totalAlertsCount: 0,
    totalDealsCount: 0,
  });
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'STALLED' | 'DISCOUNT_ANOMALY' | 'DELIVERY_SLIPPAGE'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/deal-health');
      const data = res.data?.data;
      if (data) {
        setMetrics(data.metrics || {});
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.warn('Deal health fetch note:', err);
      toast.error('Failed to load deal health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  const handleNudge = async (e, quotationId) => {
    e.stopPropagation();
    setActionLoadingId(`nudge-${quotationId}`);
    try {
      await api.post(`/deal-health/${quotationId}/nudge`, {
        message: 'Sales Manager follow-up: Please prioritize and follow up on this deal with the client today.',
      });
      toast.success('Nudge sent to sales representative.');
      fetchHealthData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send nudge');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEscalate = async (e, quotationId) => {
    e.stopPropagation();
    setActionLoadingId(`escalate-${quotationId}`);
    try {
      await api.post(`/deal-health/${quotationId}/escalate`, {
        reason: 'Sales Manager escalation: Unresolved discount anomaly or delivery risk requiring executive alignment.',
      });
      toast.success('Deal escalated to executive review.');
      fetchHealthData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to escalate deal');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    if (selectedFilter !== 'ALL' && item.alertType !== selectedFilter) return false;
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      item.customerName?.toLowerCase().includes(term) ||
      item.quoteNumber?.toLowerCase().includes(term) ||
      item.salesRepName?.toLowerCase().includes(term) ||
      item.issue?.toLowerCase().includes(term) ||
      item.message?.toLowerCase().includes(term)
    );
  });

  const formatDate = (d) => {
    if (!d) return 'Recent';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Deal Health" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">

        {/* ── Filter & Search Toolbar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by deal, customer name, representative, or issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:bg-white focus:ring-1 focus:ring-[#714b67] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'ALL', label: 'All Signals' },
                { id: 'STALLED', label: 'Stalled' },
                { id: 'DISCOUNT_ANOMALY', label: 'Discount Anomaly' },
                { id: 'DELIVERY_SLIPPAGE', label: 'Delivery Slippage' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    selectedFilter === f.id
                      ? 'bg-[#714b67] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchHealthData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-xs shrink-0"
              title="Refresh Deal Signals"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* ── Main Deal Health Table (From Wireframe 14) ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="py-3.5 px-5">Deal</th>
                  <th className="py-3.5 px-5">Issue</th>
                  <th className="py-3.5 px-5 whitespace-nowrap">Flagged</th>
                  <th className="py-3.5 px-5 whitespace-nowrap min-w-[170px]">Action / Status</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap min-w-[210px]">Quick Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-xs text-slate-400">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#714b67] mb-2" />
                      Analyzing deal health signals...
                    </td>
                  </tr>
                ) : filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-xs text-slate-500 space-y-2">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-1" />
                      <p className="font-bold text-slate-800 text-sm">No Active Anomaly Flags</p>
                      <p className="text-slate-400">All deals operating normally within expected sales cycle SLAs.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/v1/deal/${item.quotationId}`)}
                      className="cursor-pointer hover:bg-slate-50/90 transition-colors group"
                    >
                      {/* Column 1: Deal */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 group-hover:text-[#714b67] transition-colors">
                          {item.customerName || 'Customer Account'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span className="font-mono font-bold text-[#714b67]">{item.quoteNumber}</span>
                          <span>&bull;</span>
                          <span>Rep: {item.salesRepName || 'Sales Rep'}</span>
                        </div>
                      </td>

                      {/* Column 2: Issue */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          {item.issue || item.message}
                        </span>
                      </td>

                      {/* Column 3: Flagged */}
                      <td className="py-4 px-5 text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(item.flaggedDate)}
                      </td>

                      {/* Column 4: Action / Status */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-md px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border shrink-0 ${
                            item.status === 'ESCALATED' || item.action === 'Escalated to Manager'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : item.status === 'ACKNOWLEDGED' || item.action === 'Nudge sent'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {item.action || item.status}
                        </span>
                      </td>

                      {/* Column 5: Quick Response Buttons (From Wireframe 14) */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2 shrink-0">
                          <button
                            onClick={(e) => handleEscalate(e, item.quotationId)}
                            disabled={actionLoadingId === `escalate-${item.quotationId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ff7675] hover:bg-[#d63031] text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {actionLoadingId === `escalate-${item.quotationId}` ? 'Escalating...' : 'Escalate'}
                          </button>
                          <button
                            onClick={(e) => handleNudge(e, item.quotationId)}
                            disabled={actionLoadingId === `nudge-${item.quotationId}`}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#74b9ff] hover:bg-[#0984e3] text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0"
                          >
                            {actionLoadingId === `nudge-${item.quotationId}` ? 'Nudging...' : 'Nudge Rep'}
                          </button>
                          <span className="p-1 rounded text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
                            <ChevronRight className="h-4 w-4" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
