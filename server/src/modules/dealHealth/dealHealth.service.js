import * as repo from './dealHealth.repository.js';
import { resolveRepScope } from '../../common/scope.util.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../common/errors.js';

export async function listDealHealth(query, auth) {
  const repScope = await resolveRepScope(auth); // null for ADMIN => org-wide
  const [dbAlerts, quotes] = await Promise.all([
    repo.listAlerts({ repScope, status: query.status }),
    repo.listScopedQuotations(repScope),
  ]);

  const now = Date.now();

  // Dynamic anomaly and risk signal detection across scoped quotations
  const dynamicAlerts = [];
  let stalledCount = 0;
  let discountAnomalyCount = 0;
  let deliverySlippageCount = 0;

  for (const q of quotes) {
    const lastActive = q.lastActivityAt ? new Date(q.lastActivityAt).getTime() : new Date(q.createdAt).getTime();
    const daysIdle = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
    const subtotal = Number(q.subtotal || 0);
    const discount = Number(q.discountTotal || 0);
    const discountPct = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const isUnderAction = ['DRAFT', 'PENDING_APPROVAL', 'UNDER_NEGOTIATION'].includes(q.status);

    // 1. Stalled deals: idle for >= 3 days while active
    if (isUnderAction && daysIdle >= 3) {
      stalledCount++;
      dynamicAlerts.push({
        id: `dyn-stalled-${q.id}`,
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customerName,
        customerTier: q.customerTier,
        salesRepId: q.salesRepId,
        salesRepName: q.salesRepName,
        alertType: 'STALLED',
        severity: daysIdle > 7 ? 'HIGH' : 'MEDIUM',
        message: `Idle ${daysIdle} days without rep action`,
        issue: `Idle ${daysIdle} days`,
        status: 'OPEN',
        flaggedDate: q.lastActivityAt || q.createdAt,
        action: 'Nudge rep',
        grandTotal: q.grandTotal,
        subtotal: q.subtotal,
        discountTotal: q.discountTotal,
        estimatedMarginPct: q.estimatedMarginPct,
      });
    }

    // 2. Discount anomalies: discount >= 15% or required approval
    if (discountPct >= 15 || q.requiredApprovalLevel !== 'NONE') {
      discountAnomalyCount++;
      dynamicAlerts.push({
        id: `dyn-disc-${q.id}`,
        quotationId: q.id,
        quoteNumber: q.quoteNumber,
        customerName: q.customerName,
        customerTier: q.customerTier,
        salesRepId: q.salesRepId,
        salesRepName: q.salesRepName,
        alertType: 'DISCOUNT_ANOMALY',
        severity: discountPct > 25 ? 'HIGH' : 'MEDIUM',
        message: `Discount ${discountPct.toFixed(1)}% vs team avg 10%`,
        issue: `Discount ${discountPct.toFixed(1)}% vs avg 10%`,
        status: 'OPEN',
        flaggedDate: q.createdAt,
        action: 'Review exception',
        grandTotal: q.grandTotal,
        subtotal: q.subtotal,
        discountTotal: q.discountTotal,
        estimatedMarginPct: q.estimatedMarginPct,
      });
    }

    // 3. Delivery slippage: promised delivery date set and within 5 days or past
    if (q.promisedDeliveryDate) {
      const deliveryTime = new Date(q.promisedDeliveryDate).getTime();
      const diffDays = Math.floor((deliveryTime - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 5) {
        deliverySlippageCount++;
        dynamicAlerts.push({
          id: `dyn-del-${q.id}`,
          quotationId: q.id,
          quoteNumber: q.quoteNumber,
          customerName: q.customerName,
          customerTier: q.customerTier,
          salesRepId: q.salesRepId,
          salesRepName: q.salesRepName,
          alertType: 'DELIVERY_SLIPPAGE',
          severity: diffDays < 0 ? 'HIGH' : 'MEDIUM',
          message: diffDays < 0 ? `Promised delivery overdue by ${Math.abs(diffDays)} days` : `Promised delivery at risk (${diffDays} days remaining)`,
          issue: diffDays < 0 ? `Delivery overdue ${Math.abs(diffDays)}d` : `Delivery due in ${diffDays}d`,
          status: 'OPEN',
          flaggedDate: q.lastActivityAt || q.createdAt,
          action: 'Escalate to Ops',
          grandTotal: q.grandTotal,
          subtotal: q.subtotal,
          discountTotal: q.discountTotal,
          estimatedMarginPct: q.estimatedMarginPct,
        });
      }
    }
  }

  // Format DB alerts to ensure wireframe 14 attributes
  const formattedDbAlerts = dbAlerts.map((a) => ({
    id: a.id,
    quotationId: a.quotationId,
    quoteNumber: a.quoteNumber,
    customerName: a.customerName,
    customerTier: a.customerTier,
    salesRepId: a.salesRepId,
    salesRepName: a.salesRepName,
    alertType: a.alertType,
    severity: a.severity,
    message: a.message,
    issue: a.message,
    status: a.status,
    flaggedDate: a.createdAt,
    action: a.status === 'ACKNOWLEDGED' ? 'Acknowledged' : a.status === 'ESCALATED' ? 'Escalated to Manager' : 'Open',
    grandTotal: a.grandTotal,
    subtotal: a.subtotal,
    discountTotal: a.discountTotal,
    estimatedMarginPct: a.estimatedMarginPct,
  }));

  // Combine DB alerts and dynamic signals
  const allAlerts = [...formattedDbAlerts, ...dynamicAlerts];

  return {
    metrics: {
      stalledCount: Math.max(stalledCount, dbAlerts.filter(a => a.alertType === 'STALLED').length),
      discountAnomalyCount: Math.max(discountAnomalyCount, dbAlerts.filter(a => a.alertType === 'DISCOUNT_ANOMALY').length),
      deliverySlippageCount: Math.max(deliverySlippageCount, dbAlerts.filter(a => a.alertType === 'DELIVERY_SLIPPAGE').length),
      totalAlertsCount: allAlerts.length,
      totalDealsCount: quotes.length,
    },
    alerts: allAlerts,
    deals: quotes,
  };
}

export async function getDealDetail(quotationId, auth) {
  const quote = await repo.findFullQuotation(quotationId);
  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  const repScope = await resolveRepScope(auth);
  if (repScope !== null && !repScope.includes(quote.salesRepId)) {
    throw new ForbiddenError('You do not have permission to view this deal.', 'ACCESS_DENIED');
  }

  const [alerts, timeline] = await Promise.all([
    repo.listAlertsForQuotation(quotationId),
    repo.getTimeline(quotationId),
  ]);

  const subtotal = Number(quote.subtotal || 0);
  const discountTotal = Number(quote.discountTotal || 0);
  const discountPct = subtotal > 0 ? (discountTotal / subtotal) * 100 : 0;
  const marginPct = Number(quote.estimatedMarginPct || 0);

  return {
    quotation: quote,
    items: quote.items || [],
    alerts,
    timeline,
    summary: {
      status: quote.status,
      riskLevel: alerts.some(a => a.severity === 'HIGH') ? 'HIGH' : alerts.length > 0 ? 'MEDIUM' : 'LOW',
      alertsCount: alerts.length,
      marginPct: marginPct.toFixed(1),
      discountPct: discountPct.toFixed(1),
    },
  };
}

export async function nudgeDeal(quotationId, payload = {}, auth) {
  const quote = await repo.findFullQuotation(quotationId);
  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  const repScope = await resolveRepScope(auth);
  if (repScope !== null && !repScope.includes(quote.salesRepId)) {
    throw new ForbiddenError('You do not have permission to act on this deal.', 'ACCESS_DENIED');
  }

  const message = payload.message || `Nudge from Sales Manager (${auth.name || 'Manager'}): Please follow up with client ${quote.customerName} on quote ${quote.quoteNumber}.`;

  await repo.addTimelineComment({
    quotationId,
    authorId: auth.id,
    authorType: 'INTERNAL',
    message,
  });

  await repo.insertAuditLog({
    actorId: auth.id,
    entityId: quotationId,
    action: 'DEAL_NUDGED',
    reason: `Sales Manager nudged representative on stalled deal`,
    newValue: { message },
  });

  return getDealDetail(quotationId, auth);
}

export async function escalateDeal(quotationId, payload = {}, auth) {
  const quote = await repo.findFullQuotation(quotationId);
  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  const repScope = await resolveRepScope(auth);
  if (repScope !== null && !repScope.includes(quote.salesRepId)) {
    throw new ForbiddenError('You do not have permission to act on this deal.', 'ACCESS_DENIED');
  }

  const reason = payload.reason || `Deal escalated to Executive / Finance review by Sales Manager`;

  await repo.createAlert({
    quotationId,
    alertType: 'DISCOUNT_ANOMALY',
    severity: 'HIGH',
    message: reason,
    status: 'ESCALATED',
    resolvedBy: auth.id,
  });

  await repo.addTimelineComment({
    quotationId,
    authorId: auth.id,
    authorType: 'INTERNAL',
    message: `[ESCALATION] ${reason}`,
  });

  await repo.insertAuditLog({
    actorId: auth.id,
    entityId: quotationId,
    action: 'DEAL_ESCALATED',
    reason,
    newValue: { status: 'ESCALATED' },
  });

  return getDealDetail(quotationId, auth);
}

export async function addDealComment(quotationId, payload = {}, auth) {
  if (!payload.message || !payload.message.trim()) {
    throw new ValidationError('Message content is required.');
  }

  const quote = await repo.findFullQuotation(quotationId);
  if (!quote) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  const repScope = await resolveRepScope(auth);
  if (repScope !== null && !repScope.includes(quote.salesRepId)) {
    throw new ForbiddenError('You do not have permission to comment on this deal.', 'ACCESS_DENIED');
  }

  await repo.addTimelineComment({
    quotationId,
    authorId: auth.id,
    authorType: 'INTERNAL',
    message: payload.message.trim(),
  });

  return getDealDetail(quotationId, auth);
}

export async function acknowledgeAlert(alertId, auth) {
  const alert = await repo.findAlertById(alertId);
  if (!alert) {
    throw new NotFoundError(`Deal alert with ID '${alertId}' not found.`, 'ALERT_NOT_FOUND');
  }
  const ownerRepId = await repo.findQuotationOwnerRep(alert.quotationId);
  const repScope = await resolveRepScope(auth);
  if (repScope !== null && !repScope.includes(ownerRepId)) {
    throw new ForbiddenError('You do not have permission to act on this alert.', 'ACCESS_DENIED');
  }
  return repo.updateAlertStatus(alertId, 'ACKNOWLEDGED', auth.id);
}

export async function escalateAlert(alertId, auth) {
  const alert = await repo.findAlertById(alertId);
  if (!alert) {
    throw new NotFoundError(`Deal alert with ID '${alertId}' not found.`, 'ALERT_NOT_FOUND');
  }
  const ownerRepId = await repo.findQuotationOwnerRep(alert.quotationId);
  const repScope = await resolveRepScope(auth);
  if (repScope !== null && !repScope.includes(ownerRepId)) {
    throw new ForbiddenError('You do not have permission to act on this alert.', 'ACCESS_DENIED');
  }
  return repo.updateAlertStatus(alertId, 'ESCALATED', auth.id);
}
