import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, Mail, Sparkles, ArrowRight, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../store/auth.store.js';
import customerApi from './services/customerApi.js';

export default function CustomerPortalGuard({ children, portalUser, setPortalUser, onAuthSuccess }) {
  const navigate = useNavigate();
  const isLoggedInStaff = useAuthStore((s) => s.isLoggedIn);
  const staffUser = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [authMode, setAuthMode] = useState('MAGIC_LINK'); // 'MAGIC_LINK' | 'SHARE_TOKEN'
  const [email, setEmail] = useState('');
  const [devMagicToken, setDevMagicToken] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. STRICT RBAC CHECK: Block internal staff users (ADMIN, SALES_REP, etc.) from opening customer portal routes!
  if (isLoggedInStaff && staffUser?.role) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans">
        <div className="bg-white border-2 border-red-300 rounded-2xl shadow-xl p-8 max-w-lg w-full text-center space-y-5">
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
              Strict RBAC Guard Active
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Access Denied: Internal Staff Account Detected
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              You are currently logged in with an internal staff account (
              <strong className="text-slate-900 font-bold">{staffUser.role}</strong> - {staffUser.email}).
              Under strict DealFlow360 RBAC rules, internal staff cannot access Customer Portal routes (<code>/v1/customer</code>) to prevent privilege escalation and preserve business logic boundaries.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              to="/v1/dashboard"
              className="px-5 py-3 rounded-xl bg-[#714b67] hover:bg-[#5a3a52] text-white font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ArrowRight className="h-4 w-4" />
              Return to Internal Staff Dashboard (/v1/dashboard)
            </Link>
            <button
              onClick={() => {
                clearAuth();
                toast.success('Internal staff session cleared. You may now log into Customer Portal.');
              }}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
            >
              Sign Out Staff Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const portalToken = localStorage.getItem('portalToken');

  // 2. CUSTOMER AUTHENTICATION CHECK: If no portal token and no demo user, render Customer Portal Authentication screen
  if (!portalToken && !portalUser) {
    const handleRequestMagicLink = async (e) => {
      e.preventDefault();
      if (!email.trim()) return toast.error('Please enter customer email');
      setLoading(true);
      try {
        const res = await customerApi.post('/auth/magic-link', { email: email.trim() });
        const devToken = res.data?.data?.devMagicLink;
        if (devToken) {
          setDevMagicToken(devToken);
          toast.success('Magic link generated! (Dev token displayed below)');
        } else {
          toast.success('Magic link dispatched to email');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Magic link request failed');
      } finally {
        setLoading(false);
      }
    };

    const handleConsumeMagicToken = async (tokenToUse) => {
      setLoading(true);
      try {
        const res = await customerApi.post('/auth/magic-link/consume', { token: tokenToUse });
        const token = res.data?.data?.token;
        const cUser = res.data?.data?.portalUser;
        if (token) {
          localStorage.setItem('portalToken', token);
          setPortalUser?.(cUser);
          onAuthSuccess?.();
          toast.success('Customer Portal authenticated!');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Invalid or expired magic link token');
      } finally {
        setLoading(false);
      }
    };

    const handleUseShareToken = (e) => {
      e.preventDefault();
      if (!shareToken.trim()) return toast.error('Please enter quotation share token');
      localStorage.setItem('quoteShareToken', shareToken.trim());
      onAuthSuccess?.();
      toast.success('Quotation share token applied!');
    };

    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white border border-slate-300 rounded-2xl shadow-xl p-8 max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="h-12 w-12 bg-[#714b67]/10 text-[#714b67] rounded-xl flex items-center justify-center mx-auto border border-[#714b67]/20">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">Customer Portal Authentication</h2>
            <p className="text-xs text-slate-500 font-medium">
              Access your personalized deal quotation, counter-offer terms, and message thread.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setAuthMode('MAGIC_LINK')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'MAGIC_LINK' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Passwordless Magic Link
            </button>
            <button
              onClick={() => setAuthMode('SHARE_TOKEN')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'SHARE_TOKEN' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Share Link Token
            </button>
          </div>

          {authMode === 'MAGIC_LINK' ? (
            <form onSubmit={handleRequestMagicLink} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Customer Email Address</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    placeholder="customer@apexlogistics.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#714b67]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-[11px] font-medium text-slate-600">Preset Seeded Customer:</span>
                <button
                  type="button"
                  onClick={() => setEmail('customer@apexlogistics.com')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg text-[10px] font-bold shadow-2xs"
                >
                  ⚡ customer@apexlogistics.com
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#714b67] hover:bg-[#5a3a52] text-white transition-all shadow-xs"
              >
                {loading ? 'Sending Magic Link...' : 'Request Customer Magic Link'}
              </button>


              {devMagicToken && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                  <p className="text-[11px] font-bold text-emerald-800">Dev Magic Link Generated:</p>
                  <code className="block bg-white p-2 rounded border border-emerald-300 text-[10px] text-emerald-900 font-mono break-all">
                    {devMagicToken}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleConsumeMagicToken(devMagicToken)}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px]"
                  >
                    Authenticate with Dev Token
                  </button>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={handleUseShareToken} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enter Share Token (X-Quote-Token)</label>
                <div className="relative">
                  <KeyRound className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Paste 64-char share token..."
                    value={shareToken}
                    onChange={(e) => setShareToken(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-[#714b67] font-mono text-[11px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl font-bold text-xs bg-[#008784] hover:bg-[#006e6c] text-white transition-all shadow-xs"
              >
                Access Quote via Share Token
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return children;
}
