import { Router } from 'express';
import { query, queryOne } from '../../config/database.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { successResponse } from '../../common/response.util.js';
import { ValidationError, NotFoundError } from '../../common/errors.js';

const router = Router();
router.use(authenticate);

// List staff users — ADMIN only
router.get('/', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const rows = await query(
    `SELECT id, name, email, role, manager_id AS "managerId", is_active AS "isActive"
     FROM users
     ORDER BY name ASC`
  );
  return successResponse(res, rows, 200);
}));

// Assign / clear a rep's manager. ADMIN only.
router.patch('/:id/manager', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const { managerId } = req.body;

  const target = await queryOne(`SELECT * FROM users WHERE id = $1`, [req.params.id]);
  if (!target) throw new NotFoundError(`User '${req.params.id}' not found.`, 'USER_NOT_FOUND');
  if (target.role !== 'SALES_REP') {
    throw new ValidationError('Only a SALES_REP can be assigned a managerId.');
  }

  if (managerId) {
    const manager = await queryOne(`SELECT * FROM users WHERE id = $1`, [managerId]);
    if (!manager || manager.role !== 'SALES_MANAGER') {
      throw new ValidationError('managerId must belong to an active SALES_MANAGER account.');
    }
  }

  const updated = await queryOne(
    `UPDATE users
     SET manager_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, role, manager_id AS "managerId", is_active AS "isActive", updated_at AS "updatedAt"`,
    [managerId || null, req.params.id]
  );

  return successResponse(res, updated, 200);
}));

export default router;
