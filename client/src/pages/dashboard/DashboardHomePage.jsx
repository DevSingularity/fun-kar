/**
 * DashboardHomePage — TEMPLATE
 *
 * This is your main dashboard view after login.
 *
 * TODO:
 *  1. Replace the StatCard data with real metrics from your API
 *  2. Replace the "Recent Activity" table with your domain's data
 *  3. Add charts/widgets relevant to your PS
 *  4. Wire up API calls using the api service
 *
 * Pattern: fetch data in useEffect → store in local state → render.
 */
import { useState, useEffect } from 'react';
import useAuthStore from '../../store/auth.store.js';
import StatCard from '../../components/StatCard.jsx';
import PageHeader from '../../components/PageHeader.jsx';
// import api from '../../services/api.js'; // uncomment when ready to fetch real data

// TODO: Replace with real stats from your API
const MOCK_STATS = [
  { label: 'Stat Label One',   value: '—', change: '+0%',  trend: 'up' },
  { label: 'Stat Label Two',   value: '—', change: '+0%',  trend: 'up' },
  { label: 'Stat Label Three', value: '—', change: '0%',   trend: 'neutral' },
  { label: 'Stat Label Four',  value: '—', change: '-0%',  trend: 'down' },
];

// TODO: Replace with real recent-activity data from your API
const MOCK_ACTIVITY = [
  { id: 1, label: 'Activity item one',   time: 'Just now',   status: 'active' },
  { id: 2, label: 'Activity item two',   time: '5 mins ago', status: 'pending' },
  { id: 3, label: 'Activity item three', time: '1 hr ago',   status: 'done' },
];

const STATUS_STYLES = {
  active:  'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  done:    'bg-gray-100 text-gray-600',
};

export default function DashboardHomePage() {
  const user = useAuthStore((s) => s.user);
  const [stats] = useState(MOCK_STATS);
  const [activity] = useState(MOCK_ACTIVITY);

  // TODO: Replace mock data with real API calls
  // useEffect(() => {
  //   async function load() {
  //     const res = await api.get('/dashboard/stats');
  //     setStats(res.data.stats);
  //   }
  //   load();
  // }, []);

  return (
    <div className="space-y-8">
      {/* TODO: Replace title/subtitle */}
      <PageHeader
        title={`Welcome back, ${user?.name ?? 'User'}`}
        subtitle="Here's a summary of what's happening."
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} change={s.change} trend={s.trend} />
        ))}
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-(--app-color-border) bg-white p-6 shadow-sm">
        {/* TODO: Replace heading */}
        <h3 className="mb-4 text-base font-bold text-(--app-color-text)">Recent Activity</h3>
        <ul className="divide-y divide-(--app-color-border)">
          {activity.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-3">
              <div>
                {/* TODO: Replace with real activity description */}
                <p className="text-sm font-medium text-(--app-color-text)">{item.label}</p>
                <p className="text-xs text-(--app-color-text-muted)">{item.time}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status] || STATUS_STYLES.done}`}>
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* TODO: Add more widgets/charts/tables relevant to your PS here */}
    </div>
  );
}
