/**
 * DashboardLayout
 *
 * Shared shell for all authenticated DealFlow360 pages.
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  ShieldCheck, 
  Package, 
  Boxes, 
  CreditCard, 
  Handshake, 
  Activity, 
  BarChart3, 
  LogOut,
  Building2,
  Percent,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

const allNavigationItems = [
  { label: 'Operations Overview', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'] },
  { label: 'Customer Accounts', path: '/dashboard/customers', icon: Building2, roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER'] },
  { label: 'Quotations Hub', path: '/dashboard/quotations', icon: FileSpreadsheet, roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER'] },
  { label: 'Product Catalog SKUs', path: '/dashboard/products', icon: Package, roles: ['ADMIN', 'SALES_REP', 'SALES_MANAGER', 'OPERATIONS'] },
  { label: 'Price Lists & Matrix', path: '/dashboard/pricing', icon: Calculator, roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
  { label: 'Discount Governance', path: '/dashboard/governance', icon: Percent, roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
  { label: 'Approval Chains', path: '/v1/approvals', icon: ShieldCheck, roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
  { label: 'Fulfillment & Stock', path: '/v1/fulfillment', icon: Boxes, roles: ['ADMIN', 'OPERATIONS'] },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const userRole = user?.role || 'SALES_REP';
  const navigationItems = allNavigationItems.filter((item) => item.roles.includes(userRole));

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    clearAuth();
    toast.success('Logged out.');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-gradient-shell)' }}>
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-(--app-color-border) bg-white backdrop-blur">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 px-6 py-4.5 border-b border-(--app-color-border)/70 hover:opacity-90 transition-opacity">
          <img src="/logo.svg" alt="DealFlow360" className="h-7 w-7 object-contain" />
          <div className="flex items-baseline font-bold tracking-tight text-base">
            <span className="text-(--app-color-primary)">DealFlow</span>
            <span className="text-(--app-color-accent) font-extrabold ml-0.5">360</span>
          </div>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
            {userRole.replace('_', ' ')} Workspace
          </div>
          {navigationItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-(--app-color-primary) text-white shadow-sm'
                    : 'text-(--app-color-text) hover:bg-(--app-color-surface-elevated)'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-(--app-color-primary)'}`} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User / logout footer */}
        <div className="border-t border-(--app-color-border) p-3 space-y-1.5 bg-(--app-color-surface-elevated)/60">
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 bg-white border border-(--app-color-border)">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--app-color-primary-soft) text-xs font-bold text-(--app-color-primary)">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-(--app-color-text)">{user?.name ?? 'Sales Officer'}</p>
              <p className="truncate text-[10px] text-(--app-color-text-muted)">{user?.role || user?.email || 'sales@dealflow.io'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-(--app-color-text-muted) hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
