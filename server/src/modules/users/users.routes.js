import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { users } from '../../db/schema/users.js';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import { successResponse } from '../../common/response.util.js';
import { ValidationError, NotFoundError } from '../../common/errors.js';

const router = Router();
router.use(authenticate);

// List staff users — ADMIN only, used to populate "assign to manager" UI.
router.get('/', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const db = getDb();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      managerId: users.managerId,
      isActive: users.isActive,
    })
    .from(users)
    .orderBy(users.name);
  return successResponse(res, rows, 200);
}));

// Assign / clear a rep's manager. ADMIN only.
router.patch('/:id/manager', authorize('ADMIN'), asyncHandler(async (req, res) => {
  const db = getDb();
  const { managerId } = req.body;

  const [target] = await db.select().from(users).where(eq(users.id, req.params.id));
  if (!target) throw new NotFoundError(`User '${req.params.id}' not found.`, 'USER_NOT_FOUND');
  if (target.role !== 'SALES_REP') {
    throw new ValidationError('Only a SALES_REP can be assigned a managerId.');
  }

  if (managerId) {
    const [manager] = await db.select().from(users).where(eq(users.id, managerId));
    if (!manager || manager.role !== 'SALES_MANAGER') {
      throw new ValidationError('managerId must belong to an active SALES_MANAGER account.');
    }
  }

  const [updated] = await db
    .update(users)
    .set({ managerId: managerId || null, updatedAt: new Date() })
    .where(eq(users.id, req.params.id))
    .returning();

  return successResponse(res, updated, 200);
}));

export default router;
