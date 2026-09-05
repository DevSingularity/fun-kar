/**
 * DashboardLayout
 *
 * Shared shell for all authenticated dashboard pages.
 *
 * TODO:
 *  1. Update navigationItems with your app's real pages
 *  2. Replace the logo/app name references
 *  3. Add socket.io connection here if your PS needs real-time features
 */
import { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

import api from '../../services/api.js';
import useAuthStore from '../../store/auth.store.js';

// TODO: Replace with your app's real navigation items
// icon: any lucide-react icon component
const navigationItems = [
  { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  // { label: 'Resources', path: '/dashboard/resources', icon: Layers },
  // { label: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
  // Add more items here ↑
];

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { /* ignore */ }
    clearAuth();
    toast.success('Logged out.');
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-gradient-shell)' }}>
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-(--app-color-border) bg-white/90 backdrop-blur">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 px-6 py-5 hover:opacity-80">
          {/* TODO: Replace logo.png */}
          <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          {/* TODO: Replace app name */}
          <span className="text-sm font-black uppercase tracking-widest text-(--app-color-text)">App Name</span>
        </Link>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
          {navigationItems.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-(--app-color-primary-soft) text-(--app-color-primary)'
                    : 'text-(--app-color-text-muted) hover:bg-(--app-color-surface-elevated) hover:text-(--app-color-text)'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User / logout footer */}
        <div className="border-t border-(--app-color-border) p-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--app-color-primary-soft) text-xs font-black text-(--app-color-primary)">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-(--app-color-text)">{user?.name ?? 'User'}</p>
              <p className="truncate text-[10px] text-(--app-color-text-muted)">{user?.email ?? ''}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-(--app-color-text-muted) hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
