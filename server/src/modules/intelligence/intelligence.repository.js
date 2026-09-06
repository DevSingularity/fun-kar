import { query, queryOne } from '../../config/database.js';
import { ConflictError } from '../../common/errors.js';

export async function insertRule(data, tx = undefined) {
  try {
    return await queryOne(
      `INSERT INTO upsell_rules (trigger_product_id, recommended_product_id, co_purchase_score, min_margin_pct, is_promoted, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.triggerProductId,
        data.recommendedProductId,
        data.coPurchaseScore ?? '50.00',
        data.minMarginPct ?? '10.00',
        data.isPromoted ?? false,
        data.isActive ?? true,
      ],
      tx
    );
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('A rule for this product pair already exists.', 'RULE_EXISTS');
    }
    throw err;
  }
}

export async function listRules({ triggerProductId, isActive, offset = 0, limit = 20 } = {}) {
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (triggerProductId) {
    whereClauses.push(`trigger_product_id = $${idx++}`);
    params.push(triggerProductId);
  }
  if (isActive !== undefined) {
    whereClauses.push(`is_active = $${idx++}`);
    params.push(isActive);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = await queryOne(
    `SELECT count(*)::int AS count FROM upsell_rules ${whereSql}`,
    params
  );
  const total = countRow?.count || 0;

  const dataParams = [...params, limit, offset];
  const rows = await query(
    `SELECT * FROM upsell_rules
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    dataParams
  );

  return { rows, total };
}

export async function findRuleById(id) {
  return await queryOne(
    `SELECT * FROM upsell_rules WHERE id = $1 LIMIT 1`,
    [id]
  );
}

export async function findRuleByIdActive(id) {
  return await queryOne(
    `SELECT * FROM upsell_rules WHERE id = $1 AND is_active = true LIMIT 1`,
    [id]
  );
}

export async function updateRule(id, data) {
  const setParts = ['updated_at = NOW()'];
  const params = [id];
  let idx = 2;

  if (data.coPurchaseScore !== undefined) {
    setParts.push(`co_purchase_score = $${idx++}`);
    params.push(data.coPurchaseScore);
  }
  if (data.minMarginPct !== undefined) {
    setParts.push(`min_margin_pct = $${idx++}`);
    params.push(data.minMarginPct);
  }
  if (data.isPromoted !== undefined) {
    setParts.push(`is_promoted = $${idx++}`);
    params.push(data.isPromoted);
  }
  if (data.isActive !== undefined) {
    setParts.push(`is_active = $${idx++}`);
    params.push(data.isActive);
  }

  return await queryOne(
    `UPDATE upsell_rules
     SET ${setParts.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );
}

export async function softDeleteRule(id) {
  return await queryOne(
    `UPDATE upsell_rules
     SET is_active = false, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
}

export async function findCandidatesForQuotation(quotationId) {
  const sql = `
    SELECT
      r.id AS rule_id,
      r.trigger_product_id,
      r.recommended_product_id,
      r.co_purchase_score,
      r.min_margin_pct,
      r.is_promoted,
      r.is_active,
      r.created_at AS rule_created_at,
      r.updated_at AS rule_updated_at,
      p.id AS p_id,
      p.sku AS p_sku,
      p.name AS p_name,
      p.description AS p_description,
      p.category_id AS p_category_id,
      p.base_price AS p_base_price,
      p.estimated_cost AS p_estimated_cost,
      p.unit_of_measure AS p_unit_of_measure,
      p.tax_rate AS p_tax_rate,
      p.is_active AS p_is_active,
      p.created_at AS p_created_at,
      p.updated_at AS p_updated_at,
      pc.name AS category_name
    FROM upsell_rules r
    INNER JOIN quotation_items qi ON qi.quotation_id = $1 AND qi.product_id = r.trigger_product_id
    INNER JOIN products p ON p.id = r.recommended_product_id
    INNER JOIN product_categories pc ON pc.id = p.category_id
    WHERE r.is_active = true
      AND r.recommended_product_id NOT IN (
        SELECT product_id FROM quotation_items WHERE quotation_id = $1
      )
  `;

  const rows = await query(sql, [quotationId]);

  return rows.map((row) => ({
    rule: {
      id: row.ruleId,
      triggerProductId: row.triggerProductId,
      recommendedProductId: row.recommendedProductId,
      coPurchaseScore: row.coPurchaseScore,
      minMarginPct: row.minMarginPct,
      isPromoted: row.isPromoted,
      isActive: row.isActive,
      createdAt: row.ruleCreatedAt,
      updatedAt: row.ruleUpdatedAt,
    },
    recommendedProduct: {
      id: row.pId,
      sku: row.pSku,
      name: row.pName,
      description: row.pDescription,
      categoryId: row.pCategoryId,
      basePrice: row.pBasePrice,
      estimatedCost: row.pEstimatedCost,
      unitOfMeasure: row.pUnitOfMeasure,
      taxRate: row.pTaxRate,
      isActive: row.pIsActive,
      createdAt: row.pCreatedAt,
      updatedAt: row.pUpdatedAt,
    },
    categoryName: row.categoryName,
  }));
}
