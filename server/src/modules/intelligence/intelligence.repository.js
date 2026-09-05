import { eq, and, sql, notInArray } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { upsellRules } from '../../db/schema/intelligence.js';
import { products, productCategories } from '../../db/schema/catalog.js';
import { quotationItems } from '../../db/schema/quotations.js';
import { ConflictError } from '../../common/errors.js';

export async function insertRule(data, tx = undefined) {
  const db = tx || getDb();
  try {
    const rows = await db.insert(upsellRules).values(data).returning();
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('A rule for this product pair already exists.', 'RULE_EXISTS');
    }
    throw err;
  }
}

export async function listRules({ triggerProductId, isActive, offset = 0, limit = 20 } = {}) {
  const db = getDb();
  const conditions = [];
  if (triggerProductId) conditions.push(eq(upsellRules.triggerProductId, triggerProductId));
  if (isActive !== undefined) conditions.push(eq(upsellRules.isActive, isActive));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(upsellRules)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  const countResult = await db
    .select({ count: sql`count(*)` })
    .from(upsellRules)
    .where(whereClause);

  return { rows, total: Number(countResult[0]?.count || 0) };
}

export async function findRuleById(id) {
  const db = getDb();
  const rows = await db.select().from(upsellRules).where(eq(upsellRules.id, id)).limit(1);
  return rows[0] || null;
}

export async function findRuleByIdActive(id) {
  const db = getDb();
  const rows = await db
    .select()
    .from(upsellRules)
    .where(and(eq(upsellRules.id, id), eq(upsellRules.isActive, true)))
    .limit(1);
  return rows[0] || null;
}

export async function updateRule(id, data) {
  const db = getDb();
  const rows = await db
    .update(upsellRules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(upsellRules.id, id))
    .returning();
  return rows[0] || null;
}

export async function softDeleteRule(id) {
  const db = getDb();
  const rows = await db
    .update(upsellRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(upsellRules.id, id))
    .returning();
  return rows[0] || null;
}

export async function findCandidatesForQuotation(quotationId) {
  const db = getDb();
  
  // Products currently in cart
  const inCartRows = await db
    .select({ productId: quotationItems.productId })
    .from(quotationItems)
    .where(eq(quotationItems.quotationId, quotationId));
  
  const inCartProductIds = inCartRows.map((r) => r.productId);

  const query = db
    .select({
      rule: upsellRules,
      recommendedProduct: products,
      categoryName: productCategories.name,
    })
    .from(upsellRules)
    .innerJoin(
      quotationItems,
      and(
        eq(quotationItems.quotationId, quotationId),
        eq(quotationItems.productId, upsellRules.triggerProductId)
      )
    )
    .innerJoin(products, eq(products.id, upsellRules.recommendedProductId))
    .innerJoin(productCategories, eq(productCategories.id, products.categoryId));

  if (inCartProductIds.length > 0) {
    return query.where(
      and(
        eq(upsellRules.isActive, true),
        notInArray(upsellRules.recommendedProductId, inCartProductIds)
      )
    );
  }

  return query.where(eq(upsellRules.isActive, true));
}
