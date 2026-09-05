import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, 
  Plus, 
  ShieldCheck, 
  Boxes, 
  Activity, 
  BarChart3, 
  Package, 
  Clock, 
  CheckCircle2, 
  Layers, 
  ArrowUpRight,
  Building2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';
import OdooTopNavbar from '../../components/layout/OdooTopNavbar.jsx';

export default function V1DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [customers, setCustomers] = useState([]);

  // Fetch real data from backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const [overviewRes, custRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/customers', { params: { limit: 100 } }),
      ]);
      setDashboardData(overviewRes.data?.data || null);
      setCustomers(custRes.data?.data || []);
    } catch (err) {
      console.warn('Dashboard overview fetch fallback:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real live metrics from server
  const metrics = dashboardData?.metrics || {};
  const pendingApprovalsCount = metrics.pendingApprovalsCount ?? 0;
  const openQuotesCount = metrics.openQuotationsCount ?? 0;
  const atRiskCount = metrics.atRiskDealsCount ?? 0;

  // Real live activity feed from audit logs
  const recentActivities = dashboardData?.recentActivities || [];

  // Role-aware navigation destinations
  const isApprover = ['SALES_MANAGER', 'FINANCE', 'ADMIN'].includes(user?.role);
  const hasDealHealthAccess = ['SALES_MANAGER', 'ADMIN'].includes(user?.role);
  const approvalsTarget = isApprover ? '/v1/approvals' : '/v1/quotations';
  const atRiskTarget = hasDealHealthAccess ? '/v1/deal-health' : isApprover ? '/v1/approvals' : '/v1/quotations';

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
      {/* ── Enterprise Global Navbar ── */}
      <OdooTopNavbar activeTab="Dashboard" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* ── 3 Big KPI Status Summary Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: Pending Approvals */}
          <Link
            to={approvalsTarget}
            className="group block p-6 rounded-xl border border-slate-200 bg-white hover:border-[#714b67] hover:shadow-md transition-all duration-200 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#714b67] transition-colors">
                  Pending Approvals
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  <span className="font-extrabold text-amber-600 text-sm">{pendingApprovalsCount}</span> quotations waiting
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Card 2: Open Quotations */}
          <Link
            to="/v1/quotations"
            className="group block p-6 rounded-xl border border-slate-200 bg-white hover:border-[#008784] hover:shadow-md transition-all duration-200 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-[#008784] transition-colors">
                  Open Quotations
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  <span className="font-extrabold text-[#008784] text-sm">{openQuotesCount}</span> active deals
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-50 text-[#008784] border border-teal-200 group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
            </div>
          </Link>

          {/* Card 3: At-Risk Deals */}
          <Link
            to={atRiskTarget}
            className="group block p-6 rounded-xl border border-slate-200 bg-white hover:border-rose-400 hover:shadow-md transition-all duration-200 shadow-xs"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-800 group-hover:text-rose-600 transition-colors">
                  At-Risk Deals
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  <span className="font-extrabold text-rose-600 text-sm">{atRiskCount}</span> flagged by Deal Health
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 group-hover:scale-105 transition-transform">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </Link>
        </div>

        {/* ── Action Buttons Row ── */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* New Quotation Button (Strictly gated for Sales & Admin personas) */}
          {['SALES_REP', 'SALES_MANAGER', 'ADMIN'].includes(user?.role) && (
            <button
              onClick={() => navigate('/v1/quotations/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-[#714b67] hover:bg-[#5a3a52] text-white shadow-xs hover:shadow-sm transition-all active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>New Quotation</span>
            </button>
          )}

          {/* View Approvals Button */}
          <Link
            to={approvalsTarget}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs"
          >
            {isApprover ? 'View Approvals' : 'View Pending Deals'}
          </Link>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors ml-auto"
          >
            <span>Switch to Classic Workspace</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* ── Recent Activity Section ── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[#008784] uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#008784]" />
              Recent Activity
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Real-Time Event Stream</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                Loading live activity stream...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No recent activity recorded yet. Create a quotation to begin.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentActivities.map((act) => (
                  <li 
                    key={act.id} 
                    className="flex items-center justify-between text-xs py-3 px-2 hover:bg-slate-50/80 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-slate-400 font-bold">•</span>
                      <span className="truncate font-semibold text-slate-700">
                        {act.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        act.type === 'approved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : act.type === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {act.time}
                      </span>

                      {act.quoteId && (
                        <Link
                          to={`/v1/quotations/${act.quoteId}`}
                          className="text-[11px] font-bold text-[#008784] hover:underline flex items-center gap-0.5"
                        >
                          Open <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
