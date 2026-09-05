import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Plus, 
  Table as TableIcon, 
  Kanban, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  AlertCircle, 
  Search, 
  Filter, 
  X, 
  Building2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

const STAGE_COLUMNS = [
  { key: 'DRAFT', label: 'Draft', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200' },
  { key: 'APPROVED', label: 'Approved', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: 'UNDER_NEGOTIATION', label: 'Negotiation', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
  { key: 'CONFIRMED', label: 'Confirmed', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
];

export default function V1QuotationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [search, setSearch] = useState('');

  // New Quote Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    promisedDeliveryDate: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [quotesRes, custRes] = await Promise.all([
        api.get('/quotations', { params: { limit: 100 } }),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      const quotes = quotesRes.data?.data || [];
      const custs = custRes.data?.data || [];
      setQuotations(quotes);
      setCustomers(custs);
      if (custs.length > 0 && !formData.customerId) {
        setFormData((prev) => ({ ...prev, customerId: custs[0].id }));
      }
    } catch (err) {
      console.warn('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (!formData.customerId) {
      toast.error('Please select a customer account');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/quotations', {
        customerId: formData.customerId,
        promisedDeliveryDate: formData.promisedDeliveryDate || undefined,
      });
      toast.success('Draft quotation created');
      setShowCreateModal(false);
      const newId = res.data?.data?.quotation?.id || res.data?.data?.id;
      if (newId) {
        navigate(`/v1/quotations/${newId}`);
      } else {
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Group quotations by stage strictly from live DB
  const getQuotesForColumn = (stageKey) => {
    return quotations.filter((q) => {
      const matchesSearch = !search
        ? true
        : q.quoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
          q.customerName?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (stageKey === 'UNDER_NEGOTIATION') {
        return q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT';
      }
      return q.status === stageKey;
    });
  };

  const filteredQuotations = quotations.filter((q) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      q.quoteNumber?.toLowerCase().includes(term) ||
      q.customerName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Quotations" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Quotations (List)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Every quotation in the system, one row per quotation, click a row to open it
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search deals or accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all shadow-xs"
            />
          </div>
        </div>

        {/* ── View Mode: 5-Column Pipeline Kanban ── */}
        {loading ? (
          <div className="py-20 text-center rounded-xl border border-slate-200 bg-white p-8">
            <p className="text-xs font-semibold text-slate-400">Loading quotations from database...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAGE_COLUMNS.map((col) => {
              const quotesInCol = getQuotesForColumn(col.key);
              return (
                <div
                  key={col.key}
                  className="flex flex-col rounded-xl border border-slate-200 bg-slate-100/60 p-4 min-h-[440px] space-y-3"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <h3 className="text-xs font-bold tracking-wide text-slate-700">
                      {col.label}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-extrabold bg-white text-slate-600 border border-slate-200 shadow-xs">
                      {quotesInCol.length}
                    </span>
                  </div>

                  {/* Deals Cards in Column */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto no-scrollbar pt-1">
                    {quotesInCol.length === 0 ? (
                      <div className="h-32 flex items-center justify-center text-center p-3">
                        <span className="text-[11px] text-slate-400 font-medium italic">
                          No quotations in this stage
                        </span>
                      </div>
                    ) : (
                      quotesInCol.map((quote) => (
                        <div
                          key={quote.id}
                          onClick={() => navigate(`/v1/quotations/${quote.id}`)}
                          className="group cursor-pointer p-3.5 rounded-lg border border-slate-200 bg-white hover:border-[#714b67] hover:shadow-sm transition-all duration-150 active:scale-98 shadow-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#714b67] transition-colors truncate">
                              {quote.customerName || 'Enterprise Account'}
                            </span>
                            <span className="text-xs font-black text-[#008784] shrink-0">
                              ₹{Number(quote.grandTotal || quote.netAmount || 0).toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                            <span className="font-mono text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                              {quote.quoteNumber || 'Q-DRAFT'}
                            </span>
                            {quote.marginHealth && (
                              <span className={`text-[10px] font-extrabold ${
                                quote.marginHealth === 'HEALTHY' ? 'text-emerald-600' : 'text-amber-600'
                              }`}>
                                {quote.marginHealth}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Dense Table View ── */
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Quote #</th>
                    <th className="py-3 px-4">Customer Account</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Margin Health</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredQuotations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                        No quotations match your criteria. Click "+ New Quotation" to create one.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotations.map((q) => (
                      <tr 
                        key={q.id}
                        onClick={() => navigate(`/v1/quotations/${q.id}`)}
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#714b67]">{q.quoteNumber}</td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{q.customerName || 'Customer'}</td>
                        <td className="py-3 px-4 font-extrabold text-[#008784]">
                          ₹{Number(q.grandTotal || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold">{q.marginHealth || 'HEALTHY'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[#008784] hover:underline inline-flex items-center gap-1 font-bold">
                            Open <ArrowRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Action Buttons Row ── */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          
          {/* + New Quotation Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98"
          >
            <Plus className="h-4 w-4" />
            + New Quotation
          </button>

          {/* Switch to Table / Pipeline View Button */}
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs"
          >
            {viewMode === 'kanban' ? (
              <>
                <TableIcon className="h-4 w-4 text-[#714b67]" />
                Switch to Table View
              </>
            ) : (
              <>
                <Kanban className="h-4 w-4 text-[#714b67]" />
                Switch to Pipeline View
              </>
            )}
          </button>

          <Link
            to="/v1/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors ml-auto"
          >
            <span>Back to Sales Dashboard</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      {/* ── Modal: Create New Quotation ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl space-y-5 text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#714b67]" />
                <h3 className="font-bold text-base text-slate-900">New Quotation Header</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1 text-slate-700">
                  Customer Account <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                >
                  <option value="" disabled>Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier} Tier) — {c.country || 'Global'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold mb-1 text-slate-700">
                  Promised Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.promisedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, promisedDeliveryDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-medium text-slate-800 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create & Open Builder →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
