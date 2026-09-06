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
import Spinner from '../../components/Spinner.jsx';

const STAGE_COLUMNS = [
  { key: 'DRAFT', label: 'Draft', badgeColor: 'bg-slate-100 text-slate-700 border-slate-200', dotColor: 'bg-slate-400' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval', badgeColor: 'bg-amber-50 text-amber-800 border-amber-200', dotColor: 'bg-amber-500' },
  { key: 'APPROVED', label: 'Approved', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200', dotColor: 'bg-emerald-500' },
  { key: 'UNDER_NEGOTIATION', label: 'Negotiation', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200', dotColor: 'bg-blue-500' },
  { key: 'CONFIRMED', label: 'Confirmed', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200', dotColor: 'bg-purple-500' },
];

export default function V1QuotationsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [search, setSearch] = useState('');

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
    } catch (err) {
      console.warn('Failed to load quotations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    <div className="h-screen max-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans overflow-hidden">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Quotations" />

      {/* ── Main Content Area (Fixed Viewport, No Window Scrolling) ── */}
      <main className="flex-1 flex flex-col w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 min-h-0 overflow-hidden space-y-3">
        
        {/* Top Header & Search Toolbar */}
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Quotations & Commercial Pipeline</h1>
            <p className="text-xs text-slate-500 font-medium">
              Manage draft deals, pending approvals, and confirmed enterprise orders
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search deals or accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all shadow-xs"
              />
            </div>

            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition-colors inline-flex items-center gap-1.5"
            >
              {viewMode === 'kanban' ? <TableIcon className="h-3.5 w-3.5 text-[#714b67]" /> : <Kanban className="h-3.5 w-3.5 text-[#714b67]" />}
              <span>{viewMode === 'kanban' ? 'Table' : 'Kanban'}</span>
            </button>

            {['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(user?.role) && (
              <button
                onClick={() => navigate('/v1/quotations/new')}
                className="px-4 py-1.5 rounded-lg bg-[#714b67] hover:bg-[#5a3a52] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> + New Quote
              </button>
            )}
          </div>
        </div>

        {/* ── View Mode: 5-Column Pipeline Kanban with Individual Column Scroll ── */}
        {loading ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 text-center rounded-xl border border-slate-200 bg-white p-8 shadow-xs">
            <Spinner size="lg" variant="primary" />
            <p className="text-xs font-semibold text-slate-500 animate-pulse">Loading quotations from database...</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="flex-1 min-h-0 flex lg:grid lg:grid-cols-5 gap-3.5 overflow-x-auto overflow-y-hidden pb-1">
            {STAGE_COLUMNS.map((col) => {
              const quotesInCol = getQuotesForColumn(col.key);
              const colTotal = quotesInCol.reduce((sum, q) => sum + Number(q.grandTotal || q.netAmount || 0), 0);
              return (
                <div
                  key={col.key}
                  className="flex flex-col h-full max-h-full rounded-xl border border-slate-200/90 bg-slate-100/70 p-3 shadow-2xs w-[260px] sm:w-[280px] lg:w-auto shrink-0 lg:shrink min-w-[230px] lg:min-w-0 overflow-hidden"
                >
                  {/* Column Header */}
                  <div className="shrink-0 flex items-center justify-between pb-2 border-b border-slate-200/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${col.dotColor || 'bg-slate-400'}`} />
                      <h3 className="text-xs font-bold tracking-wide text-slate-700 truncate">
                        {col.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-extrabold bg-white text-slate-600 border border-slate-200 shadow-2xs">
                        {quotesInCol.length}
                      </span>
                    </div>
                  </div>

                  {/* Column Total Subtext */}
                  {quotesInCol.length > 0 && (
                    <div className="shrink-0 flex items-center justify-between py-1 text-[10px] text-slate-400 font-semibold border-b border-slate-200/40 mb-1">
                      <span>Total</span>
                      <span className="text-slate-600 font-bold">₹{colTotal.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Deals Cards in Column - with independent vertical scroll */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-0 pt-1">
                    {quotesInCol.length === 0 ? (
                      <div className="h-full min-h-[120px] flex flex-col items-center justify-center text-center p-4">
                        <Layers className="h-6 w-6 text-slate-300 mb-1" />
                        <span className="text-[11px] text-slate-400 font-medium italic">
                          No quotations in this stage
                        </span>
                      </div>
                    ) : (
                      quotesInCol.map((quote) => (
                        <div
                          key={quote.id}
                          onClick={() => navigate(`/v1/quotations/${quote.id}`)}
                          className="group cursor-pointer p-3 rounded-lg border border-slate-200/90 bg-white hover:border-[#714b67] hover:shadow-md transition-all duration-150 active:scale-[0.99] shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#714b67] transition-colors truncate" title={quote.customerName}>
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
          /* ── Dense Table View (Independent Scrollable Container) ── */
          <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs flex flex-col">
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider shadow-2xs">
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
                        {['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(user?.role)
                          ? 'No quotations match your criteria. Click "+ New Quotation" to create one.'
                          : 'No quotations found matching your criteria.'}
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

        {/* ── Action Buttons Row (Always Visible at Bottom without Scrolling) ── */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/80 bg-[#f8f9fa]">
          
          <div className="flex items-center gap-3">
            {/* New Quotation Button (Strictly gated for Sales & Admin personas) */}
            {['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(user?.role) && (
              <button
                onClick={() => navigate('/v1/quotations/new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98"
              >
                <Plus className="h-4 w-4" />
                <span>New Quotation</span>
              </button>
            )}

            {/* Switch to Table / Pipeline View Button */}
            <button
              onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs"
            >
              {viewMode === 'kanban' ? (
                <>
                  <TableIcon className="h-4 w-4 text-[#714b67]" />
                  <span>Switch to Table View</span>
                </>
              ) : (
                <>
                  <Kanban className="h-4 w-4 text-[#714b67]" />
                  <span>Switch to Pipeline View</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              Showing <span className="font-bold text-slate-800">{filteredQuotations.length}</span> total quotations
            </div>

            <Link
              to="/v1/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              <span>Back to Sales Dashboard</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
