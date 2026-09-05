import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { validateChangeSubscription, validateCancelSubscription } from './billing.validator.js';
import * as ctrl from './billing.controller.js';

const BILLING_READ_ROLES = ['SALES_REP', 'SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'];
const BILLING_WRITE_ROLES = ['SALES_MANAGER', 'FINANCE', 'OPERATIONS', 'ADMIN'];
const RECONCILIATION_ROLES = ['FINANCE', 'ADMIN'];

// Mounted at /orders
export const billingOrderRoutes = Router();
billingOrderRoutes.use(authenticate);
billingOrderRoutes.post(
  '/:id/billing/generate',
  authorize(...BILLING_WRITE_ROLES),
  asyncHandler(ctrl.generateBillingForOrder)
);

// Mounted at /invoices
export const invoicesRoutes = Router();
invoicesRoutes.use(authenticate);
invoicesRoutes.get('/', authorize(...BILLING_READ_ROLES), asyncHandler(ctrl.listInvoices));
invoicesRoutes.get('/:id', authorize(...BILLING_READ_ROLES), asyncHandler(ctrl.getInvoiceDetail));

// Mounted at /subscriptions
export const subscriptionsRoutes = Router();
subscriptionsRoutes.use(authenticate);
subscriptionsRoutes.get('/', authorize(...BILLING_READ_ROLES), asyncHandler(ctrl.listSubscriptions));
subscriptionsRoutes.get('/:id', authorize(...BILLING_READ_ROLES), asyncHandler(ctrl.getSubscriptionDetail));
subscriptionsRoutes.post(
  '/:id/pause',
  authorize(...BILLING_WRITE_ROLES),
  asyncHandler(ctrl.pauseSubscription)
);
subscriptionsRoutes.post(
  '/:id/resume',
  authorize(...BILLING_WRITE_ROLES),
  asyncHandler(ctrl.resumeSubscription)
);
subscriptionsRoutes.post(
  '/:id/change',
  authorize(...BILLING_WRITE_ROLES),
  validateChangeSubscription,
  asyncHandler(ctrl.changeSubscription)
);
subscriptionsRoutes.post(
  '/:id/cancel',
  authorize(...BILLING_WRITE_ROLES),
  validateCancelSubscription,
  asyncHandler(ctrl.cancelSubscription)
);

// Mounted at /billing-schedules
export const billingSchedulesRoutes = Router();
billingSchedulesRoutes.use(authenticate);
billingSchedulesRoutes.post(
  '/:id/invoice',
  authorize('FINANCE', 'OPERATIONS', 'ADMIN'),
  asyncHandler(ctrl.invoiceBillingSchedule)
);

// Mounted at /reconciliation
export const reconciliationRoutes = Router();
reconciliationRoutes.use(authenticate);
reconciliationRoutes.get(
  '/overview',
  authorize(...RECONCILIATION_ROLES),
  asyncHandler(ctrl.getReconciliationOverview)
);
