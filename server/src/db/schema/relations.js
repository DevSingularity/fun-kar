import { relations } from 'drizzle-orm';
import { users, customerUsers, portalTokens } from './users.js';
import { customers } from './customers.js';
import {
  productCategories,
  products,
  productVariants,
  priceLists,
  priceListItems,
} from './catalog.js';
import { upsellRules } from './intelligence.js';
import { quotations, quotationItems, quotationPortalTokens } from './quotations.js';
import {
  categoryDiscountLimits,
  approvalRequests,
  approvalActions,
  auditLogs,
} from './governance.js';
import { orders, orderItems } from './orders.js';
import { warehouses, warehouseStock, fulfillmentAllocations, backorders } from './warehouses.js';
import {
  subscriptionPlans,
  subscriptionLines,
  billingSchedules,
  invoices,
  invoiceLines,
  payments,
  creditNotes,
} from './billing.js';
import { dealAlerts } from './dealhealth.js';
import { negotiationRequests, negotiationComments } from './negotiation.js';

export const usersRelations = relations(users, ({ many }) => ({
  managedCustomers: many(customers),
  approvalActions: many(approvalActions),
  auditLogs: many(auditLogs),
  resolvedAlerts: many(dealAlerts),
}));

export const customerUsersRelations = relations(customerUsers, ({ one, many }) => ({
  customer: one(customers, {
    fields: [customerUsers.customerId],
    references: [customers.id],
  }),
  portalTokens: many(portalTokens),
  negotiationRequests: many(negotiationRequests),
}));

export const portalTokensRelations = relations(portalTokens, ({ one }) => ({
  customerUser: one(customerUsers, {
    fields: [portalTokens.customerUserId],
    references: [customerUsers.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  assignedRep: one(users, {
    fields: [customers.assignedRepId],
    references: [users.id],
  }),
  priceList: one(priceLists, {
    fields: [customers.priceListId],
    references: [priceLists.id],
  }),
  portalUsers: many(customerUsers),
  quotations: many(quotations),
  orders: many(orders),
  invoices: many(invoices),
}));

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  products: many(products),
  discountLimits: many(categoryDiscountLimits),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  variants: many(productVariants),
  priceListItems: many(priceListItems),
  warehouseStock: many(warehouseStock),
  triggeredUpsells: many(upsellRules, { relationName: 'triggerProduct' }),
  recommendedUpsells: many(upsellRules, { relationName: 'recommendedProduct' }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

export const priceListsRelations = relations(priceLists, ({ many }) => ({
  items: many(priceListItems),
  customers: many(customers),
}));

export const priceListItemsRelations = relations(priceListItems, ({ one }) => ({
  priceList: one(priceLists, {
    fields: [priceListItems.priceListId],
    references: [priceLists.id],
  }),
  product: one(products, {
    fields: [priceListItems.productId],
    references: [products.id],
  }),
}));

export const upsellRulesRelations = relations(upsellRules, ({ one }) => ({
  triggerProduct: one(products, {
    fields: [upsellRules.triggerProductId],
    references: [products.id],
    relationName: 'triggerProduct',
  }),
  recommendedProduct: one(products, {
    fields: [upsellRules.recommendedProductId],
    references: [products.id],
    relationName: 'recommendedProduct',
  }),
}));

export const quotationsRelations = relations(quotations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [quotations.customerId],
    references: [customers.id],
  }),
  salesRep: one(users, {
    fields: [quotations.salesRepId],
    references: [users.id],
  }),
  items: many(quotationItems),
  approvalRequests: many(approvalRequests),
  portalTokens: many(quotationPortalTokens),
  negotiationRequests: many(negotiationRequests),
  negotiationComments: many(negotiationComments),
  dealAlerts: many(dealAlerts),
  order: one(orders, {
    fields: [quotations.id],
    references: [orders.quotationId],
  }),
}));

export const quotationItemsRelations = relations(quotationItems, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationItems.quotationId],
    references: [quotations.id],
  }),
  product: one(products, {
    fields: [quotationItems.productId],
    references: [products.id],
  }),
  sourceUpsellRule: one(upsellRules, {
    fields: [quotationItems.sourceUpsellRuleId],
    references: [upsellRules.id],
  }),
}));

export const quotationPortalTokensRelations = relations(quotationPortalTokens, ({ one }) => ({
  quotation: one(quotations, {
    fields: [quotationPortalTokens.quotationId],
    references: [quotations.id],
  }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [approvalRequests.quotationId],
    references: [quotations.id],
  }),
  actions: many(approvalActions),
}));

export const approvalActionsRelations = relations(approvalActions, ({ one }) => ({
  approvalRequest: one(approvalRequests, {
    fields: [approvalActions.approvalRequestId],
    references: [approvalRequests.id],
  }),
  actor: one(users, {
    fields: [approvalActions.actorId],
    references: [users.id],
  }),
}));

