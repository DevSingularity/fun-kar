import { Router } from 'express';
import healthRouter from './health.route.js';
import authRoutes from '../modules/auth/auth.routes.js';
import categoriesRoutes from '../modules/categories/categories.routes.js';
import productsRoutes from '../modules/products/products.routes.js';
import priceListsRoutes from '../modules/priceLists/priceLists.routes.js';
import customersRoutes from '../modules/customers/customers.routes.js';
import governanceRoutes from '../modules/governance/governance.routes.js';
import riskRoutes from '../modules/risk/risk.routes.js';
import quotationsRoutes from '../modules/quotations/quotations.routes.js';
import dashboardRoutes from '../modules/dashboard/dashboard.routes.js';
import approvalRoutes from '../modules/approval/approval.routes.js';
import { adminRouter as upsellRulesRoutes, suggestionsRouter as quoteUpsellRoutes } from '../modules/intelligence/intelligence.routes.js';
import warehousesRoutes from '../modules/warehouses/warehouses.routes.js';
import fulfillmentRoutes from '../modules/fulfillment/fulfillment.routes.js';
import portalAuthRoutes from '../modules/portalAuth/portalAuth.routes.js';
import customerPortalUsersRoutes from '../modules/customerPortalUsers/customerPortalUsers.routes.js';
import quotationSharingRoutes from '../modules/quotationSharing/quotationSharing.routes.js';
import portalQuotesRoutes from '../modules/portalQuotes/portalQuotes.routes.js';
import { quotationNegotiationRouter, requestActionsRouter } from '../modules/negotiation/negotiation.internal.routes.js';
import paymentsRoutes from '../modules/payments/payments.routes.js';
import dealHealthRoutes from '../modules/dealHealth/dealHealth.routes.js';
import usersRoutes from '../modules/users/users.routes.js';
import subscriptionPlansRoutes from '../modules/subscriptionPlans/subscriptionPlans.routes.js';
import {
  billingOrderRoutes,
  invoicesRoutes,
  subscriptionsRoutes,
  billingSchedulesRoutes,
  reconciliationRoutes,
} from '../modules/billing/billing.routes.js';

const router = Router();

// Health Check
router.use(healthRouter);

// Core Modules
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/price-lists', priceListsRoutes);
router.use('/customers', customersRoutes);
router.use('/governance', governanceRoutes);
router.use('/risk', riskRoutes);
router.use('/quotations', quotationsRoutes);
router.use('/quotations/:id', quoteUpsellRoutes);
router.use('/approval-requests', approvalRoutes);
router.use('/approvals', approvalRoutes);
router.use('/upsell-rules', upsellRulesRoutes);
router.use('/warehouses', warehousesRoutes);
router.use('/orders', fulfillmentRoutes);
router.use('/fulfillment', fulfillmentRoutes);
router.use('/deal-health', dealHealthRoutes);
router.use('/users', usersRoutes);

// Billing & Subscriptions Modules
router.use('/subscription-plans', subscriptionPlansRoutes);
router.use('/orders', billingOrderRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/subscriptions', subscriptionsRoutes);
router.use('/billing-schedules', billingSchedulesRoutes);
router.use('/reconciliation', reconciliationRoutes);

// Phase 7 Modules
router.use('/portal/auth', portalAuthRoutes);
router.use('/customers/:customerId/portal-users', customerPortalUsersRoutes);
router.use('/quotations', quotationSharingRoutes);
router.use('/quotations', quotationNegotiationRouter);
router.use('/negotiation-requests', requestActionsRouter);
router.use('/portal/quotes', portalQuotesRoutes);
router.use('/invoices', paymentsRoutes);

export default router;

