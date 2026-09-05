import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, KeyRound, Lock, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

import useAuthStore from '../store/auth.store.js';
import customerApi from './services/customerApi.js';

export default function CustomerPortalGuard({ children, portalUser, setPortalUser, onAuthSuccess }) {
  const navigate = useNavigate();
  const isLoggedInStaff = useAuthStore((s) => s.isLoggedIn);
  const staffUser = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [email, setEmail] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('portalToken');
    if (!token) {
      setPortalUser?.(null);
    }
  }, [setPortalUser]);

  if (isLoggedInStaff && staffUser?.role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-slate-100">
        <div className="w-full max-w-lg rounded-3xl border border-red-400/30 bg-slate-900 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold">Customer Portal is separate from staff access</h2>
          <p className="mt-3 text-sm text-slate-300">
            You are signed in as <strong>{staffUser.role}</strong>. Please return to the internal workspace before opening
            the customer portal.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/v1/dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950">
              <ArrowRight className="h-4 w-4" />
              Back to dashboard
            </Link>
            <button
              type="button"
              onClick={() => clearAuth()}
              className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-bold text-slate-200"
            >
              Sign out staff
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!portalUser) {
    const requestMagicLink = async (event) => {
      event.preventDefault();
      if (!email.trim()) return toast.error('Enter a customer email.');
      setLoading(true);
      try {
        const res = await customerApi.post('/auth/magic-link', { email: email.trim() });
        const devToken = res.data?.data?.devMagicLink;
        if (devToken) setMagicToken(devToken);
        toast.success('Magic link request sent.');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Magic link request failed.');
      } finally {
        setLoading(false);
      }
    };

    const consumeMagicToken = async () => {
      if (!magicToken.trim()) return toast.error('No magic token available.');
      setLoading(true);
      try {
        const res = await customerApi.post('/auth/magic-link/consume', { token: magicToken.trim() });
        const token = res.data?.data?.token;
        const user = res.data?.data?.customerUser;
        if (token) {
          localStorage.setItem('portalToken', token);
          setPortalUser?.(user);
          onAuthSuccess?.();
          toast.success('Customer portal authenticated.');
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Invalid or expired magic link.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f2ed] p-4 text-slate-900">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#714b67]/10 text-[#714b67]">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold">Customer Portal Sign In</h1>
            <p className="mt-2 text-sm text-slate-500">Request a magic link for the customer contact, then open quotations from their tenant only.</p>
          </div>

          <form onSubmit={requestMagicLink} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Customer Email
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-9 py-3 text-sm outline-none focus:border-[#714b67]"
                  placeholder="customer@example.com"
                />
              </div>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#714b67] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          {magicToken && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Dev token</p>
              <code className="mt-2 block break-all rounded-lg bg-white p-3 text-xs text-slate-800">{magicToken}</code>
              <button
                type="button"
                onClick={consumeMagicToken}
                disabled={loading}
                className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                Consume token
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return children;
}
