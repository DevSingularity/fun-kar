/**
 * DashboardHomePage — DealFlow360 Operations Overview
 */
import { useState } from 'react';
import useAuthStore from '../../store/auth.store.js';
import StatCard from '../../components/StatCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';

const MOCK_STATS = [
  { label: 'Active Deal Pipeline',   value: '$1,482,500', change: '+14.2%',  trend: 'up' },
  { label: 'Pending Approvals',      value: '6 Deals',    change: '2 SLA Risk',  trend: 'neutral' },
  { label: 'Avg Deal Gross Margin',  value: '38.6%',      change: '+2.4%',   trend: 'up' },
  { label: 'Fulfillment Ready',      value: '94.8%',      change: '2 Backordered',  trend: 'up' },
];

const MOCK_ACTIVITY = [
  { 
    id: 1, 
    label: 'Quotation #QT-2026-084 submitted for Apex Global ($142,000)',   
    time: '3 mins ago',   
    status: 'pending' 
  },
  { 
    id: 2, 
    label: 'Sales Manager approved 18.5% discount tier on Deal #QT-2026-079', 
    time: '24 mins ago',  
    status: 'approved' 
  },
  { 
    id: 3, 
    label: 'Multi-warehouse stock allocated (WH-East: 60u, WH-West: 40u)', 
    time: '1 hr ago',    
    status: 'active' 
  },
  { 
    id: 4, 
    label: 'Hybrid Subscription Schedule generated for Quantum Dynamics', 
    time: '2 hrs ago',   
    status: 'done' 
  },
];

const STATUS_STYLES = {
  active:   'bg-teal-50 text-[var(--app-color-accent)] border border-teal-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border border-amber-200',
  done:     'bg-slate-100 text-slate-700 border border-slate-200',
};

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);
  const [stats] = useState(MOCK_STATS);
  const [activity] = useState(MOCK_ACTIVITY);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Sales Operations Hub — Welcome, ${user?.name ?? 'Sales Officer'}`}
        subtitle="Real-time deal execution, approval governance, stock fulfillment, and hybrid contract billing."
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} change={s.change} trend={s.trend} />
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-xl border border-(--app-color-border) bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-(--app-color-text) uppercase tracking-wider">
            Live Deal Flow & Governance Activity
          </h3>
          <span className="text-xs font-semibold text-(--app-color-primary) cursor-pointer hover:underline">
            View All Audit Logs →
          </span>
        </div>
        <ul className="divide-y divide-(--app-color-border)">
          {activity.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-xs font-semibold text-(--app-color-text)">{item.label}</p>
                <p className="text-[11px] text-(--app-color-text-muted) mt-0.5">{item.time}</p>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[item.status] || STATUS_STYLES.done}`}>
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