export const categoryDiscountLimitsRelations = relations(categoryDiscountLimits, ({ one }) => ({
  category: one(productCategories, {
    fields: [categoryDiscountLimits.categoryId],
    references: [productCategories.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [orders.quotationId],
    references: [quotations.id],
  }),
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  invoices: many(invoices),
  dealAlerts: many(dealAlerts),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  quotationItem: one(quotationItems, {
    fields: [orderItems.quotationItemId],
    references: [quotationItems.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  fulfillmentAllocations: many(fulfillmentAllocations),
  backorders: many(backorders),
  subscriptionLine: one(subscriptionLines, {
    fields: [orderItems.id],
    references: [subscriptionLines.orderItemId],
  }),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  stock: many(warehouseStock),
  fulfillmentAllocations: many(fulfillmentAllocations),
}));

export const warehouseStockRelations = relations(warehouseStock, ({ one }) => ({
  warehouse: one(warehouses, {
    fields: [warehouseStock.warehouseId],
    references: [warehouses.id],
  }),
  product: one(products, {
    fields: [warehouseStock.productId],
    references: [products.id],
  }),
}));

export const fulfillmentAllocationsRelations = relations(fulfillmentAllocations, ({ one }) => ({
  order: one(orders, {
    fields: [fulfillmentAllocations.orderId],
    references: [orders.id],
  }),
  orderItem: one(orderItems, {
    fields: [fulfillmentAllocations.orderItemId],
    references: [orderItems.id],
  }),
  warehouse: one(warehouses, {
    fields: [fulfillmentAllocations.warehouseId],
    references: [warehouses.id],
  }),
}));

export const backordersRelations = relations(backorders, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [backorders.orderItemId],
    references: [orderItems.id],
  }),
}));

export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  subscriptionLines: many(subscriptionLines),
}));

export const subscriptionLinesRelations = relations(subscriptionLines, ({ one, many }) => ({
  orderItem: one(orderItems, {
    fields: [subscriptionLines.orderItemId],
    references: [orderItems.id],
  }),
  plan: one(subscriptionPlans, {
    fields: [subscriptionLines.subscriptionPlanId],
    references: [subscriptionPlans.id],
  }),
  billingSchedules: many(billingSchedules),
  creditNotes: many(creditNotes),
}));

export const billingSchedulesRelations = relations(billingSchedules, ({ one }) => ({
  subscriptionLine: one(subscriptionLines, {
    fields: [billingSchedules.subscriptionLineId],
    references: [subscriptionLines.id],
  }),
  invoice: one(invoices, {
    fields: [billingSchedules.invoiceId],
    references: [invoices.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  customer: one(customers, {
    fields: [invoices.customerId],
    references: [customers.id],
  }),
  lines: many(invoiceLines),
  payments: many(payments),
  billingSchedules: many(billingSchedules),
}));

export const invoiceLinesRelations = relations(invoiceLines, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLines.invoiceId],
    references: [invoices.id],
  }),
  orderItem: one(orderItems, {
    fields: [invoiceLines.orderItemId],
    references: [orderItems.id],
  }),
  billingSchedule: one(billingSchedules, {
    fields: [invoiceLines.billingScheduleId],
    references: [billingSchedules.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

export const creditNotesRelations = relations(creditNotes, ({ one }) => ({
  subscriptionLine: one(subscriptionLines, {
    fields: [creditNotes.subscriptionLineId],
    references: [subscriptionLines.id],
  }),
  invoice: one(invoices, {
    fields: [creditNotes.invoiceId],
    references: [invoices.id],
  }),
}));

export const dealAlertsRelations = relations(dealAlerts, ({ one }) => ({
  quotation: one(quotations, {
    fields: [dealAlerts.quotationId],
    references: [quotations.id],
  }),
  order: one(orders, {
    fields: [dealAlerts.orderId],
    references: [orders.id],
  }),
  resolvedByUser: one(users, {
    fields: [dealAlerts.resolvedBy],
    references: [users.id],
  }),
}));

export const negotiationRequestsRelations = relations(negotiationRequests, ({ one, many }) => ({
  quotation: one(quotations, {
    fields: [negotiationRequests.quotationId],
    references: [quotations.id],
  }),
  quotationItem: one(quotationItems, {
    fields: [negotiationRequests.quotationItemId],
    references: [quotationItems.id],
  }),
  customerUser: one(customerUsers, {
    fields: [negotiationRequests.customerUserId],
    references: [customerUsers.id],
  }),
  resolvedByUser: one(users, {
    fields: [negotiationRequests.resolvedBy],
    references: [users.id],
  }),
  comments: many(negotiationComments),
}));

export const negotiationCommentsRelations = relations(negotiationComments, ({ one }) => ({
  negotiationRequest: one(negotiationRequests, {
    fields: [negotiationComments.negotiationRequestId],
    references: [negotiationRequests.id],
  }),
  quotation: one(quotations, {
    fields: [negotiationComments.quotationId],
    references: [quotations.id],
  }),
  quotationItem: one(quotationItems, {
    fields: [negotiationComments.quotationItemId],
    references: [quotationItems.id],
  }),
  authorUser: one(users, {
    fields: [negotiationComments.authorUserId],
    references: [users.id],
  }),
  authorCustomerUser: one(customerUsers, {
    fields: [negotiationComments.authorCustomerUserId],
    references: [customerUsers.id],
  }),
}));
