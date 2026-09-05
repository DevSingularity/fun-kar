/**
 * LoginPage
 *
 * TODO items:
 *  - Replace logo.png in /public with your logo
 *  - Replace ALL text marked with TODO below
 *  - Update the feature list bullets to reflect your app's value props
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

// TODO: Replace these with your app's real feature highlights
const FEATURE_BULLETS = [
  'Feature one — describe your core value',
  'Feature two — describe a key capability',
  'Feature three — describe a differentiator',
  'Feature four — describe another benefit',
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
    <Container className="flex min-h-screen items-center justify-center py-4 lg:py-6">
      {!isSubmitting && (
        <div
          className="grid w-full max-w-6xl overflow-hidden rounded-[2.5rem] border border-(--app-color-border)/40 backdrop-blur-md lg:grid-cols-[1.1fr_0.9fr]"
          style={{ backgroundColor: 'var(--app-color-surface-glass)', boxShadow: 'var(--app-shadow-elevated)' }}
        >
          {/* ── Left branding panel ── */}
          <section
            className="relative flex flex-col items-center justify-center overflow-hidden p-8 text-center text-white lg:p-12"
            style={{ background: 'var(--app-gradient-auth-login)' }}
          >
            <div className="noise-overlay pointer-events-none opacity-20" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex flex-col items-center gap-6">
                {/* TODO: Replace /logo.png with your logo */}
                <img src="/logo.png" alt="App Logo" className="h-36 w-36 object-contain drop-shadow-2xl" />
                <div className="h-[3px] w-16 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-8">
                {/* TODO: Replace with your app tagline */}
                <h1 className="text-4xl font-black uppercase tracking-tighter italic lg:text-5xl">
                  Your Tagline <br />
                  <span className="text-teal-400">Goes Right Here.</span>
                </h1>
                {/* TODO: Replace with your app's one-liner */}
                <p className="mx-auto mt-4 max-w-sm text-lg font-bold leading-tight text-white/70">
                  Your app's value proposition goes here — one punchy sentence.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 px-4 text-left">
                {FEATURE_BULLETS.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="whitespace-nowrap text-xs font-black uppercase tracking-wider text-white/90">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-6 left-0 right-0 z-10 flex items-center justify-between px-10 text-[9px] font-black uppercase tracking-[0.3em] text-white/25">
              {/* TODO: Replace with your app name and year */}
              <p>© 2026 Your App Name</p>
              <p>Subtitle here</p>
            </div>
          </section>

          {/* ── Right form panel ── */}
          <section
            className="auth-form-slide flex flex-col justify-center p-8 lg:p-12"
            style={{ backgroundColor: 'var(--app-color-surface-glass)' }}
          >
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-8 text-center lg:text-left">
                {/* TODO: Replace headings */}
                <h2 className="text-3xl font-bold tracking-tight text-(--app-color-text)">Welcome back</h2>
                <p className="mt-1 text-sm text-(--app-color-text-muted)">Sign in to your dashboard</p>
              </div>
              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* TODO: Adjust label/placeholder to match your entity (e.g. "Work Email") */}
                <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" className="h-11 rounded-xl" />
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-(--app-color-text)">Password</label>
                    <a href="#" className="text-xs font-medium text-(--app-color-primary) hover:underline">Forgot password?</a>
                  </div>
                  <Input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder="••••••••" className="h-11 rounded-xl" />
                </div>
                <div className="pt-1">
                  {/* TODO: Replace button label */}
                  <Button type="submit" className="h-11 w-full rounded-xl text-sm font-bold shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]" loading={isSubmitting} disabled={isSubmitting}>
                    Sign In
                  </Button>
                </div>
                <p className="mt-8 text-center text-xs text-(--app-color-text-muted)">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-black text-(--app-color-primary) hover:text-(--app-color-primary-hover)">
                    Create one
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
