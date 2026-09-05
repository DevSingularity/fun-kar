/**
 * RegisterPage — DealFlow360
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import Button from '../../components/Button';
import Container from '../../components/Container';
import Input from '../../components/Input';
import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

const initialForm = { name: '', email: '', password: '', confirmPassword: '' };

const ONBOARDING_STEPS = [
  'Setup organization workspace and assign role credentials.',
  'Connect product catalog, price lists, and regional warehouses.',
  'Launch intelligent quotations with automated discount governance.',
];

export default function RegisterPage() {
  const [formData, setFormData] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTransitioning = useAuthStore((s) => s.setTransitioning);

  const handleChange = (e) => setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    setTransitioning(true, true);
    try {
      const res = await api.post('/auth/register', formData);
      const authData = res.data?.data || res.data;
      setAuth({ user: authData.user, accessToken: authData.accessToken });
      toast.success('Account created successfully.');
      navigate('/dashboard');
    } catch (error) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.errors?.[0]?.message ||
        error.response?.data?.message ||
        'Registration failed.';
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
            style={{ background: 'var(--app-gradient-auth-register)' }}
          >
            <div className="noise-overlay pointer-events-none opacity-20" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex flex-col items-center gap-4">
                <img src="/logo.svg" alt="DealFlow360 Logo" className="h-20 w-20 object-contain drop-shadow-lg" />
                <div className="h-[2px] w-12 rounded-full bg-(--app-color-accent)" />
              </div>
              <div className="mt-6">
                <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">
                  Empower Sales. <br />
                  <span className="text-teal-300">Enforce Governance.</span>
                </h1>
                <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-relaxed text-white/80">
                  Join DealFlow360 to streamline quotations, approvals, multi-warehouse fulfillment, and billing.
                </p>
              </div>
              <div className="mt-8 space-y-3.5 px-2 text-left w-full">
                {ONBOARDING_STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mt-0.5">
                      {i + 1}
                    </div>
                    <p className="text-xs font-medium leading-relaxed text-white/90">{step}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-10 flex items-center justify-between w-full px-4 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <p>© 2026 DealFlow360</p>
              <p>Sales Ops Platform</p>
            </div>
          </section>

          {/* ── Right form panel ── */}
          <section
            className="auth-form-slide flex flex-col justify-center p-8 lg:p-12 bg-white"
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-(--app-color-text)">Create Workspace</h2>
                <p className="mt-0.5 text-xs text-(--app-color-text-muted)">Get started with your DealFlow360 account</p>
              </div>
              <form className="space-y-3.5" onSubmit={handleSubmit}>
                <Input label="Full Name / Organization" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Alex Morgan / Acme Corp" className="h-10 rounded-lg text-sm" />
                <Input label="Work Email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="alex@company.com" className="h-10 rounded-lg text-sm" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Password" type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="h-10 rounded-lg text-sm" />
                  <Input label="Confirm" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required placeholder="••••••••" className="h-10 rounded-lg text-sm" />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="h-10 w-full rounded-lg text-sm font-semibold shadow-sm transition-all" loading={isSubmitting} disabled={isSubmitting}>
                    Register Workspace
                  </Button>
                </div>
                <p className="mt-6 text-center text-xs text-(--app-color-text-muted)">
                  Already have an account?{' '}
                  <Link to="/login" className="font-bold text-(--app-color-primary) hover:text-(--app-color-primary-hover)">Sign In</Link>
                </p>
              </form>
            </div>
          </section>
        </div>
      )}
    </Container>
  );
}
