import { getDb } from '../../config/database.js';
import { quotations, quotationItems } from '../../db/schema/quotations.js';
import { customers } from '../../db/schema/customers.js';
import { products } from '../../db/schema/catalog.js';
import { approvalRequests, auditLogs } from '../../db/schema/governance.js';
import { users } from '../../db/schema/users.js';
import { desc, eq, sql, inArray, and } from 'drizzle-orm';
import { resolveRepScope } from '../../common/scope.util.js';

export async function getDashboardOverview(currentUser) {
  const db = getDb();

  // Resolve once: null = unscoped (ADMIN/FINANCE/OPERATIONS org-wide view),
  // array = SALES_REP (self) or SALES_MANAGER (self + managed reps).
  const repScope = await resolveRepScope(currentUser);

  // 1. Fetch real quotations from DB
  const allQuotations = await db
    .select({
      id: quotations.id,
      quoteNumber: quotations.quoteNumber,
      status: quotations.status,
      customerId: quotations.customerId,
      customerName: customers.name,
      customerTier: customers.tier,
      salesRepId: quotations.salesRepId,
      originType: quotations.originType,
      subtotal: quotations.subtotal,
      discountAmount: quotations.discountTotal,
      taxAmount: quotations.taxTotal,
      grandTotal: quotations.grandTotal,
      requiredApprovalLevel: quotations.requiredApprovalLevel,
      createdAt: quotations.createdAt,
      updatedAt: quotations.updatedAt,
    })
    .from(quotations)
    .leftJoin(customers, eq(quotations.customerId, customers.id))
    .orderBy(desc(quotations.createdAt));

  // Role scoping: SALES_REP sees only their own; SALES_MANAGER sees their
  // own + every rep who reports to them; everyone else sees org-wide.
  const scopedQuotes = repScope === null
    ? allQuotations
    : allQuotations.filter((q) => repScope.includes(q.salesRepId));

  // 2. Compute Real Aggregated Metrics
  const pendingApprovals = scopedQuotes.filter((q) => q.status === 'PENDING_APPROVAL');
  const openDeals = scopedQuotes.filter((q) =>
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'UNDER_NEGOTIATION'].includes(q.status)
  );

  const atRiskDeals = scopedQuotes.filter((q) =>
    q.requiredApprovalLevel !== 'NONE' ||
    Number(q.discountAmount) > (Number(q.subtotal) * 0.15)
  );

  // Customer-triggered deals in this scope
  const customerTriggeredDeals = scopedQuotes.filter((q) => q.originType === 'CUSTOMER_SELF_SERVICE');

  const totalPipelineValue = openDeals.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);

  // 3. Pipeline Kanban Column Summaries
  const pipelineSummary = {
    DRAFT: scopedQuotes.filter((q) => q.status === 'DRAFT'),
    PENDING_APPROVAL: scopedQuotes.filter((q) => q.status === 'PENDING_APPROVAL'),
    APPROVED: scopedQuotes.filter((q) => q.status === 'APPROVED'),
    UNDER_NEGOTIATION: scopedQuotes.filter((q) => q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT'),
    CONFIRMED: scopedQuotes.filter((q) => q.status === 'CONFIRMED' || q.status === 'COMPLETED' || q.status === 'FULFILLING'),
  };

  // 4. Fetch Real Audit Logs & Activity Feed, scoped according to repScope
  const scopedQuoteIds = scopedQuotes.map((q) => q.id);

  let dbLogs = [];
  if (repScope === null || scopedQuoteIds.length > 0) {
    const logConditions = [eq(auditLogs.entityType, 'QUOTATION')];
    if (repScope !== null) {
      logConditions.push(inArray(auditLogs.entityId, scopedQuoteIds));
    }

    dbLogs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        reason: auditLogs.reason,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
        actorRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorId, users.id))
      .where(and(...logConditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);
  }

  // Format activity feed combining audit logs & recent quote status changes
  const formattedActivities = dbLogs.map((log) => {
    let title = `${log.actorName || 'System'} executed ${log.action.replace('_', ' ')} on ${log.entityType}`;
    let type = 'system';

    if (log.action.includes('APPROV')) {
      title = `${log.actorName || 'Manager'} approved quotation deal`;
      type = 'approved';
    } else if (log.action.includes('SUBMIT')) {
      title = `${log.actorName || 'Sales Rep'} submitted deal for policy review`;
      type = 'pending';
    } else if (log.action.includes('CREATE')) {
      title = `${log.actorName || 'Sales Rep'} created new quotation header`;
      type = 'active';
    } else if (log.action === 'CUSTOMER_SELF_SERVICE_SUBMITTED') {
      title = `Customer submitted a self-service quote request`;
      type = 'pending';
    }

    return {
      id: log.id,
      title: log.reason ? `${title} — ${log.reason}` : title,
      actorName: log.actorName,
      actorRole: log.actorRole,
      type,
      time: formatRelativeTime(log.createdAt),
      createdAt: log.createdAt,
    };
  });

  // Fallback scenario events if database was recently initialized
  if (formattedActivities.length === 0) {
    scopedQuotes.slice(0, 5).forEach((q) => {
      formattedActivities.push({
        id: `act-${q.id}`,
        title: `Quotation ${q.quoteNumber} for ${q.customerName || 'Account'} (${q.status.replace('_', ' ')})`,
        type: q.status === 'APPROVED' ? 'approved' : q.status === 'PENDING_APPROVAL' ? 'pending' : 'active',
        time: formatRelativeTime(q.createdAt),
        createdAt: q.createdAt,
      });
    });
  }

  // 5. Fetch Active Catalog Products for Dynamic Upsell Engine (unscoped)
  const catalogProducts = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      basePrice: products.basePrice,
      estimatedCost: products.estimatedCost,
      taxRate: products.taxRate,
      productType: products.productType,
    })
    .from(products)
    .where(eq(products.isActive, true))
    .limit(6);

  const upsellSuggestions = catalogProducts.map((prod) => {
    const listPrice = Number(prod.basePrice || 0);
    const cost = Number(prod.estimatedCost || 0);
    const estimatedMargin = listPrice > 0 ? ((listPrice - cost) / listPrice) * 100 : 0;

    return {
      productId: prod.id,
      sku: prod.sku,
      name: prod.name,
      listPrice,
      estimatedMarginPct: Number(estimatedMargin.toFixed(1)),
      marginBoostFormatted: `+₹${Math.round(listPrice - cost).toLocaleString()}`,
    };
  });

  return {
    metrics: {
      pendingApprovalsCount: pendingApprovals.length,
      openQuotationsCount: openDeals.length,
      atRiskDealsCount: atRiskDeals.length,
      customerTriggeredCount: customerTriggeredDeals.length,
      totalPipelineValue,
      totalQuotationsCount: scopedQuotes.length,
    },
    pipelineSummary: {
      DRAFT: pipelineSummary.DRAFT.length,
      PENDING_APPROVAL: pipelineSummary.PENDING_APPROVAL.length,
      APPROVED: pipelineSummary.APPROVED.length,
      UNDER_NEGOTIATION: pipelineSummary.UNDER_NEGOTIATION.length,
      CONFIRMED: pipelineSummary.CONFIRMED.length,
    },
    recentActivities: formattedActivities,
    quotations: scopedQuotes.slice(0, 20),
    customerTriggeredDeals: customerTriggeredDeals.slice(0, 10),
    upsellSuggestions,
  };
}

function formatRelativeTime(date) {
  if (!date) return 'Recently';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
