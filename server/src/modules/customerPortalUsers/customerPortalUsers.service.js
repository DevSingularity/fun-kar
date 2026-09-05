import { getDb } from '../../config/database.js';
import { customerUsers, customers } from '../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';
import { parseListQuery, buildMeta } from '../../common/pagination.util.js';

export async function checkCustomerAccess(customerId, authUser) {
  const db = getDb();
  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));

  if (!customer) {
    throw new NotFoundError(`Customer with ID '${customerId}' not found.`, 'CUSTOMER_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && customer.assignedRepId !== authUser.id) {
    throw new ForbiddenError('You do not have permission to manage portal contacts for this customer.', 'CUSTOMER_ACCESS_DENIED');
  }
  return customer;
}

export async function listPortalUsers(customerId, query, authUser) {
  await checkCustomerAccess(customerId, authUser);

  const db = getDb();
  const { page, limit, offset } = parseListQuery(query);

  const rows = await db
    .select({
      id: customerUsers.id,
      customerId: customerUsers.customerId,
      name: customerUsers.name,
      email: customerUsers.email,
      isActive: customerUsers.isActive,
      createdAt: customerUsers.createdAt,
    })
    .from(customerUsers)
    .where(eq(customerUsers.customerId, customerId))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)::int` })
    .from(customerUsers)
    .where(eq(customerUsers.customerId, customerId));

  return {
    items: rows,
    meta: buildMeta(count, page, limit),
  };
}


export async function createPortalUser(customerId, { name, email }, authUser) {
  await checkCustomerAccess(customerId, authUser);

  const db = getDb();
  try {
    const [inserted] = await db
      .insert(customerUsers)
      .values({
        customerId,
        name,
        email,
        passwordHash: null,
      })
      .returning();

    return {
      id: inserted.id,
      customerId: inserted.customerId,
      name: inserted.name,
      email: inserted.email,
      isActive: inserted.isActive,
      createdAt: inserted.createdAt,
    };
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('A portal contact with this email address already exists.', 'EMAIL_TAKEN');
    }
    throw err;
  }
}

