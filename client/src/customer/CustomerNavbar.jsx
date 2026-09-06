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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        
        {/* Brand & Customer Nav Links */}
        <div className="flex items-center gap-4 lg:gap-6 overflow-x-auto no-scrollbar py-1">
          <Link
            to="/v1/customer"
            className="font-bold text-base tracking-tight shrink-0 flex items-center gap-2.5 text-white hover:opacity-95 transition-opacity group"
          >
            <div className="h-8 w-8 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 shadow-xs group-hover:bg-white/15 transition-all">
              <img src="/logo.svg" alt="DealFlow360 Logo" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-white text-sm sm:text-base leading-tight tracking-tight">
                DealFlow<span className="text-teal-300">360</span>
              </span>
              <span className="text-[9px] font-semibold text-amber-300 uppercase tracking-wider">
                Customer Negotiation Portal
              </span>
            </div>
          </Link>

          {/* Vertical Separator */}
          <div className="h-6 w-px bg-white/20 shrink-0 hidden md:block" />

          {/* Customer Module Tabs */}
          <nav className="flex items-center gap-1 shrink-0">
            {navLinks.map((tab) => {
              const isActive = location.pathname === tab.path || (tab.path === '/v1/customer' && location.pathname.startsWith('/v1/customer/'));
              return (
                <Link
                  key={tab.label}
                  to={tab.path}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
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
          <div className="hidden sm:flex items-center gap-1.5 bg-amber-400/20 text-amber-200 rounded-lg px-2.5 py-1 border border-amber-300/30 text-[11px] font-bold tracking-wide shadow-2xs">
            <UserCheck className="h-3.5 w-3.5 text-amber-300" />
            <span>Customer Portal</span>
          </div>

          <div className="flex items-center gap-2 pl-1">
            <div
              title={customerUser?.name || 'Customer Contact'}
              className="h-8 w-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs border border-white/30 shadow-2xs"
            >
              {customerUser?.name?.[0]?.toUpperCase() || 'C'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-white/95 max-w-[140px] truncate leading-tight">
                {customerUser?.name || customerUser?.email || 'Customer User'}
              </span>
              <span className="text-[10px] text-white/70 max-w-[140px] truncate leading-tight">
                {customerUser?.email || 'Authenticated Buyer'}
              </span>
            </div>
          </div>

          <button
            onClick={handlePortalLogout}
            title="Sign Out of Customer Portal"
            className="p-2 rounded-lg hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
