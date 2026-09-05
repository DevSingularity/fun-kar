/**
 * LoginPage — DealFlow360
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Button from '../../components/Button';
import Container from '../../components/Container';
import Input from '../../components/Input';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

const initialForm = { email: '', password: '' };

const FEATURE_BULLETS = [
  'Automated discount & margin governance',
  'Multi-warehouse fulfillment allocation',
  'Hybrid one-time & recurring billing',
  'Real-time customer deal negotiation',
];

const DEMO_PRESETS = [
  { role: 'Sales Rep', email: 'rep@dealflow.io', tag: 'REP', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { role: 'Manager', email: 'manager@dealflow.io', tag: 'MGR', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { role: 'Finance', email: 'finance@dealflow.io', tag: 'FIN', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { role: 'Operations', email: 'ops@dealflow.io', tag: 'OPS', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { role: 'Admin', email: 'admin@dealflow.io', tag: 'ADM', color: 'bg-slate-100 text-slate-800 border-slate-300' },
];

export default function LoginPage() {
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTransitioning = useAuthStore((s) => s.setTransitioning);

  const handleChange = (e) => setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSelectDemo = (email) => {
    setFormData({ email, password: 'Password123!' });
    toast.success(`Demo credentials loaded for ${email}`, { duration: 2000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTransitioning(true, true);
    try {
      const res = await api.post('/auth/login', formData);
      const authData = res.data?.data || res.data;
      setAuth({ user: authData.user, accessToken: authData.accessToken });
      toast.success(`Welcome back, ${authData.user?.name || 'User'}!`);
      navigate('/dashboard');
    } catch (error) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        'Login failed. Check your credentials.';
      toast.error(msg);
      setTransitioning(false);
      setIsSubmitting(false);
    }
  };

  return (
    <Container className="flex min-h-screen items-center justify-center py-6">
      {!isSubmitting && (
        <div
          className="grid w-full max-w-5xl overflow-hidden rounded-2xl border border-(--app-color-border) backdrop-blur-md lg:grid-cols-[1.1fr_0.9fr] shadow-lg"
          style={{ backgroundColor: 'var(--app-color-surface-glass)' }}
        >
          {/* ── Left branding panel ── */}
          <section
            className="relative flex flex-col items-center justify-center overflow-hidden p-8 text-center text-white lg:p-12"
            style={{ background: 'var(--app-gradient-auth-login)' }}
          >
            <div className="noise-overlay pointer-events-none opacity-20" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex flex-col items-center gap-3">
                <img src="/logo.svg" alt="DealFlow360 Logo" className="h-16 w-16 object-contain drop-shadow-lg" />
                <div className="h-[2px] w-12 rounded-full bg-(--app-color-accent)" />
              </div>
              <div className="mt-5">
                <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
                  Governed Deals. <br />
                  <span className="text-teal-300">Zero Margin Leakage.</span>
                </h1>
                <p className="mx-auto mt-2.5 max-w-sm text-xs sm:text-sm font-medium leading-relaxed text-white/80">
                  Intelligent sales operations and quotation governance platform designed for high-velocity B2B enterprise teams.
                </p>
              </div>
              <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 px-2 text-left w-full">
                {FEATURE_BULLETS.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <div className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide text-white/90">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between w-full px-4 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <p>© 2026 DealFlow360</p>
              <p>Enterprise Sales Ops</p>
            </div>
          </section>

          {/* ── Right form panel ── */}
          <section
            className="auth-form-slide flex flex-col justify-center p-6 lg:p-10 bg-white"
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-(--app-color-text)">Welcome Back</h2>
                <p className="mt-1 text-xs text-(--app-color-text-muted)">Sign in to access your sales workspace</p>
              </div>

              {/* Quick Demo Switcher */}
              <div className="mb-5 rounded-xl border border-(--app-color-border) bg-(--app-color-surface-elevated)/70 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-(--app-color-text-muted) mb-2">
                  ⚡ 1-Click Demo Accounts
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_PRESETS.map((demo) => (
                    <button
                      key={demo.email}
                      type="button"
                      onClick={() => handleSelectDemo(demo.email)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 ${demo.color}`}
                    >
                      {demo.role}
                    </button>
                  ))}
                </div>
              </div>

              <form className="space-y-3.5" onSubmit={handleSubmit}>
                <Input
                  label="Work Email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="rep@dealflow.io"
                  className="h-9.5 rounded-lg text-xs"
                />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-(--app-color-text)">Password</label>
                    <span className="text-[11px] font-medium text-(--app-color-text-muted)">(Default: Password123!)</span>
                  </div>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="••••••••"
                    className="h-9.5 rounded-lg text-xs"
                  />
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    className="h-10 w-full rounded-lg text-xs font-bold shadow-sm transition-all"
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  >
                    Sign In to Console
                  </Button>
                </div>
                <p className="mt-5 text-center text-xs text-(--app-color-text-muted)">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-bold text-(--app-color-primary) hover:text-(--app-color-primary-hover)">
                    Register Workspace
                  </Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      )}
    </Container>
  );
}
