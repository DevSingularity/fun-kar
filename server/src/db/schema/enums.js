import { pgEnum } from 'drizzle-orm/pg-core';

// Internal staff roles. CUSTOMER is intentionally excluded — customers
// authenticate through the separate `customer_users` identity space.
export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'SALES_REP',
  'SALES_MANAGER',
  'FINANCE',
  'OPERATIONS',
]);

export const customerTierEnum = pgEnum('customer_tier', ['BRONZE', 'SILVER', 'GOLD']);

export const productTypeEnum = pgEnum('product_type', ['ONE_TIME', 'SERVICE', 'SUBSCRIPTION']);

export const quotationStatusEnum = pgEnum('quotation_status', [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SENT',
  'UNDER_NEGOTIATION',
  'CONFIRMED',
  'FULFILLING',
  'COMPLETED',
  'CANCELLED',
]);

// NONE = no approval required; MANAGER = sales-manager sign-off only;
// MANAGER_FINANCE = sales-manager followed by finance sign-off.
export const approvalLevelEnum = pgEnum('approval_level', ['NONE', 'MANAGER', 'FINANCE', 'MANAGER_FINANCE']);

export const approvalRequestStatusEnum = pgEnum('approval_request_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'RETURNED',
]);

export const approvalActionTypeEnum = pgEnum('approval_action_type', [
  'APPROVED',
  'REJECTED',
  'RETURNED',
]);

export const billingFrequencyEnum = pgEnum('billing_frequency', [
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
]);

export const billingLineTypeEnum = pgEnum('billing_line_type', ['ONE_TIME', 'RECURRING']);

export const subscriptionLineStatusEnum = pgEnum('subscription_line_status', [
  'ACTIVE',
  'CANCELLED',
  'PAUSED',
]);

export const billingScheduleStatusEnum = pgEnum('billing_schedule_status', [
  'SCHEDULED',
  'INVOICED',
  'PAID',
  'SKIPPED',
]);

export const invoiceTypeEnum = pgEnum('invoice_type', ['ONE_TIME', 'RECURRING']);

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'VOID',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
]);

export const creditNoteStatusEnum = pgEnum('credit_note_status', ['ISSUED', 'APPLIED', 'VOID']);

export const orderStatusEnum = pgEnum('order_status', [
  'PENDING_FULFILLMENT',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'BACKORDERED',
  'CANCELLED',
]);

export const backorderStatusEnum = pgEnum('backorder_status', [
  'OPEN',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'CANCELLED',
]);

export const negotiationRequestTypeEnum = pgEnum('negotiation_request_type', [
  'COMMENT',
  'CHANGE_REQUEST',
  'COUNTER_DISCOUNT',
]);

export const negotiationRequestStatusEnum = pgEnum('negotiation_request_status', [
  'OPEN',
  'RESOLVED',
  'REJECTED',
]);

export const negotiationAuthorTypeEnum = pgEnum('negotiation_author_type', [
  'CUSTOMER',
  'INTERNAL',
]);

export const dealAlertTypeEnum = pgEnum('deal_alert_type', [
  'STALLED',
  'DISCOUNT_ANOMALY',
  'DELIVERY_SLIPPAGE',
  'LOW_MARGIN',
]);

export const dealAlertSeverityEnum = pgEnum('deal_alert_severity', ['LOW', 'MEDIUM', 'HIGH']);

export const quotationOriginTypeEnum = pgEnum('quotation_origin_type', [
  'INTERNAL',
  'CUSTOMER_SELF_SERVICE',
]);

export const dealAlertStatusEnum = pgEnum('deal_alert_status', [
  'OPEN',
  'ACKNOWLEDGED',
  'ESCALATED',
  'RESOLVED',
  'DISMISSED',
]);
