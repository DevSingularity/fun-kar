import { query, queryOne } from '../../config/database.js';

export async function findAllPlans({ isActive } = {}, tx = null) {
  let whereSql = '';
  const params = [];
  if (isActive !== undefined) {
    params.push(isActive);
    whereSql = `WHERE is_active = $1`;
  }
  return query(
    `SELECT id, name, frequency, price, proration_enabled AS "prorationEnabled",
            cancellation_notice_days AS "cancellationNoticeDays", is_active AS "isActive",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM subscription_plans
     ${whereSql}
     ORDER BY name ASC`,
    params,
    tx
  );
}

export async function findPlanById(id, tx = null) {
  return queryOne(
    `SELECT id, name, frequency, price, proration_enabled AS "prorationEnabled",
            cancellation_notice_days AS "cancellationNoticeDays", is_active AS "isActive",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM subscription_plans
     WHERE id = $1
     LIMIT 1`,
    [id],
    tx
  );
}

export async function findPlanByName(name, tx = null) {
  return queryOne(
    `SELECT id, name, frequency, price, proration_enabled AS "prorationEnabled",
            cancellation_notice_days AS "cancellationNoticeDays", is_active AS "isActive",
            created_at AS "createdAt", updated_at AS "updatedAt"
     FROM subscription_plans
     WHERE LOWER(name) = LOWER($1)
     LIMIT 1`,
    [name.trim()],
    tx
  );
}

export async function createPlan(data, tx = null) {
  return queryOne(
    `INSERT INTO subscription_plans (
       name, frequency, price, proration_enabled, cancellation_notice_days, is_active, created_at, updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     RETURNING *`,
    [
      data.name.trim(),
      data.frequency,
      String(data.price),
      data.prorationEnabled !== undefined ? data.prorationEnabled : true,
      data.cancellationNoticeDays || 0,
      data.isActive !== undefined ? data.isActive : true,
    ],
    tx
  );
}

export async function updatePlan(id, data, tx = null) {
  const fields = [];
  const params = [];

  if (data.name !== undefined) {
    params.push(data.name.trim());
    fields.push(`name = $${params.length}`);
  }
  if (data.frequency !== undefined) {
    params.push(data.frequency);
    fields.push(`frequency = $${params.length}`);
  }
  if (data.price !== undefined) {
    params.push(String(data.price));
    fields.push(`price = $${params.length}`);
  }
  if (data.prorationEnabled !== undefined) {
    params.push(data.prorationEnabled);
    fields.push(`proration_enabled = $${params.length}`);
  }
  if (data.cancellationNoticeDays !== undefined) {
    params.push(data.cancellationNoticeDays);
    fields.push(`cancellation_notice_days = $${params.length}`);
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive);
    fields.push(`is_active = $${params.length}`);
  }

  fields.push(`updated_at = NOW()`);

  params.push(id);
  const idIdx = params.length;

  return queryOne(
    `UPDATE subscription_plans
     SET ${fields.join(', ')}
     WHERE id = $${idIdx}
     RETURNING *`,
    params,
    tx
  );
}
