import { eq, and } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { approvalRequests } from '../../db/schema/governance.js';
import { ConflictError } from '../../common/errors.js';

export async function createRequest(data, tx = undefined) {
  const db = tx || getDb();
  try {
    const rows = await db
      .insert(approvalRequests)
      .values({
        quotationId: data.quotationId,
        blendedRiskScore: String(data.blendedRiskScore),
        requiredLevel: data.requiredLevel,
        status: 'PENDING',
      })
      .returning();
    return rows[0];
  } catch (err) {
    if (err.code === '23505') {
      throw new ConflictError('This quotation already has a pending approval request.', 'APPROVAL_ALREADY_PENDING');
    }
    throw err;
  }
}

export async function getPendingByQuotationId(quotationId, tx = undefined) {
  const db = tx || getDb();
  const rows = await db
    .select()
    .from(approvalRequests)
    .where(
      and(
        eq(approvalRequests.quotationId, quotationId),
        eq(approvalRequests.status, 'PENDING')
      )
    )
    .limit(1);
  return rows[0] || null;
}
