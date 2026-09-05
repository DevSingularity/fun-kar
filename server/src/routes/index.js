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
import portalAuthRoutes from '../modules/portalAuth/portalAuth.routes.js';
import customerPortalUsersRoutes from '../modules/customerPortalUsers/customerPortalUsers.routes.js';
import quotationSharingRoutes from '../modules/quotationSharing/quotationSharing.routes.js';
import portalQuotesRoutes from '../modules/portalQuotes/portalQuotes.routes.js';
import { quotationNegotiationRouter, requestActionsRouter } from '../modules/negotiation/negotiation.internal.routes.js';
import paymentsRoutes from '../modules/payments/payments.routes.js';

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
router.use('/upsell-rules', upsellRulesRoutes);

// Phase 7 Modules
router.use('/portal/auth', portalAuthRoutes);
router.use('/customers/:customerId/portal-users', customerPortalUsersRoutes);
router.use('/quotations', quotationSharingRoutes);
router.use('/quotations', quotationNegotiationRouter);
router.use('/negotiation-requests', requestActionsRouter);
router.use('/portal/quotes', portalQuotesRoutes);
router.use('/invoices', paymentsRoutes);

export default router;

