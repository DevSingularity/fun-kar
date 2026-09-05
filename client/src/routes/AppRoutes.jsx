/**
 * AppRoutes
 *
 * TODO: Add/remove routes to match your PS features.
 * Private routes (behind PrivateRoute) require a valid JWT session.
 */
import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import GlobalLoader from '../components/loaders/GlobalLoader.jsx';
import LandingPage from '../pages/landing/LandingPage.jsx';
import LoginPage from '../pages/auth/LoginPage.jsx';
import RegisterPage from '../pages/auth/RegisterPage.jsx';
import DashboardHomePage from '../pages/dashboard/DashboardHomePage.jsx';
// TODO: Import and add your domain-specific page routes below
// import DashboardResourcesPage from '../pages/dashboard/DashboardResourcesPage.jsx';

import useAuthStore from '../store/auth.store.js';

function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  const location = useLocation();
  const hydrated = useAuthStore((s) => s.hydrated);
  const isTransitioning = useAuthStore((s) => s.isTransitioning);
  const isExiting = useAuthStore((s) => s.isExiting);
  const transitionShowTagline = useAuthStore((s) => s.transitionShowTagline);
  const setTransitioning = useAuthStore((s) => s.setTransitioning);
  const setExiting = useAuthStore((s) => s.setExiting);

  useEffect(() => {
    if (isTransitioning && !isExiting) {
      const t1 = setTimeout(() => {
        setExiting(true);
        setTimeout(() => setTransitioning(false), 600);
      }, 300);
      return () => clearTimeout(t1);
    }
  }, [location.pathname, isTransitioning, isExiting]);

  if (!hydrated) return <GlobalLoader showTagline={false} />;

  return (
    <>
      {(isTransitioning || isExiting) && (
        <GlobalLoader showTagline={transitionShowTagline} isExiting={isExiting} />
      )}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHomePage />} />
            {/* TODO: Add your domain routes here */}
            {/* <Route path="/dashboard/resources" element={<DashboardResourcesPage />} /> */}
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
