import * as repo from './approval.repository.js';
import * as quotationsRepo from '../quotations/quotations.repository.js';
import * as riskService from '../risk/risk.service.js';
import * as calc from '../quotations/quotations.calc.js';
import { getDb } from '../../config/database.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors.js';

export async function createIfRequired(quotationId, riskResult, tx = undefined) {
  if (!riskResult || riskResult.requiredApprovalLevel === 'NONE') {
    return null;
  }

  const existing = await repo.getPendingByQuotationId(quotationId, tx);
  if (existing) {
    return existing; // Idempotency backstop
  }

  return repo.createRequest(
    {
      quotationId,
      blendedRiskScore: riskResult.summary?.blendedRiskScore || riskResult.blendedRiskScore || 0,
      requiredLevel: riskResult.summary?.requiredApprovalLevel || riskResult.requiredApprovalLevel,
    },
    tx
  );
}

export function determineCurrentStep(requiredLevel, actions = []) {
  if (requiredLevel === 'MANAGER') return 'MANAGER';
  const managerApproved = actions.some((a) => a.level === 'MANAGER' && a.action === 'APPROVED');
  return managerApproved ? 'FINANCE' : 'MANAGER';
}

function assertActorCanAct(auth, step) {
  if (auth.role === 'ADMIN') return; // Admin override privilege
  if (step === 'MANAGER' && auth.role !== 'SALES_MANAGER') {
    throw new ForbiddenError('Only a Sales Manager can act at this approval step.', 'STEP_MISMATCH');
  }
  if (step === 'FINANCE' && auth.role !== 'FINANCE') {
    throw new ForbiddenError('Only Finance can act at this approval step.', 'STEP_MISMATCH');
  }
}

export async function listApprovalRequests(query, auth) {
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);
  const status = query.status !== undefined ? query.status : 'ALL';

  const { rows, total } = await repo.listApprovalRequests({
    role: auth.role,
    status: status === 'ALL' ? null : status,
    offset,
    limit,
  });

  return {
    items: rows,
    meta: {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      hasMore: offset + rows.length < total,
    },
  };
}

export async function getApprovalDetail(id) {
  const joined = await repo.findByIdJoined(id);
  if (!joined) {
    throw new NotFoundError(`Approval request with ID '${id}' not found.`, 'APPROVAL_REQUEST_NOT_FOUND');
  }

  const actions = await repo.findActions(id);
  const itemsJoined = await quotationsRepo.findItemsJoined(joined.quotation.id);
  const items = itemsJoined.map((r) => ({
    ...r.item,
    productName: r.productName,
    productSku: r.productSku,
    categoryName: r.categoryName,
    productType: r.productType,
    unit: r.unit,
  }));

  // Live Risk Evaluation for explainability breakdown
  const riskEvaluation = await riskService.evaluateQuoteRisk({
    customerId: joined.quotation.customerId,
    lines: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      requestedDiscountPct: Number(item.discountPct),
    })),
  });

  // Calculate Margin Impact Simulation (Requested vs Capped allowed discount)
  const currentTotals = calc.computeQuotationTotals(items);
  const cappedTotals = calc.computeQuotationTotals(
    items.map((item) => {
      const allowed = item.allowedDiscountPct !== null ? Number(item.allowedDiscountPct) : 10;
      const cappedDiscount = Math.min(Number(item.discountPct), allowed);
      return {
        ...item,
        discountPct: cappedDiscount,
      };
    })
  );

  const marginImpact = {
    marginAtRequestedPct: Number(currentTotals.marginPct || 0),
    marginAtAllowedPct: Number(cappedTotals.marginPct || 0),
    impactPct: Number((Number(currentTotals.marginPct || 0) - Number(cappedTotals.marginPct || 0)).toFixed(2)),
  };

  const currentStep = determineCurrentStep(joined.request.requiredLevel, actions);

  return {
    approvalRequest: {
      ...joined.request,
      currentStep,
    },
    quotation: joined.quotation,
    customerName: joined.customerName,
    customerTier: joined.customerTier,
    requesterName: joined.requesterName,
    requesterEmail: joined.requesterEmail,
    items,
    actions,
    riskEvaluation,
    marginImpact,
  };
}

export async function decideApproval(id, action, payload, auth) {
  const request = await repo.lockById(id);
  if (!request) {
    throw new NotFoundError(`Approval request with ID '${id}' not found.`, 'APPROVAL_REQUEST_NOT_FOUND');
  }

  if (request.status !== 'PENDING') {
    throw new ConflictError(
      `This request was already ${request.status.toLowerCase()}.`,
      'ALREADY_RESOLVED'
    );
  }

  const priorActions = await repo.findActions(id);
  const step = determineCurrentStep(request.requiredLevel, priorActions);
  assertActorCanAct(auth, step);

  // Insert accountable action entry
  await repo.insertAction({
    approvalRequestId: id,
    actorId: auth.id || auth.userId,
    level: step,
    action,
    reason: payload.reason,
  });

  const isFinalStep =
    action !== 'APPROVED'
      ? true
      : request.requiredLevel === 'MANAGER' || step === 'FINANCE' || auth.role === 'ADMIN';

  let newRequestStatus = request.status;
  let newQuotationStatus = 'PENDING_APPROVAL';

  if (action === 'APPROVED') {
    if (isFinalStep) {
      newRequestStatus = 'APPROVED';
      newQuotationStatus = 'APPROVED';
    } else {
      newRequestStatus = 'PENDING'; // Still awaiting Finance
      newQuotationStatus = 'PENDING_APPROVAL';
    }
  } else if (action === 'REJECTED') {
    newRequestStatus = 'REJECTED';
    newQuotationStatus = 'REJECTED';
  } else if (action === 'RETURNED') {
    newRequestStatus = 'RETURNED';
    newQuotationStatus = 'DRAFT'; // Rep can modify and re-submit
  }

  const updatedRequest =
    newRequestStatus === request.status
      ? request
      : await repo.resolveRequest(id, newRequestStatus);

  // Update Quotation status in DB
  const updatedQuotation = await quotationsRepo.updateHeaderFields(
    request.quotationId,
    {
      status: newQuotationStatus,
    }
  );

  // Insert Audit Log entry
  await repo.insertAuditLog({
    actorId: auth.id || auth.userId,
    entityType: 'QUOTATION',
    entityId: request.quotationId,
    action: `APPROVAL_${action}`,
    reason: payload.reason || `Quotation ${action.toLowerCase()} by ${auth.role}`,
    oldValue: { status: request.status },
    newValue: { status: newQuotationStatus, level: step, action },
  });

  return {
    approvalRequest: updatedRequest,
    quotation: updatedQuotation,
  };
}

export async function approveRequest(id, payload, auth) {
  return decideApproval(id, 'APPROVED', payload, auth);
}

export async function rejectRequest(id, payload, auth) {
  return decideApproval(id, 'REJECTED', payload, auth);
}

export async function returnRequest(id, payload, auth) {
  return decideApproval(id, 'RETURNED', payload, auth);
}
