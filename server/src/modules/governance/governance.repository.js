import { eq, asc } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import {
  customerTierDiscountLimits,
  categoryDiscountLimits,
  approvalRules,
  productCategories,
} from '../../db/schema/index.js';

// --- Customer Tier Discount Limits ---
export async function findTierLimits(tx = undefined) {
  const db = tx || getDb();
  return db
    .select()
    .from(customerTierDiscountLimits)
    .orderBy(customerTierDiscountLimits.tier);
}

export async function findTierLimitByTier(tier, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(customerTierDiscountLimits)
    .where(eq(customerTierDiscountLimits.tier, tier))
    .limit(1);
  return rows[0] || null;
}

export async function upsertTierLimit(tier, maxDiscountPct, tx = undefined) {
  const db = tx || getDb();
  const existing = await findTierLimitByTier(tier, tx);
  if (existing) {
    const updated = await db
      .update(customerTierDiscountLimits)
      .set({
        maxDiscountPct: String(maxDiscountPct),
        updatedAt: new Date(),
      })
      .where(eq(customerTierDiscountLimits.id, existing.id))
      .returning();
    return updated[0];
  }

  const inserted = await db
    .insert(customerTierDiscountLimits)
    .values({
      tier,
      maxDiscountPct: String(maxDiscountPct),
    })
    .returning();
  return inserted[0];
}

// --- Category Discount Limits ---
export async function findCategoryLimits(tx = undefined) {
  const db = tx || getDb();
  return db
    .select({
      id: categoryDiscountLimits.id,
      categoryId: categoryDiscountLimits.categoryId,
      categoryName: productCategories.name,
      maxDiscountPct: categoryDiscountLimits.maxDiscountPct,
      createdAt: categoryDiscountLimits.createdAt,
      updatedAt: categoryDiscountLimits.updatedAt,
    })
    .from(categoryDiscountLimits)
    .leftJoin(productCategories, eq(categoryDiscountLimits.categoryId, productCategories.id));
}

export async function findCategoryLimitByCategoryId(categoryId, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(categoryDiscountLimits)
    .where(eq(categoryDiscountLimits.categoryId, categoryId))
    .limit(1);
  return rows[0] || null;
}

export async function upsertCategoryLimit(categoryId, maxDiscountPct, tx = undefined) {
  const db = tx || getDb();
  const existing = await findCategoryLimitByCategoryId(categoryId, tx);
  if (existing) {
    const updated = await db
      .update(categoryDiscountLimits)
      .set({
        maxDiscountPct: String(maxDiscountPct),
        updatedAt: new Date(),
      })
      .where(eq(categoryDiscountLimits.id, existing.id))
      .returning();
    return updated[0];
  }

  const inserted = await db
    .insert(categoryDiscountLimits)
    .values({
      categoryId,
      maxDiscountPct: String(maxDiscountPct),
    })
    .returning();
  return inserted[0];
}

export async function deleteCategoryLimit(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .delete(categoryDiscountLimits)
    .where(eq(categoryDiscountLimits.id, id))
    .returning();
  return rows[0] || null;
}

// --- Approval Rules ---
export async function findApprovalRules(tx = undefined) {
  const db = tx || getDb();
  return db
    .select()
    .from(approvalRules)
    .orderBy(asc(approvalRules.minOveragePct));
}

export async function findApprovalRuleById(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(approvalRules)
    .where(eq(approvalRules.id, id))
    .limit(1);
  return rows[0] || null;
}

export async function createApprovalRule(data, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .insert(approvalRules)
    .values({
      minOveragePct: String(data.minOveragePct),
      maxOveragePct: data.maxOveragePct !== undefined && data.maxOveragePct !== null ? String(data.maxOveragePct) : null,
      requiredLevel: data.requiredLevel,
      isActive: data.isActive !== undefined ? data.isActive : true,
    })
    .returning();
  return rows[0];
}

export async function updateApprovalRule(id, data, tx = undefined) {
  const db = tx || getDb();
  const updateData = {};
  if (data.minOveragePct !== undefined) updateData.minOveragePct = String(data.minOveragePct);
  if (data.maxOveragePct !== undefined) {
    updateData.maxOveragePct = data.maxOveragePct !== null ? String(data.maxOveragePct) : null;
  }
  if (data.requiredLevel !== undefined) updateData.requiredLevel = data.requiredLevel;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const rows = await db
    .update(approvalRules)
    .set(updateData)
    .where(eq(approvalRules.id, id))
    .returning();
  return rows[0] || null;
}

export async function deleteApprovalRule(id, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .delete(approvalRules)
    .where(eq(approvalRules.id, id))
    .returning();
  return rows[0] || null;
}
