import { query } from '../../config/database.js';
import { resolveRepScope } from '../../common/scope.util.js';

export async function getDashboardOverview(currentUser) {
  // Resolve once: null = unscoped (ADMIN/FINANCE/OPERATIONS org-wide view),
  // array = SALES_REP (self) or SALES_MANAGER (self + managed reps).
  const repScope = await resolveRepScope(currentUser);

  // 1. Fetch real quotations from DB
  const allQuotations = await query(
    `SELECT
       q.id,
       q.quote_number,
       q.status,
       q.customer_id,
       c.name AS customer_name,
       c.tier AS customer_tier,
       q.sales_rep_id,
       q.origin_type,
       q.subtotal,
       q.discount_total AS discount_amount,
       q.tax_total AS tax_amount,
       q.grand_total,
       q.required_approval_level,
       q.created_at,
       q.updated_at
     FROM quotations q
     LEFT JOIN customers c ON q.customer_id = c.id
     ORDER BY q.created_at DESC`
  );

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
    if (repScope === null) {
      dbLogs = await query(
        `SELECT
           al.id,
           al.action,
           al.entity_type,
           al.entity_id,
           al.reason,
           al.created_at,
           u.name AS actor_name,
           u.role AS actor_role
         FROM audit_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         WHERE al.entity_type = 'QUOTATION'
         ORDER BY al.created_at DESC
         LIMIT 10`
      );
    } else {
      dbLogs = await query(
        `SELECT
           al.id,
           al.action,
           al.entity_type,
           al.entity_id,
           al.reason,
           al.created_at,
           u.name AS actor_name,
           u.role AS actor_role
         FROM audit_logs al
         LEFT JOIN users u ON al.actor_id = u.id
         WHERE al.entity_type = 'QUOTATION' AND al.entity_id = ANY($1::uuid[])
         ORDER BY al.created_at DESC
         LIMIT 10`,
        [scopedQuoteIds]
      );
    }
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
  const catalogProducts = await query(
    `SELECT
       id,
       sku,
       name,
       base_price,
       estimated_cost,
       tax_rate,
       product_type
     FROM products
     WHERE is_active = true
     LIMIT 6`
  );

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
