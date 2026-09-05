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
import V1DashboardPage from '../pages/dashboard/V1DashboardPage.jsx';
import V1QuotationsPage from '../pages/quotations/V1QuotationsPage.jsx';
import ProductsPage from '../pages/catalog/ProductsPage.jsx';
import PricingPage from '../pages/catalog/PricingPage.jsx';
import DiscountsPage from '../pages/governance/DiscountsPage.jsx';
import CustomersPage from '../pages/customers/CustomersPage.jsx';
import QuotationsPage from '../pages/quotations/QuotationsPage.jsx';
import QuotationDetailPage from '../pages/quotations/QuotationDetailPage.jsx';

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
          {/* Standalone Official Wireframe V1 Sales Pages */}
          <Route path="/v1/dashboard" element={<V1DashboardPage />} />
          <Route path="/v1/quotations" element={<V1QuotationsPage />} />
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHomePage />} />
            <Route path="/dashboard/products" element={<ProductsPage />} />
            <Route path="/dashboard/pricing" element={<PricingPage />} />
            <Route path="/dashboard/governance" element={<DiscountsPage />} />
            <Route path="/dashboard/customers" element={<CustomersPage />} />
            <Route path="/dashboard/quotations" element={<QuotationsPage />} />
            <Route path="/dashboard/quotations/:id" element={<QuotationDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
