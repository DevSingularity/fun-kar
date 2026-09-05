import { getDb } from '../../config/database.js';
import { quotations, quotationItems, quotationPortalTokens, customers, products, orders, invoices } from '../../db/schema/index.js';
import { eq, and, inArray, desc, sql } from 'drizzle-orm';

const SAFE_QUOTE_COLUMNS = {
  id: quotations.id,
  quoteNumber: quotations.quoteNumber,
  customerId: quotations.customerId,
  status: quotations.status,
  subtotal: quotations.subtotal,
  discountTotal: quotations.discountTotal,
  taxTotal: quotations.taxTotal,
  grandTotal: quotations.grandTotal,
  promisedDeliveryDate: quotations.promisedDeliveryDate,
  createdAt: quotations.createdAt,
  confirmedAt: quotations.confirmedAt,
};

const SAFE_ITEM_COLUMNS = {
  id: quotationItems.id,
  productId: quotationItems.productId,
  productName: products.name,
  productSku: products.sku,
  quantity: quotationItems.quantity,
  unitPrice: quotationItems.unitPrice,
  discountPct: quotationItems.discountPct,
  allowedDiscountPct: quotationItems.allowedDiscountPct, // Threshold for this product
  discountAmount: quotationItems.discountAmount,
  taxAmount: quotationItems.taxAmount,
  lineTotal: quotationItems.lineTotal,
};

export async function hasBeenShared(quotationId) {
  const db = getDb();
  const [row] = await db
    .select({ id: quotationPortalTokens.id })
    .from(quotationPortalTokens)
    .where(eq(quotationPortalTokens.quotationId, quotationId));
  return !!row;
}

export async function listForCustomer(customerId, { offset, limit }) {
  const db = getDb();
  const sharedQuoteIdsSubquery = db
    .select({ quotationId: quotationPortalTokens.quotationId })
    .from(quotationPortalTokens);

  const rows = await db
    .select(SAFE_QUOTE_COLUMNS)
    .from(quotations)
    .where(
      and(
        eq(quotations.customerId, customerId),
        inArray(quotations.id, sharedQuoteIdsSubquery)
      )
    )
    .orderBy(desc(quotations.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(quotations)
    .where(
      and(
        eq(quotations.customerId, customerId),
        inArray(quotations.id, sharedQuoteIdsSubquery)
      )
    );

  return { rows, count };
}

export async function findSafeQuote(quotationId) {
  const db = getDb();
  const [quote] = await db
    .select({
      ...SAFE_QUOTE_COLUMNS,
      customerName: customers.name,
    })
    .from(quotations)
    .innerJoin(customers, eq(quotations.customerId, customers.id))
    .where(eq(quotations.id, quotationId));

  if (!quote) return null;

  const items = await db
    .select(SAFE_ITEM_COLUMNS)
    .from(quotationItems)
    .innerJoin(products, eq(quotationItems.productId, products.id))
    .where(eq(quotationItems.quotationId, quotationId));

  return {
    ...quote,
    items,
  };
}

export async function findRawQuote(quotationId) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(quotations)
    .where(eq(quotations.id, quotationId));
  return row || null;
}

export async function findOrderForQuotation(quotationId) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.quotationId, quotationId));
  return row || null;
}

export async function findDraftOneTimeInvoice(orderId) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.orderId, orderId),
        eq(invoices.status, 'DRAFT')
      )
    );
  return row || null;
}

