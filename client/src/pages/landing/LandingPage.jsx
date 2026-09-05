/**
 * LandingPage — TEMPLATE
 *
 * TODO: Replace every piece of text marked with a TODO comment.
 * The structure (hero, features, CTA) is intentionally generic —
 * keep what's useful for your PS, trim the rest.
 */
import { Link } from 'react-router-dom';

// TODO: Replace these with your real feature cards
const FEATURES = [
  { icon: '⚡', title: 'Feature Title One', desc: 'Short description of what this feature does for the user.' },
  { icon: '🔒', title: 'Feature Title Two', desc: 'Short description of what this feature does for the user.' },
  { icon: '📊', title: 'Feature Title Three', desc: 'Short description of what this feature does for the user.' },
  { icon: '🌐', title: 'Feature Title Four',  desc: 'Short description of what this feature does for the user.' },
  { icon: '🤝', title: 'Feature Title Five',  desc: 'Short description of what this feature does for the user.' },
  { icon: '🚀', title: 'Feature Title Six',   desc: 'Short description of what this feature does for the user.' },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--app-gradient-shell)' }}>
      {/* Aurora background blobs */}
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-16">
        <Link to="/" className="flex items-center gap-3">
          {/* TODO: Replace logo.png */}
          <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
          {/* TODO: Replace app name */}
          <span className="text-lg font-black uppercase tracking-widest text-(--app-color-text)">
            App Name
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-(--app-color-text) hover:bg-white/60 transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="rounded-xl bg-(--app-color-primary) px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-(--app-color-primary-hover) transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20 text-center lg:py-32">
        {/* TODO: Replace badge text */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-(--app-color-border) bg-white/60 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-(--app-color-primary) backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-(--app-color-primary)" />
          Badge / Category Label Here
        </div>

        {/* TODO: Replace hero headline — make it punchy and problem-focused */}
        <h1 className="mb-6 text-5xl font-black leading-[1.1] tracking-tighter text-(--app-color-text) lg:text-7xl">
          Your Big Bold<br />
          <span className="text-(--app-color-primary)">Headline Here</span>
        </h1>

        {/* TODO: Replace sub-headline — one or two sentences on the core problem you solve */}
        <p className="mx-auto mb-10 max-w-2xl text-lg text-(--app-color-text-muted) leading-relaxed">
          This is your hero sub-headline. Describe who this app is for and what problem it solves
          in one or two clear sentences.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/register" className="rounded-2xl bg-(--app-color-primary) px-8 py-4 text-base font-bold text-white shadow-xl hover:bg-(--app-color-primary-hover) transition-all hover:scale-105">
            {/* TODO: Replace CTA label */}
            Get Started Free →
          </Link>
          <Link to="/login" className="rounded-2xl border border-(--app-color-border) bg-white/70 px-8 py-4 text-base font-semibold text-(--app-color-text) backdrop-blur hover:bg-white transition-colors">
            Sign In
          </Link>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        {/* TODO: Replace section heading */}
        <h2 className="mb-4 text-center text-3xl font-black tracking-tight text-(--app-color-text)">
          Why Choose This App?
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-(--app-color-text-muted)">
          {/* TODO: Replace section description */}
          Short supporting paragraph explaining the value your app delivers.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="rounded-2xl border border-(--app-color-border)/60 bg-white/70 p-6 backdrop-blur transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="mb-4 text-3xl">{feat.icon}</div>
              <h3 className="mb-2 text-base font-bold text-(--app-color-text)">{feat.title}</h3>
              <p className="text-sm text-(--app-color-text-muted) leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-16 text-center">
        {/* TODO: Replace CTA text */}
        <h2 className="mb-4 text-3xl font-black text-(--app-color-text)">Ready to get started?</h2>
        <p className="mb-8 text-(--app-color-text-muted)">One-line closing pitch for your app.</p>
        <Link to="/register" className="rounded-2xl bg-(--app-color-primary) px-10 py-4 text-base font-bold text-white shadow-xl hover:bg-(--app-color-primary-hover) transition-all hover:scale-105">
          Start Now →
        </Link>
      </section>
    </div>
  );
}
