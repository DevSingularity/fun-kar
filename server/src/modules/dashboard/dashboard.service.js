import { getDb } from '../../config/database.js';
import { quotations, quotationItems } from '../../db/schema/quotations.js';
import { customers } from '../../db/schema/customers.js';
import { products } from '../../db/schema/catalog.js';
import { approvalRequests, auditLogs } from '../../db/schema/governance.js';
import { users } from '../../db/schema/users.js';
import { desc, eq, sql, inArray } from 'drizzle-orm';

export async function getDashboardOverview(currentUser) {
  const db = getDb();
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

  // Role scoping: sales rep sees own quotes by default or org-wide for managers
  const scopedQuotes = currentUser.role === 'SALES_REP'
    ? allQuotations.filter((q) => q.salesRepId === currentUser.id)
    : allQuotations;

  // 2. Compute Real Aggregated Metrics
  const pendingApprovals = scopedQuotes.filter((q) => q.status === 'PENDING_APPROVAL');
  const openDeals = scopedQuotes.filter((q) => 
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'UNDER_NEGOTIATION'].includes(q.status)
  );
  
  // Deals with overage, required approval level > NONE, or subtotal with high discount
  const atRiskDeals = scopedQuotes.filter((q) => 
    q.requiredApprovalLevel !== 'NONE' || 
    Number(q.discountAmount) > (Number(q.subtotal) * 0.15)
  );

  const totalPipelineValue = openDeals.reduce((sum, q) => sum + Number(q.grandTotal || 0), 0);

  // 3. Pipeline Kanban Column Summaries
  const pipelineSummary = {
    DRAFT: scopedQuotes.filter((q) => q.status === 'DRAFT'),
    PENDING_APPROVAL: scopedQuotes.filter((q) => q.status === 'PENDING_APPROVAL'),
    APPROVED: scopedQuotes.filter((q) => q.status === 'APPROVED'),
    UNDER_NEGOTIATION: scopedQuotes.filter((q) => q.status === 'UNDER_NEGOTIATION' || q.status === 'SENT'),
    CONFIRMED: scopedQuotes.filter((q) => q.status === 'CONFIRMED' || q.status === 'COMPLETED' || q.status === 'FULFILLING'),
  };

  // 4. Fetch Real Audit Logs & Activity Feed
  const dbLogs = await db
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
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

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

  // 5. Fetch Active Catalog Products for Dynamic Upsell Engine
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
    recentActivities,
    quotations: scopedQuotes.slice(0, 20),
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
