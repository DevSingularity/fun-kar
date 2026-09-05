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
  Sun, 
  Moon, 
  LogOut,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

const STAGE_COLUMNS = [
  { key: 'DRAFT', label: 'Draft', badgeColor: 'border-slate-700/80 bg-slate-900/60 text-slate-300' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', badgeColor: 'border-amber-500/40 bg-amber-950/20 text-amber-300' },
  { key: 'APPROVED', label: 'Approved', badgeColor: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300' },
  { key: 'UNDER_NEGOTIATION', label: 'Negotiation', badgeColor: 'border-blue-500/40 bg-blue-950/20 text-blue-300' },
  { key: 'CONFIRMED', label: 'Confirmed', badgeColor: 'border-purple-500/40 bg-purple-950/20 text-purple-300' },
];

export default function V1QuotationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [search, setSearch] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [brightness, setBrightness] = useState(85);

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

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    clearAuth();
    toast.success('Logged out.');
    navigate('/login');
  };

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
        navigate(`/dashboard/quotations/${newId}`);
      } else {
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Official PS Scenario fallback deals for wireframe fidelity when database is empty
  const PS_DEFAULT_DEALS = {
    DRAFT: [
      { id: 'ps-d1', customerName: 'Acme Corp', netAmount: '12400', quoteNumber: 'Q-2026-0001' },
      { id: 'ps-d2', customerName: 'Delta LLC', netAmount: '3200', quoteNumber: 'Q-2026-0002' },
    ],
    PENDING_APPROVAL: [
      { id: 'ps-p1', customerName: 'Beta Industries', netAmount: '28900', quoteNumber: 'Q-2026-0003' },
    ],
    APPROVED: [
      { id: 'ps-a1', customerName: 'Nova Retail', netAmount: '9750', quoteNumber: 'Q-2026-0004' },
    ],
    UNDER_NEGOTIATION: [
      { id: 'ps-n1', customerName: 'Zenith Co', netAmount: '15300', quoteNumber: 'Q-2026-0005' },
    ],
    CONFIRMED: [
      { id: 'ps-c1', customerName: 'Orion Ltd', netAmount: '41000', quoteNumber: 'Q-2026-0006' },
    ],
  };

  // Group quotations by stage
  const getQuotesForColumn = (stageKey) => {
    const dbQuotes = quotations.filter((q) => {
      if (stageKey === 'UNDER_NEGOTIATION') {
        return q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT';
      }
      return q.status === stageKey;
    });

    if (dbQuotes.length > 0) return dbQuotes;
    return PS_DEFAULT_DEALS[stageKey] || [];
  };

  const navTabs = [
    { label: 'Dashboard', path: '/v1/dashboard', active: false },
    { label: 'Quotations', path: '/v1/quotations', active: true },
    { label: 'Approvals', path: '/dashboard/approvals', active: false },
    { label: 'Fulfillment', path: '/dashboard/fulfillment', active: false },
    { label: 'Subscriptions', path: '/dashboard/billing', active: false },
    { label: 'Invoices', path: '/dashboard/billing', active: false },
    { label: 'Deal Health', path: '/dashboard/deal-health', active: false },
    { label: 'Reports', path: '/dashboard/reports', active: false },
    { label: 'Product', path: '/dashboard/products', active: false },
  ];

  const filteredQuotations = quotations.filter((q) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      q.quoteNumber?.toLowerCase().includes(term) ||
      q.customerName?.toLowerCase().includes(term)
    );
  });

  const bgStyle = darkMode 
    ? { backgroundColor: `rgba(18, 20, 24, ${brightness / 100})` }
    : { backgroundColor: '#f8fafc' };

  return (
    <div 
      className={`min-h-screen transition-colors duration-300 flex flex-col font-sans ${
        darkMode ? 'text-slate-100' : 'text-slate-800'
      }`}
      style={bgStyle}
    >
      {/* ── Top Odoo Official Horizontal Navigation Bar ── */}
      <header className="bg-[#4a90e2] text-white shadow-md select-none sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          
          {/* Brand & Tabs */}
          <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
            <Link 
              to="/v1/dashboard" 
              className="font-bold text-lg tracking-tight shrink-0 flex items-center gap-2 hover:opacity-95 transition-opacity"
            >
              <div className="h-7 w-7 rounded-md bg-white/20 flex items-center justify-center font-black text-sm">
                DF
              </div>
              <span className="font-extrabold text-white text-base">DealFlow360</span>
            </Link>

            {/* Horizontal Pill Tabs */}
            <nav className="flex items-center gap-1.5 shrink-0">
              {navTabs.map((tab) => {
                if (tab.active) {
                  return (
                    <div
                      key={tab.label}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#111827] text-white shadow-inner transition-all cursor-default"
                    >
                      {tab.label}
                    </div>
                  );
                }
                return (
                  <Link
                    key={tab.label}
                    to={tab.path}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/90 hover:bg-white/20 hover:text-white transition-all whitespace-nowrap"
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right User Controls */}
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <div className="hidden sm:flex items-center gap-1.5 bg-black/20 rounded-full px-2.5 py-1 border border-white/15 text-[11px] font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user?.role || 'SALES_REP'}</span>
            </div>

            <div className="flex items-center -space-x-1.5">
              <div 
                title={user?.name || 'Primary User'} 
                className="h-8 w-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-[#4a90e2]"
              >
                {user?.name?.[0]?.toUpperCase() || 'P'}
              </div>
              <div 
                title="Governor / Manager" 
                className="h-8 w-8 rounded-full bg-[#0284c7] text-white flex items-center justify-center font-bold text-xs shadow-xs border-2 border-[#4a90e2]"
              >
                G
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Page Title & Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Quotations (List)
            </h1>
            <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
              className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                darkMode 
                  ? 'border-slate-700 bg-slate-900/80 text-white placeholder:text-slate-500 focus:border-[#4a90e2]' 
                  : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-[#4a90e2]'
              }`}
            />
          </div>
        </div>

        {/* ── View Mode: 5-Column Pipeline Kanban (As per Wireframe 3) ── */}
        {viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {STAGE_COLUMNS.map((col) => {
              const quotesInCol = getQuotesForColumn(col.key);
              return (
                <div
                  key={col.key}
                  className={`flex flex-col rounded-2xl border p-4 min-h-[420px] space-y-3 transition-colors ${
                    darkMode 
                      ? 'border-slate-800 bg-slate-900/40 backdrop-blur-xs' 
                      : 'border-slate-200 bg-white/80 shadow-xs'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
                    <h3 className={`text-xs font-bold tracking-wide ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {col.label}
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      {quotesInCol.length}
                    </span>
                  </div>

                  {/* Deals Cards in Column */}
                  <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pt-1">
                    {quotesInCol.map((quote) => {
                      return (
                        <div
                          key={quote.id}
                          onClick={() => {
                            navigate(`/v1/quotations/${quote.id}`);
                          }}
                          className={`group cursor-pointer p-4 rounded-xl border transition-all duration-200 active:scale-98 ${
                            darkMode 
                              ? 'border-slate-700/80 bg-slate-900/90 hover:border-[#4a90e2] hover:bg-slate-800/90 shadow-md' 
                              : 'border-slate-200 bg-white hover:border-[#4a90e2] hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className={`text-xs font-bold group-hover:text-[#4a90e2] transition-colors ${
                              darkMode ? 'text-slate-100' : 'text-slate-800'
                            }`}>
                              {quote.customerName || 'Enterprise Account'}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-400 shrink-0">
                              ₹{Number(quote.grandTotal || quote.netAmount || 0).toLocaleString()}
                            </span>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono text-[10px] bg-slate-800/70 px-1.5 py-0.5 rounded text-slate-300">
                              {quote.quoteNumber || 'Q-2026-0001'}
                            </span>
                            {quote.marginHealth && (
                              <span className={`text-[10px] font-bold ${
                                quote.marginHealth === 'HEALTHY' ? 'text-emerald-400' : 'text-amber-400'
                              }`}>
                                {quote.marginHealth}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Table View ── */
          <div className={`rounded-2xl border overflow-hidden ${
            darkMode ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-white'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className={`border-b font-bold uppercase tracking-wider ${
                  darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}>
                  <tr>
                    <th className="py-3.5 px-4">Quote #</th>
                    <th className="py-3.5 px-4">Customer Account</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Margin Health</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                  {filteredQuotations.map((q) => (
                    <tr 
                      key={q.id}
                      onClick={() => navigate(`/v1/quotations/${q.id}`)}
                      className={`cursor-pointer transition-colors ${
                        darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#4a90e2]">{q.quoteNumber}</td>
                      <td className="py-3.5 px-4 font-semibold">{q.customerName || 'Customer'}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        ₹{Number(q.grandTotal || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold">{q.marginHealth || 'HEALTHY'}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-[#4a90e2] hover:underline inline-flex items-center gap-1 font-semibold">
                          Open <ArrowRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Action Buttons Row (From Wireframe 3) ── */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          
          {/* + New Quotation Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            + New Quotation
          </button>

          {/* Switch to Table / Kanban View Button */}
          <button
            onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              darkMode 
                ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500 hover:bg-slate-800' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {viewMode === 'kanban' ? (
              <>
                <TableIcon className="h-4 w-4 text-[#4a90e2]" />
                Switch to Table View
              </>
            ) : (
              <>
                <Kanban className="h-4 w-4 text-[#4a90e2]" />
                Switch to Pipeline View
              </>
            )}
          </button>

          <Link
            to="/v1/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors ml-auto"
          >
            <span>Back to Sales Dashboard</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>

      {/* ── Bottom Theme Brightness Control Slider ── */}
      <footer className="mt-auto py-4 border-t border-slate-800/80 bg-black/40 backdrop-blur-md">
        <div className="max-w-[400px] mx-auto px-4 flex items-center justify-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            title="Toggle Light / Dark Base"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4 text-amber-500" />}
          </button>
          
          <input
            type="range"
            min="30"
            max="100"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="w-48 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#4a90e2]"
            title="Adjust Canvas Dimness"
          />

          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {brightness}% Dim
          </span>
        </div>
      </footer>

      {/* ── Modal: Create New Quotation ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-5 ${
            darkMode ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-[#4a90e2]" />
                <h3 className="font-bold text-base">New Quotation Header</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">
                  Customer Account <span className="text-rose-400">*</span>
                </label>
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  required
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-medium outline-hidden transition-all ${
                    darkMode 
                      ? 'border-slate-700 bg-slate-800 text-white focus:border-[#4a90e2]' 
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#4a90e2]'
                  }`}
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
                <label className="block font-semibold mb-1 text-slate-300">
                  Promised Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.promisedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, promisedDeliveryDate: e.target.value })}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-medium outline-hidden transition-all ${
                    darkMode 
                      ? 'border-slate-700 bg-slate-800 text-white focus:border-[#4a90e2]' 
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#4a90e2]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-700/50">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
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
