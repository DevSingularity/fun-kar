import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

const ROLE_DISPLAY_NAMES = {
  ADMIN: 'Administrator',
  SALES_MANAGER: 'Sales Manager',
  SALES_REP: 'Sales Representative',
  FINANCE: 'Finance Manager',
  OPERATIONS: 'Operations Manager',
};

export default function OdooTopNavbar({ activeTab = 'Dashboard' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    clearAuth();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const userRole = user?.role || 'SALES_REP';

  // Standard modules as per PS wireframe & RBAC matrix
  const allNavTabs = [
    { label: 'Dashboard', path: '/v1/dashboard', id: 'Dashboard', roles: ['ADMIN', 'SALES_REP', 'FINANCE', 'OPERATIONS'] },
    { label: 'Quotations', path: '/v1/quotations', id: 'Quotations', roles: ['ADMIN', 'SALES_REP'] },
    { label: 'Customers', path: '/v1/customers', id: 'Customers', roles: ['ADMIN', 'SALES_REP'] },
    { label: 'Deal Health', path: '/v1/deal-health', id: 'Deal Health', roles: ['ADMIN', 'SALES_MANAGER'] },
    { label: 'Approvals', path: '/v1/approvals', id: 'Approvals', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'] },
    { label: 'Fulfillment', path: '/v1/fulfillment', id: 'Fulfillment', roles: ['ADMIN', 'OPERATIONS', 'FINANCE'] },
    { label: 'Invoices', path: '/v1/invoices', id: 'Invoices', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'] },
    { label: 'Subscriptions', path: '/v1/subscriptions', id: 'Subscriptions', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS'] },
    { label: 'Reconciliation', path: '/v1/reconciliation', id: 'Reconciliation', roles: ['ADMIN', 'FINANCE'] },
    { label: 'Pricing Matrix', path: '/v1/pricing', id: 'Pricing', roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] },
    { label: 'Governance', path: '/v1/governance', id: 'Governance', roles: ['ADMIN'] },
    { label: 'Catalog SKUs', path: '/v1/products', id: 'Product', roles: ['ADMIN', 'SALES_REP', 'OPERATIONS'] },
  ];

  const navTabs = allNavTabs.filter((tab) => tab.roles.includes(userRole));

  return (
    <header className="bg-[#714b67] text-white shadow-sm select-none sticky top-0 z-40 border-b border-[#5a3a52]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">

        {/* Brand & Horizontal Nav Tabs */}
        <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
          <Link
            to={userRole === 'SALES_MANAGER' ? '/v1/deal-health' : '/v1/dashboard'}
            className="font-bold text-base tracking-tight shrink-0 flex items-center gap-2.5 text-white hover:opacity-95 transition-opacity group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 shadow-xs group-hover:bg-white/15 transition-all">
              <img src="/logo.svg" alt="DealFlow360 Logo" className="h-full w-full object-contain" />
            </div>
            {/* <div className="flex flex-col">
              <span className="font-extrabold text-white text-sm sm:text-base leading-tight tracking-tight">
                DealFlow<span className="text-teal-300">360</span>
              </span>
              <span className="text-[9px] font-semibold text-white/70 uppercase tracking-wider hidden sm:inline">
                Sales Operations
              </span>
            </div> */}
          </Link>

          {/* Vertical Separator */}
          <div className="h-6 w-px bg-white/20 shrink-0 hidden md:block" />

          {/* Horizontal Module Tabs */}
          <nav className="flex items-center gap-1 shrink-0">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id || location.pathname === tab.path;
              if (isActive) {
                return (
                  <div
                    key={tab.label}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1e293b] text-white shadow-xs transition-all cursor-default flex items-center gap-1.5"
                  >
                    <span>{tab.label}</span>
                  </div>
                );
              }
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/85 hover:bg-white/15 hover:text-white transition-all whitespace-nowrap"
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right User Information & Role */}
        <div className="flex items-center gap-3 shrink-0 ml-4">

          {/* Role Badge
          <div className="hidden sm:flex items-center gap-1.5 bg-black/25 rounded-lg px-2.5 py-1 border border-white/15 text-[11px] font-bold text-white tracking-wide shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{ROLE_DISPLAY_NAMES[userRole] || userRole}</span>
          </div> */}

          {/* User Avatar & Name */}
          <div className="flex items-center gap-2 pl-1">
            <div
              title={`${user?.name || 'User'} (${user?.email || ''})`}
              className="h-8 w-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs border border-white/30 shadow-2xs"
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-white/95 max-w-[130px] truncate leading-tight">
                {user?.name || 'Sales User'}
              </span>
              <span className="text-[10px] text-white/70 max-w-[130px] truncate leading-tight">
                {user?.email || ''}
              </span>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
