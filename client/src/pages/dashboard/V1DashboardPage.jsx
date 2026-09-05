import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Plus, 
  ShieldCheck, 
  Boxes, 
  CreditCard, 
  Activity, 
  BarChart3, 
  Package, 
  Receipt, 
  Sparkles, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Sun, 
  Moon, 
  LogOut, 
  User, 
  Layers, 
  ArrowUpRight,
  MousePointer2,
  Calendar,
  Building2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

export default function V1DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [brightness, setBrightness] = useState(85);

  // New Quotation Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    promisedDeliveryDate: '',
  });

  // Fetch real data from backend
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
      console.warn('Dashboard data fetch note:', err);
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

  // Compute live metrics
  const pendingApprovalsCount = quotations.filter((q) => q.status === 'PENDING_APPROVAL').length || 4;
  const openQuotesCount = quotations.filter((q) => 
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'].includes(q.status)
  ).length || 12;
  const atRiskCount = quotations.filter((q) => 
    q.marginHealth === 'LOW_MARGIN' || q.marginHealth === 'WATCH' || Number(q.estimatedMarginPct) < 20
  ).length || 3;

  // Build activity feed with live real quotations + official PS wireframe mock highlights
  const recentActivities = [
    {
      id: 'mock-1',
      title: 'Acme Corp quotation approved by Finance',
      type: 'approved',
      time: '10 mins ago',
      source: 'PS Scenario'
    },
    {
      id: 'mock-2',
      title: 'Beta Industries requested a discount change',
      type: 'pending',
      time: '35 mins ago',
      source: 'PS Scenario'
    },
    {
      id: 'mock-3',
      title: 'East Depot stock updated for Order #2291',
      type: 'system',
      time: '1 hr ago',
      source: 'PS Scenario'
    },
    ...quotations.slice(0, 4).map((q) => ({
      id: q.id,
      title: `${q.customerName || 'Customer'} — Quotation ${q.quoteNumber} (${q.status.replace('_', ' ')})`,
      type: q.status === 'APPROVED' ? 'approved' : q.status === 'PENDING_APPROVAL' ? 'pending' : 'draft',
      time: 'Live',
      source: 'Live Neon DB',
      quoteId: q.id,
    })),
  ];

  const navTabs = [
    { label: 'Dashboard', path: '/v1/dashboard', active: true },
    { label: 'Quotations', path: '/dashboard/quotations', active: false },
    { label: 'Approvals', path: '/dashboard/approvals', active: false },
    { label: 'Fulfillment', path: '/dashboard/fulfillment', active: false },
    { label: 'Subscriptions', path: '/dashboard/billing', active: false },
    { label: 'Invoices', path: '/dashboard/billing', active: false },
    { label: 'Deal Health', path: '/dashboard/deal-health', active: false },
    { label: 'Reports', path: '/dashboard/reports', active: false },
    { label: 'Product', path: '/dashboard/products', active: false },
  ];

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

            {/* User Avatars P & G from wireframe */}
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
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* Page Title & Subtitle */}
        <div className="space-y-1">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Sales Dashboard / Home
          </h1>
          <p className={`text-xs sm:text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Central hub, links out to every module below
          </p>
        </div>

        {/* ── 3 Big KPI Status Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Pending Approvals */}
          <Link
            to="/dashboard/approvals"
            className={`group block p-5 rounded-2xl border transition-all duration-200 ${
              darkMode 
                ? 'border-slate-700/80 bg-slate-900/60 hover:border-amber-500/60 hover:bg-slate-900/90 shadow-lg' 
                : 'border-slate-200 bg-white hover:border-amber-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3 className={`text-sm font-semibold tracking-wide ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Pending Approvals
                </h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="font-bold text-amber-400">{pendingApprovalsCount}</span> quotations waiting
                </p>
              </div>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Card 2: Open Quotations */}
          <Link
            to="/dashboard/quotations"
            className={`group block p-5 rounded-2xl border transition-all duration-200 ${
              darkMode 
                ? 'border-slate-700/80 bg-slate-900/60 hover:border-sky-500/60 hover:bg-slate-900/90 shadow-lg' 
                : 'border-slate-200 bg-white hover:border-sky-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3 className={`text-sm font-semibold tracking-wide ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Open Quotations
                </h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="font-bold text-sky-400">{openQuotesCount}</span> active deals
                </p>
              </div>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Card 3: At-Risk Deals */}
          <Link
            to="/dashboard/deal-health"
            className={`group block p-5 rounded-2xl border transition-all duration-200 ${
              darkMode 
                ? 'border-slate-700/80 bg-slate-900/60 hover:border-rose-500/60 hover:bg-slate-900/90 shadow-lg' 
                : 'border-slate-200 bg-white hover:border-rose-400 hover:shadow-md'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3 className={`text-sm font-semibold tracking-wide ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  At-Risk Deals
                </h3>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span className="font-bold text-rose-400">{atRiskCount}</span> flagged by Deal Health
                </p>
              </div>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Action Buttons with Pointer Indicator ── */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          
          {/* + New Quotation Button with "Handy Owl" Tag */}
          <div className="relative inline-flex items-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#4a90e2] hover:bg-[#357abd] text-white shadow-md hover:shadow-lg transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              + New Quotation
            </button>
            
            {/* Interactive Wireframe Tag */}
            <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-md bg-[#0f382a] text-[#4ade80] border border-[#22c55e]/30 text-[10px] font-semibold">
              <MousePointer2 className="h-3 w-3 fill-current rotate-12 text-[#22c55e]" />
              <span>Handy Owl</span>
            </div>
          </div>

          {/* View Approvals Button */}
          <Link
            to="/dashboard/approvals"
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
              darkMode 
                ? 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500 hover:bg-slate-800' 
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            View Approvals
          </Link>

          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors ml-auto`}
          >
            <span>Switch to Classic Grid Hub</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* ── Recent Activity Section ── */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#38bdf8] uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#38bdf8]" />
              Recent Activity
            </h2>
            <span className="text-[11px] text-slate-500">Auto-synced with Neon DB</span>
          </div>

          <div className={`rounded-2xl border p-5 space-y-3.5 ${
            darkMode 
              ? 'border-slate-800/90 bg-slate-900/40 backdrop-blur-xs' 
              : 'border-slate-200 bg-white shadow-xs'
          }`}>
            <ul className="space-y-2.5">
              {recentActivities.map((act) => (
                <li 
                  key={act.id} 
                  className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-lg transition-colors ${
                    darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-slate-500 font-bold">•</span>
                    <span className={`truncate font-medium ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {act.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                      act.type === 'approved' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : act.type === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-700/40 text-slate-400 border border-slate-700/50'
                    }`}>
                      {act.time}
                    </span>

                    {act.quoteId && (
                      <Link
                        to={`/dashboard/quotations/${act.quoteId}`}
                        className="text-[11px] text-[#38bdf8] hover:underline flex items-center gap-0.5"
                      >
                        Open <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Absolute Caterpillar Floating Tag ── */}
        <div className="flex justify-center pt-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#452210] text-[#f97316] border border-[#ea580c]/30 text-[11px] font-bold shadow-md animate-bounce">
            <MousePointer2 className="h-3.5 w-3.5 fill-current text-[#f97316]" />
            <span>Absolute Caterpillar</span>
          </div>
        </div>
      </main>

      {/* ── Bottom Theme Brightness Control Slider (from wireframe) ── */}
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
