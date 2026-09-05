/**
 * DashboardLayout
 *
 * Shared shell for all authenticated DealFlow360 pages.
 * Shared shell for all authenticated DealFlow360 pages.
 */
import { useEffect } from 'react';
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

const navigationItems = [
  { label: 'Operations Overview', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Customer Accounts', path: '/dashboard/customers', icon: Building2 },
  { label: 'Product Catalog SKUs', path: '/dashboard/products', icon: Package },
  { label: 'Price Lists & Matrix', path: '/dashboard/pricing', icon: Calculator },
  { label: 'Discount Governance', path: '/dashboard/governance', icon: Percent },
  { label: 'Quotations Hub', path: '/dashboard/quotations', icon: FileSpreadsheet },
  { label: 'Approval Chains', path: '/dashboard/approvals', icon: ShieldCheck },
  { label: 'Fulfillment & Stock', path: '/dashboard/fulfillment', icon: Boxes },
  { label: 'Hybrid Billing', path: '/dashboard/billing', icon: CreditCard },
  { label: 'Customer Deal Room', path: '/dashboard/deal-room', icon: Handshake },
  { label: 'Deal Health Radar', path: '/dashboard/deal-health', icon: Activity },
  { label: 'Executive Reports', path: '/dashboard/reports', icon: BarChart3 },
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

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
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-(--app-color-border) bg-white backdrop-blur">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 px-6 py-4.5 border-b border-(--app-color-border)/70 hover:opacity-90 transition-opacity">
          <img src="/logo.svg" alt="DealFlow360" className="h-7 w-7 object-contain" />
          <div className="flex items-baseline font-bold tracking-tight text-base">
            <span className="text-(--app-color-primary)">DealFlow</span>
            <span className="text-(--app-color-accent) font-extrabold ml-0.5">360</span>
          </div>
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
            Sales Operations
          </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted)">
            Sales Operations
          </div>
          {navigationItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-(--app-color-primary) text-white shadow-sm'
                    : 'text-(--app-color-text) hover:bg-(--app-color-surface-elevated)'
                    ? 'bg-(--app-color-primary) text-white shadow-sm'
                    : 'text-(--app-color-text) hover:bg-(--app-color-surface-elevated)'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-(--app-color-primary)'}`} />
                <span className="truncate">{label}</span>
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
        <div className="border-t border-(--app-color-border) p-3 space-y-1.5 bg-(--app-color-surface-elevated)/60">
          <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 bg-white border border-(--app-color-border)">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-(--app-color-primary-soft) text-xs font-bold text-(--app-color-primary)">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-(--app-color-text)">{user?.name ?? 'Sales Officer'}</p>
              <p className="truncate text-[10px] text-(--app-color-text-muted)">{user?.role || user?.email || 'sales@dealflow.io'}</p>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-(--app-color-text)">{user?.name ?? 'Sales Officer'}</p>
              <p className="truncate text-[10px] text-(--app-color-text-muted)">{user?.role || user?.email || 'sales@dealflow.io'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-(--app-color-text-muted) hover:bg-red-50 hover:text-red-600 transition-colors"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-(--app-color-text-muted) hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
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
