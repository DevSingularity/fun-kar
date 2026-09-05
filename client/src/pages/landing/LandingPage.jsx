/**
 * LandingPage — DealFlow360 B2B Sales Operations Platform
 */
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Scale, 
  Boxes, 
  CreditCard, 
  Users, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck 
} from 'lucide-react';

const FEATURES = [
  { 
    icon: FileText, 
    title: 'Intelligent Quotation Engine', 
    desc: 'Configure complex multi-line B2B quotes with dynamic pricing tiers, customer discounts, and instant margin impact analysis.' 
  },
  { 
    icon: Scale, 
    title: 'Autonomous Discount Governance', 
    desc: 'Self-governing approval workflows with role-based routing (Sales Manager, Finance) based on margin erosion and discount limits.' 
  },
  { 
    icon: Boxes, 
    title: 'Multi-Warehouse Allocation', 
    desc: 'Automated inventory fulfillment across regional warehouses with real-time split deliveries and backorder management.' 
  },
  { 
    icon: CreditCard, 
    title: 'Hybrid Billing & Subscriptions', 
    desc: 'Combine one-time products and recurring subscription contracts in single orders with automated proration and billing schedules.' 
  },
  { 
    icon: Users, 
    title: 'Client Negotiation Portal', 
    desc: 'Empower buyers to review terms, submit structured counter-proposals, and trigger automated re-approval under clear guardrails.' 
  },
  { 
    icon: TrendingUp, 
    title: 'Deal Health & Risk Radar', 
    desc: 'Live anomaly detection, SLA tracking, approval audit logs, and actionable executive insights into conversion velocity.' 
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: 'var(--app-gradient-shell)' }}>
      {/* Aurora background blobs */}
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-16 border-b border-(--app-color-border)/50 bg-white/70 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="DealFlow360 Logo" className="h-9 w-9 object-contain" />
          <div className="flex items-baseline font-bold tracking-tight text-xl">
            <span className="text-(--app-color-primary)">DealFlow</span>
            <span className="text-(--app-color-accent) font-extrabold ml-0.5">360</span>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-(--app-color-text) hover:bg-white/80 transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="rounded-lg bg-(--app-color-primary) px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--app-color-primary-hover) transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16 text-center lg:py-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-(--app-color-border) bg-white/80 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-(--app-color-primary) shadow-sm backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-(--app-color-accent)" />
          Intelligent B2B Sales Operations & Deal Governance
        </div>

        <h1 className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight text-(--app-color-text) sm:text-5xl lg:text-6xl">
          Accelerate B2B Deals With <br />
          <span className="text-(--app-color-primary)">Autonomous Governance</span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-base sm:text-lg text-(--app-color-text-muted) leading-relaxed">
          From complex multi-line quotations and multi-level approval hierarchies to multi-warehouse fulfillment and hybrid subscription billing — all in one unified sales engine.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link to="/register" className="w-full sm:w-auto rounded-xl bg-(--app-color-primary) px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--app-color-primary-hover) transition-all hover:scale-[1.02]">
            Launch DealFlow360 →
          </Link>
          <Link to="/login" className="w-full sm:w-auto rounded-xl border border-(--app-color-border) bg-white/90 px-8 py-3.5 text-sm font-semibold text-(--app-color-text) shadow-sm backdrop-blur hover:bg-white transition-colors">
            Access Sales Console
          </Link>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-(--app-color-text)">
            Engineered for High-Velocity Deal Execution
          </h2>
          <p className="mx-auto max-w-xl text-sm sm:text-base text-(--app-color-text-muted)">
            Eliminate margin leakage, accelerate quotation approval velocity, and streamline buyer negotiations with rule-driven automation.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="rounded-xl border border-(--app-color-border) bg-white/90 p-6 shadow-sm backdrop-blur transition-all hover:shadow-md hover:border-(--app-color-primary)/30"
            >
              <div className="mb-4 p-2.5 w-10 h-10 rounded-lg bg-(--app-color-primary-soft) flex items-center justify-center">
                <feat.icon className="h-5 w-5 text-(--app-color-primary)" />
              </div>
              <h3 className="mb-2 text-base font-bold text-(--app-color-text)">{feat.title}</h3>
              <p className="text-sm text-(--app-color-text-muted) leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-16 text-center border-t border-(--app-color-border)/60 bg-white/50 backdrop-blur">
        <h2 className="mb-3 text-2xl sm:text-3xl font-bold text-(--app-color-text)">Ready to optimize your sales operations?</h2>
        <p className="mb-8 text-sm sm:text-base text-(--app-color-text-muted)">Experience end-to-end deal flow governance designed for modern B2B enterprises.</p>
        <Link to="/register" className="rounded-xl bg-(--app-color-primary) px-9 py-3.5 text-sm font-bold text-white shadow-md hover:bg-(--app-color-primary-hover) transition-all hover:scale-[1.02]">
          Get Started Now →
        </Link>
      </section>
    </div>
  );
}
