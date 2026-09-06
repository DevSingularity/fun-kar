import { query, queryOne } from '../../config/database.js';

// --- Customer Tier Discount Limits ---
export async function findTierLimits(tx = undefined) {
  return await query(
    `SELECT * FROM customer_tier_discount_limits ORDER BY tier ASC`,
    [],
    tx
  );
}

export async function findTierLimitByTier(tier, tx = undefined) {
  return await queryOne(
    `SELECT * FROM customer_tier_discount_limits WHERE tier = $1 LIMIT 1`,
    [tier],
    tx
  );
}

export async function upsertTierLimit(tier, maxDiscountPct, tx = undefined) {
  const existing = await findTierLimitByTier(tier, tx);
  if (existing) {
    return await queryOne(
      `UPDATE customer_tier_discount_limits
       SET max_discount_pct = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [String(maxDiscountPct), existing.id],
      tx
    );
  }

  return await queryOne(
    `INSERT INTO customer_tier_discount_limits (tier, max_discount_pct)
     VALUES ($1, $2)
     RETURNING *`,
    [tier, String(maxDiscountPct)],
    tx
  );
}

// --- Category Discount Limits ---
export async function findCategoryLimits(tx = undefined) {
  return await query(
    `SELECT
       cdl.id,
       cdl.category_id,
       pc.name AS category_name,
       cdl.max_discount_pct,
       cdl.created_at,
       cdl.updated_at
     FROM category_discount_limits cdl
     LEFT JOIN product_categories pc ON cdl.category_id = pc.id`,
    [],
    tx
  );
}

export async function findCategoryLimitByCategoryId(categoryId, tx = undefined) {
  return await queryOne(
    `SELECT * FROM category_discount_limits WHERE category_id = $1 LIMIT 1`,
    [categoryId],
    tx
  );
}

export async function upsertCategoryLimit(categoryId, maxDiscountPct, tx = undefined) {
  const existing = await findCategoryLimitByCategoryId(categoryId, tx);
  if (existing) {
    return await queryOne(
      `UPDATE category_discount_limits
       SET max_discount_pct = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [String(maxDiscountPct), existing.id],
      tx
    );
  }

  return await queryOne(
    `INSERT INTO category_discount_limits (category_id, max_discount_pct)
     VALUES ($1, $2)
     RETURNING *`,
    [categoryId, String(maxDiscountPct)],
    tx
  );
}

export async function deleteCategoryLimit(id, tx = undefined) {
  return await queryOne(
    `DELETE FROM category_discount_limits WHERE id = $1 RETURNING *`,
    [id],
    tx
  );
}

// --- Approval Rules ---
export async function findApprovalRules(tx = undefined) {
  return await query(
    `SELECT * FROM approval_rules ORDER BY min_overage_pct ASC`,
    [],
    tx
  );
}

export async function findApprovalRuleById(id, tx = undefined) {
  return await queryOne(
    `SELECT * FROM approval_rules WHERE id = $1 LIMIT 1`,
    [id],
    tx
  );
}

export async function createApprovalRule(data, tx = undefined) {
  return await queryOne(
    `INSERT INTO approval_rules (min_overage_pct, max_overage_pct, required_level, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      String(data.minOveragePct),
      data.maxOveragePct !== undefined && data.maxOveragePct !== null ? String(data.maxOveragePct) : null,
      data.requiredLevel,
      data.isActive !== undefined ? data.isActive : true,
    ],
    tx
  );
}

export async function updateApprovalRule(id, data, tx = undefined) {
  const setParts = [];
  const params = [id];
  let idx = 2;

  if (data.minOveragePct !== undefined) {
    setParts.push(`min_overage_pct = $${idx++}`);
    params.push(String(data.minOveragePct));
  }
  if (data.maxOveragePct !== undefined) {
    setParts.push(`max_overage_pct = $${idx++}`);
    params.push(data.maxOveragePct !== null ? String(data.maxOveragePct) : null);
  }
  if (data.requiredLevel !== undefined) {
    setParts.push(`required_level = $${idx++}`);
    params.push(data.requiredLevel);
  }
  if (data.isActive !== undefined) {
    setParts.push(`is_active = $${idx++}`);
    params.push(data.isActive);
  }

  if (setParts.length === 0) {
    return await findApprovalRuleById(id, tx);
  }

  return await queryOne(
    `UPDATE approval_rules
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
    tx
  );
}

export async function deleteApprovalRule(id, tx = undefined) {
  return await queryOne(
    `DELETE FROM approval_rules WHERE id = $1 RETURNING *`,
    [id],
    tx
  );
}
