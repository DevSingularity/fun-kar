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

export default function LoginPage() {
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTransitioning = useAuthStore((s) => s.setTransitioning);

  const handleChange = (e) => setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTransitioning(true, true);
    try {
      const res = await api.post('/auth/login', formData);
      setAuth({ user: res.data.user, accessToken: res.data.accessToken });
      toast.success('Logged in successfully.');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.errors?.[0] || error.response?.data?.message || 'Login failed.';
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
              <div className="flex flex-col items-center gap-4">
                <img src="/logo.svg" alt="DealFlow360 Logo" className="h-20 w-20 object-contain drop-shadow-lg" />
                <div className="h-[2px] w-12 rounded-full bg-(--app-color-accent)" />
              </div>
              <div className="mt-6">
                <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
                  Governed Deals. <br />
                  <span className="text-(--app-color-accent-soft) text-teal-300">Zero Margin Leakage.</span>
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/80">
                  Intelligent sales operations and quotation governance platform designed for high-velocity B2B enterprise teams.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 px-2 text-left w-full">
                {FEATURE_BULLETS.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-white/90">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-10 flex items-center justify-between w-full px-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <p>© 2026 DealFlow360</p>
              <p>Enterprise Sales Ops</p>
            </div>
          </section>

          {/* ── Right form panel ── */}
          <section
            className="auth-form-slide flex flex-col justify-center p-8 lg:p-12 bg-white"
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-(--app-color-text)">Welcome Back</h2>
                <p className="mt-1 text-sm text-(--app-color-text-muted)">Sign in to access your sales workspace</p>
              </div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input label="Work Email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="sales.rep@company.com" className="h-10 rounded-lg text-sm" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-(--app-color-text)">Password</label>
                    <a href="#" className="text-xs font-medium text-(--app-color-primary) hover:underline">Forgot password?</a>
                  </div>
                  <Input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="h-10 rounded-lg text-sm" />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="h-10 w-full rounded-lg text-sm font-semibold shadow-sm transition-all" loading={isSubmitting} disabled={isSubmitting}>
                    Sign In to Console
                  </Button>
                </div>
                <p className="mt-6 text-center text-xs text-(--app-color-text-muted)">
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
