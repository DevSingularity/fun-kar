import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, UserCheck, ShieldAlert, Sparkles, MessageSquare, User, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerNavbar({ customerUser }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handlePortalLogout = () => {
    localStorage.removeItem('portalToken');
    localStorage.removeItem('customer_portal_token');
    toast.success('Signed out from Customer Portal');
    navigate('/v1/customer');
  };

  const navLinks = [{ label: 'My Quotations', path: '/v1/customer' }];

  return (
    <header className="bg-[#714b67] text-white shadow-sm select-none sticky top-0 z-40 border-b border-[#5a3a52]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-13">
        
        {/* Brand & Customer Nav Links */}
        <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
          <Link
            to="/v1/customer"
            className="font-bold text-base tracking-tight shrink-0 flex items-center gap-2 text-white hover:opacity-95 transition-opacity"
          >
            <div className="h-7 w-7 rounded bg-amber-400 text-slate-900 flex items-center justify-center font-black text-xs shadow-xs">
              CP
            </div>
            <span className="font-extrabold text-white text-sm sm:text-base">DealFlow360 Customer Portal</span>
          </Link>

          {/* Customer Module Tabs */}
          <nav className="flex items-center gap-1 shrink-0">
            {navLinks.map((tab) => {
              const isActive = location.pathname === tab.path || (tab.path === '/v1/customer' && location.pathname.startsWith('/v1/customer/'));
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1e293b] text-white shadow-xs'
                      : 'text-white/85 hover:bg-white/15 hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Customer Info & Logout */}
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <div className="hidden sm:flex items-center gap-1.5 bg-amber-400/20 text-amber-200 rounded-md px-2.5 py-1 border border-amber-300/30 text-[10px] font-extrabold tracking-wider uppercase">
            <UserCheck className="h-3 w-3 text-amber-300" />
            <span>Customer Session</span>
          </div>

          <div className="flex items-center gap-2 pl-1">
            <div
              title={customerUser?.name || 'Customer Contact'}
              className="h-7 w-7 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs border border-white/30"
            >
              {customerUser?.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <span className="hidden md:inline text-xs font-semibold text-white/95 max-w-35 truncate">
              {customerUser?.name || customerUser?.email || 'Customer User'}
            </span>
          </div>

          <button
            onClick={handlePortalLogout}
            title="Sign Out of Customer Portal"
            className="p-1.5 rounded-md hover:bg-white/20 text-white/90 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
