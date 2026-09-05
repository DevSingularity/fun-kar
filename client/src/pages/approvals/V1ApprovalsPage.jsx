import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Info,
  ShieldAlert,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1ApprovalsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/approval-requests', {
        params: {
          status: pendingOnly ? 'PENDING' : 'ALL',
          limit: 100,
        },
      });
      setApprovalRequests(res.data?.data || []);
    } catch (err) {
      console.warn('Approvals list fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pendingOnly]);

  const displayList = approvalRequests;

  const filteredList = displayList.filter((item) => {
    if (pendingOnly && item.status !== 'PENDING') return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      item.quoteNumber?.toLowerCase().includes(term) ||
      item.customerName?.toLowerCase().includes(term) ||
      item.salesRepName?.toLowerCase().includes(term)
    );
  });

  const pendingCount = displayList.filter((a) => a.status === 'PENDING').length;
  const returnedCount = displayList.filter((a) => a.status === 'RETURNED').length;
  const approvedCount = displayList.filter((a) => a.status === 'APPROVED').length;

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Approvals" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        
        {/* Top Controls: 3 Summary Pill Badges & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Pending Pill */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white shadow-xs">
              <span>{pendingCount} Pending</span>
            </div>

            {/* Returned Pill */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-400 text-white shadow-xs">
              <span>{returnedCount} Returned</span>
            </div>

            {/* Approved Pill */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-white shadow-xs">
              <span>{approvedCount} Approved</span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search approvals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 outline-hidden focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67] transition-all shadow-xs"
            />
          </div>
        </div>

        {/* ── Dense / Clean Table View (From Wireframe 5) ── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Quotation</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Blended Risk</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      Loading discount approval requests...
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-medium">
                      No approval requests found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const riskScore = Number(item.blendedRiskScore || 0);
                    const riskLabel = riskScore >= 25 ? 'HIGH' : riskScore >= 10 ? 'MEDIUM' : 'LOW';
                    const riskBadgeClass =
                      riskLabel === 'HIGH'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : riskLabel === 'MEDIUM'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    const stageDisplay =
                      item.status === 'APPROVED'
                        ? 'Auto-Approved'
                        : item.currentStep === 'FINANCE'
                        ? 'Finance'
                        : 'Sales Manager';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => navigate(`/v1/approvals/${item.id}`)}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-[#714b67]">
                          {item.quoteNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          {item.customerName || 'Customer'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${riskBadgeClass}`}>
                            {riskLabel} ({riskScore}%)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {stageDisplay}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {item.salesRepName || 'Sales Rep'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="text-[#008784] hover:underline inline-flex items-center gap-1 font-bold">
                            Review <ArrowRight className="h-3 w-3" />
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Live Policy Yellow Callout Banner (From Wireframe 5) ── */}
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              Click any row to open its full approval detail, risk breakdown, and audit trail.
            </span>
          </div>
        </div>

        {/* ── Filter Button (From Wireframe 5) ── */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={() => setPendingOnly(!pendingOnly)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border transition-all shadow-xs ${
              pendingOnly
                ? 'bg-[#714b67] text-white border-[#714b67]'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Filter: Pending Only</span>
          </button>

          <Link
            to="/v1/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors ml-auto"
          >
            <span>Back to Dashboard</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </main>
    </div>
  );
}
