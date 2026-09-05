import * as repo from './intelligence.repository.js';
import * as quotationsService from '../quotations/quotations.service.js';
import * as priceListsService from '../priceLists/priceLists.service.js';
import * as calc from '../quotations/quotations.calc.js';
import { findProductById } from '../products/products.repository.js';
import { NotFoundError } from '../../common/errors.js';

export async function listRules(query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);
  const isActive = query.isActive !== undefined ? query.isActive === 'true' : undefined;

  const { rows, total } = await repo.listRules({
    triggerProductId: query.triggerProductId,
    isActive,
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

export async function getRuleById(id) {
  const row = await repo.findRuleById(id);
  if (!row) {
    throw new NotFoundError(`Upsell rule with ID '${id}' not found.`, 'RULE_NOT_FOUND');
  }
  return row;
}

export async function createRule(payload) {
  const triggerProd = await findProductById(payload.triggerProductId);
  if (!triggerProd) {
    throw new NotFoundError(`Trigger product '${payload.triggerProductId}' not found.`, 'PRODUCT_NOT_FOUND');
  }
  const recommendedProd = await findProductById(payload.recommendedProductId);
  if (!recommendedProd) {
    throw new NotFoundError(`Recommended product '${payload.recommendedProductId}' not found.`, 'PRODUCT_NOT_FOUND');
  }
  return repo.insertRule(payload);
}

export async function updateRule(id, payload) {
  await getRuleById(id);
  return repo.updateRule(id, payload);
}

export async function deleteRule(id) {
  await getRuleById(id);
  return repo.softDeleteRule(id);
}

export async function suggestForQuotation(quotationId, auth, limit = 5) {
  const detail = await quotationsService.getQuotation(quotationId, auth);
  const candidates = await repo.findCandidatesForQuotation(quotationId);
  if (candidates.length === 0) {
    return { suggestions: [] };
  }

  const currentItems = detail.items || [];
  const currentTotals = calc.computeQuotationTotals(currentItems);

  const scored = [];
  for (const c of candidates) {
    const product = c.recommendedProduct;
    const rule = c.rule;

    // Resolve price for customer
    const resolvedPrice = await priceListsService.resolvePrice({
      productId: product.id,
      customerId: detail.quotation?.customerId,
      quantity: 1,
      requestedDiscountPct: 0,
    });

    const unitPrice = Number(resolvedPrice.effectiveUnitPrice || product.basePrice);
    const standardCost = Number(product.estimatedCost || 0);
    const unitMarginPct = unitPrice > 0 ? ((unitPrice - standardCost) / unitPrice) * 100 : 0;

    const minMargin = Number(rule.minMarginPct || 0);
    if (unitMarginPct < minMargin) {
      continue; // Skip candidates that violate rule margin threshold
    }

    // Simulate appending line to quotation
    const hypotheticalLine = calc.computeLineTotals({
      unitPrice,
      quantity: 1,
      discountPct: 0,
      taxRatePct: Number(product.taxRate || 18),
      estimatedCostPerUnit: standardCost,
    });

    const hypotheticalTotals = calc.computeQuotationTotals([
      ...currentItems,
      {
        quantity: 1,
        unitPrice,
        discountAmount: hypotheticalLine.discountAmount,
        taxAmount: hypotheticalLine.taxAmount,
        lineTotal: hypotheticalLine.lineTotal,
        estimatedCost: hypotheticalLine.estimatedCost,
      },
    ]);

    const marginDelta = Number((Number(hypotheticalTotals.marginAmount) - Number(currentTotals.marginAmount)).toFixed(2));
    const coPurchaseScore = Number(rule.coPurchaseScore || 0);

    scored.push({
      ruleId: rule.id,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice,
      estimatedCost: standardCost,
      taxRate: Number(product.taxRate || 18),
      marginDelta,
      isPromoted: !!rule.isPromoted,
      coPurchaseScore,
      reason: `${coPurchaseScore}% co-purchase strength from historical B2B order data`,
    });
  }

  // Sort: isPromoted DESC, coPurchaseScore DESC, marginDelta DESC
  scored.sort((a, b) => {
    if (a.isPromoted !== b.isPromoted) return a.isPromoted ? -1 : 1;
    if (a.coPurchaseScore !== b.coPurchaseScore) return b.coPurchaseScore - a.coPurchaseScore;
    return b.marginDelta - a.marginDelta;
  });

  return { suggestions: scored.slice(0, limit) };
}

export async function addSuggestionToQuote(quotationId, ruleId, auth) {
  const rule = await repo.findRuleByIdActive(ruleId);
  if (!rule) {
    throw new NotFoundError(`Active upsell rule with ID '${ruleId}' not found.`, 'RULE_NOT_FOUND');
  }

  return quotationsService.addLineItem(
    quotationId,
    {
      productId: rule.recommendedProductId,
      quantity: 1,
      discountPct: 0,
    },
    auth
  );
}
