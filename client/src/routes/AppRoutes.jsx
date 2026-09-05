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
import V1QuotationDetailPage from '../pages/quotations/V1QuotationDetailPage.jsx';
import V1CustomersPage from '../pages/customers/V1CustomersPage.jsx';
import V1ProductsPage from '../pages/catalog/V1ProductsPage.jsx';
import V1ApprovalsPage from '../pages/approvals/V1ApprovalsPage.jsx';
import V1ApprovalDetailPage from '../pages/approvals/V1ApprovalDetailPage.jsx';
import V1DealHealthPage from '../pages/dealHealth/V1DealHealthPage.jsx';
import V1DealDetailPage from '../pages/dealHealth/V1DealDetailPage.jsx';
import V1FulfillmentPage from '../pages/fulfillment/V1FulfillmentPage.jsx';
import V1FulfillmentDetailPage from '../pages/fulfillment/V1FulfillmentDetailPage.jsx';
import V1GovernancePage from '../pages/governance/V1GovernancePage.jsx';
import V1InvoicesPage from '../pages/billing/V1InvoicesPage.jsx';
import V1InvoiceDetailPage from '../pages/billing/V1InvoiceDetailPage.jsx';
import V1SubscriptionsPage from '../pages/billing/V1SubscriptionsPage.jsx';
import V1ReconciliationPage from '../pages/billing/V1ReconciliationPage.jsx';
import ProductsPage from '../pages/catalog/ProductsPage.jsx';
import PricingPage from '../pages/catalog/PricingPage.jsx';
import DiscountsPage from '../pages/governance/DiscountsPage.jsx';
import CustomersPage from '../pages/customers/CustomersPage.jsx';
import QuotationsPage from '../pages/quotations/QuotationsPage.jsx';
import QuotationDetailPage from '../pages/quotations/QuotationDetailPage.jsx';
import CustomerQuotationsPage from '../customer/CustomerQuotationsPage.jsx';
import CustomerQuotationDetailPage from '../customer/CustomerQuotationDetailPage.jsx';

import useAuthStore from '../store/auth.store.js';

function PrivateRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}

function RoleRoute({ allowedRoles }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'SALES_MANAGER' ? '/v1/deal-health' : '/v1/dashboard';
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
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
        
        {/* Phase 7 Customer Portal Routes */}
        <Route path="/v1/customer" element={<CustomerQuotationsPage />} />
        <Route path="/v1/customer/:quotationId" element={<CustomerQuotationDetailPage />} />

        <Route element={<PrivateRoute />}>
          {/* Universal Authenticated Dashboard */}
          <Route element={<RoleRoute allowedRoles={['SALES_REP', 'FINANCE', 'OPERATIONS', 'ADMIN']} />}>
            <Route path="/v1/dashboard" element={<V1DashboardPage />} />
          </Route>

          {/* Quotations, Customers & Product Master: Sales Rep, Operations, Admin */}
          <Route element={<RoleRoute allowedRoles={['SALES_REP', 'OPERATIONS', 'ADMIN']} />}>
            <Route path="/v1/quotations" element={<V1QuotationsPage />} />
            <Route path="/v1/quotations/:id" element={<V1QuotationDetailPage />} />
            <Route path="/v1/customers" element={<V1CustomersPage />} />
            <Route path="/v1/products" element={<V1ProductsPage />} />
            <Route path="/v1/product" element={<V1ProductsPage />} />
          </Route>

          {/* Approvals: Sales Manager, Finance, Admin */}
          <Route element={<RoleRoute allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']} />}>
            <Route path="/v1/approvals" element={<V1ApprovalsPage />} />
            <Route path="/v1/approvals/:id" element={<V1ApprovalDetailPage />} />
          </Route>

          {/* Deal Health: Sales Manager, Admin */}
          <Route element={<RoleRoute allowedRoles={['SALES_MANAGER', 'ADMIN']} />}>
            <Route path="/v1/deal-health" element={<V1DealHealthPage />} />
            <Route path="/v1/deal-health/:quotationId" element={<V1DealDetailPage />} />
            <Route path="/v1/deal/:quotationId" element={<V1DealDetailPage />} />
            <Route path="/v1/deals" element={<V1DealHealthPage />} />
          </Route>

          {/* Governance & Risk Engine: Admin Only */}
          <Route element={<RoleRoute allowedRoles={['ADMIN']} />}>
            <Route path="/v1/governance" element={<V1GovernancePage />} />
            <Route path="/v1/discounts" element={<V1GovernancePage />} />
          </Route>

          {/* Fulfillment: Operations, Finance, Admin */}
          <Route element={<RoleRoute allowedRoles={['OPERATIONS', 'FINANCE', 'ADMIN']} />}>
            <Route path="/v1/fulfillment" element={<V1FulfillmentPage />} />
            <Route path="/v1/fulfillment/:id" element={<V1FulfillmentDetailPage />} />
          </Route>

          {/* Invoices & Subscriptions: Sales Manager, Finance, Operations, Admin */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS']} />}>
            <Route path="/v1/invoices" element={<V1InvoicesPage />} />
            <Route path="/v1/invoices/:id" element={<V1InvoiceDetailPage />} />
            <Route path="/v1/subscriptions" element={<V1SubscriptionsPage />} />
          </Route>

          {/* Reconciliation: Finance, Admin Only */}
          <Route element={<RoleRoute allowedRoles={['ADMIN', 'FINANCE']} />}>
            <Route path="/v1/reconciliation" element={<V1ReconciliationPage />} />
          </Route>

          {/* Standard Shell Layout */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHomePage />} />
            <Route path="/dashboard/products" element={<ProductsPage />} />
            
            {/* Scoped Sub-pages */}
            <Route element={<RoleRoute allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ADMIN']} />}>
              <Route path="/dashboard/customers" element={<CustomersPage />} />
              <Route path="/dashboard/quotations" element={<QuotationsPage />} />
              <Route path="/dashboard/quotations/:id" element={<QuotationDetailPage />} />
            </Route>

            <Route element={<RoleRoute allowedRoles={['SALES_MANAGER', 'FINANCE', 'ADMIN']} />}>
              <Route path="/dashboard/pricing" element={<PricingPage />} />
              <Route path="/dashboard/governance" element={<DiscountsPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}


