import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Shield, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

const ROLE_BADGES = {
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-300',
  SALES_MANAGER: 'bg-blue-100 text-blue-800 border-blue-300',
  SALES_REP: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  FINANCE: 'bg-amber-100 text-amber-800 border-amber-300',
  OPERATIONS: 'bg-indigo-100 text-indigo-800 border-indigo-300',
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

  // Standard modules as per PS wireframe
  const navTabs = [
    { label: 'Dashboard', path: '/v1/dashboard', id: 'Dashboard' },
    { label: 'Quotations', path: '/v1/quotations', id: 'Quotations' },
    { label: 'Approvals', path: '/v1/approvals', id: 'Approvals' },
    { label: 'Fulfillment', path: '/v1/fulfillment', id: 'Fulfillment' },
    { label: 'Subscriptions', path: '/dashboard/pricing', id: 'Subscriptions' },
    { label: 'Invoices', path: '/dashboard/pricing', id: 'Invoices' },
    { label: 'Deal Health', path: '/dashboard/governance', id: 'Deal Health' },
    { label: 'Reports', path: '/dashboard/customers', id: 'Reports' },
    { label: 'Product', path: '/dashboard/products', id: 'Product' },
  ];

  const userRole = user?.role || 'SALES_REP';

  return (
    <header className="bg-[#714b67] text-white shadow-sm select-none sticky top-0 z-40 border-b border-[#5a3a52]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-13">
        
        {/* Brand & Horizontal Nav Tabs */}
        <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
          <Link 
            to="/v1/dashboard" 
            className="font-bold text-base tracking-tight shrink-0 flex items-center gap-2 text-white hover:opacity-95 transition-opacity"
          >
            <div className="h-7 w-7 rounded bg-white/20 flex items-center justify-center font-black text-xs text-white">
              DF
            </div>
            <span className="font-extrabold text-white text-sm sm:text-base">DealFlow360</span>
          </Link>

          {/* Horizontal Module Tabs */}
          <nav className="flex items-center gap-1 shrink-0">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id || location.pathname === tab.path;
              if (isActive) {
                return (
                  <div
                    key={tab.label}
                    className="px-3.5 py-1.5 rounded-md text-xs font-bold bg-[#1e293b] text-white shadow-xs transition-all cursor-default"
                  >
                    {tab.label}
                  </div>
                );
              }
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold text-white/85 hover:bg-white/15 hover:text-white transition-all whitespace-nowrap"
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right User Information & Role */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          
          {/* Role Badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-black/25 rounded-md px-2.5 py-1 border border-white/15 text-[11px] font-bold text-white tracking-wide">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>{userRole.replace('_', ' ')}</span>
          </div>

          {/* User Avatar & Name */}
          <div className="flex items-center gap-2 pl-1">
            <div 
              title={user?.name || 'User'} 
              className="h-7 w-7 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs border border-white/30"
            >
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-white/95 max-w-[120px] truncate">
              {user?.name || 'Sales User'}
            </span>
          </div>

          {/* Sign Out Button */}
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
  );
}
