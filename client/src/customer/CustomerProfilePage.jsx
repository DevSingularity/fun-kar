import React, { useState, useEffect } from 'react';
import { User, Building2, ShieldCheck, Mail, Calendar, KeyRound } from 'lucide-react';
import customerApi from './services/customerApi.js';
import CustomerNavbar from './CustomerNavbar.jsx';
import CustomerPortalGuard from './CustomerPortalGuard.jsx';

export default function CustomerProfilePage() {
  const [portalUser, setPortalUser] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const meRes = await customerApi.get('/auth/me');
      setPortalUser(meRes.data?.data);
    } catch (err) {
      // Demo fallback
    }
  };

  const userDisplay = portalUser || {
    name: 'Acme Enterprise Contact',
    email: 'contact@acme.com',
    customer: {
      id: 'cust-101',
      name: 'Acme Corp',
      tier: 'GOLD',
    },
  };

  return (
    <CustomerPortalGuard portalUser={portalUser} setPortalUser={setPortalUser} onAuthSuccess={fetchProfile}>
      <div className="min-h-screen bg-[#f8f9fa] text-slate-800 flex flex-col font-sans">
        <CustomerNavbar customerUser={portalUser} />

        <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-8 py-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#714b67]/10 border border-[#714b67]/20 text-[#714b67]">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">Customer Portal Account Profile</h1>
              <p className="text-xs text-slate-500 font-medium">View your portal contact identity and assigned tier benefits</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Contact Details Card */}
            <div className="bg-white rounded-xl border border-slate-300 p-6 space-y-4 shadow-xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <User className="h-4 w-4 text-[#714b67]" />
                Contact Information
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Contact Name</label>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">{userDisplay.name}</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Email Address</label>
                  <p className="text-slate-700 font-mono flex items-center gap-2 mt-0.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {userDisplay.email}
                  </p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Authentication Method</label>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 mt-1">
                    <KeyRound className="h-3 w-3 text-emerald-600" />
                    Magic Link Passwordless & JWT Scope
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Account & Tier Benefits Card */}
            <div className="bg-white rounded-xl border border-slate-300 p-6 space-y-4 shadow-xs">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#008784]" />
                Enterprise Account & Tier
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Company Name</label>
                  <p className="text-slate-900 font-bold text-sm mt-0.5">{userDisplay.customer?.name || 'Acme Corp'}</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Customer Tier Status</label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-black bg-[#714b67] text-white border border-[#5a3a52]">
                      {userDisplay.customer?.tier || 'GOLD'} TIER
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      (Max Tier Discount Limit: {userDisplay.customer?.tier === 'GOLD' ? '30%' : '15%'})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase block">Portal Privileges & Security</label>
                  <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                    Restricted Customer Portal Access. Internal business logic, cost matrices, and risk scoring are strictly protected.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </CustomerPortalGuard>
  );
}
