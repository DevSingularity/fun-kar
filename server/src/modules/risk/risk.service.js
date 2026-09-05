import { findCustomerById } from '../customers/customers.repository.js';
import { findProductById } from '../products/products.repository.js';
import {
  findTierLimitByTier,
  findCategoryLimitByCategoryId,
  findApprovalRules,
} from '../governance/governance.repository.js';
import { NotFoundError, ValidationError } from '../../common/errors.js';

const DEFAULT_TIER_LIMITS = {
  BRONZE: 10,
  SILVER: 20,
  GOLD: 30,
};

export async function evaluateQuoteRisk({ customerId, lines }) {
  if (!customerId) {
    throw new ValidationError('customerId is required for risk evaluation.');
  }
  if (!lines || !Array.isArray(lines) || lines.length === 0) {
    throw new ValidationError('At least one quotation line is required for risk evaluation.');
  }

  const customer = await findCustomerById(customerId);
  if (!customer) {
    throw new NotFoundError(`Customer with ID '${customerId}' not found.`, 'CUSTOMER_NOT_FOUND');
  }

  // Fetch tier limit from governance DB or fallback default
  const tierLimitRecord = await findTierLimitByTier(customer.tier);
  const tierMaxDiscountPct = tierLimitRecord
    ? Number(tierLimitRecord.maxDiscountPct)
    : (DEFAULT_TIER_LIMITS[customer.tier] || 15);

  // Fetch active approval rules
  const allApprovalRules = await findApprovalRules();
  const activeApprovalRules = allApprovalRules.filter((r) => r.isActive);

  let totalBaseAmount = 0;
  let totalNetAmount = 0;
  let totalCostAmount = 0;
  let totalOverageWeighted = 0;
  const lineEvaluations = [];
  const explanations = [];

  explanations.push(`Customer '${customer.name}' is on tier '${customer.tier}', allowing up to ${tierMaxDiscountPct}% baseline discount.`);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const product = await findProductById(line.productId);
    if (!product) {
      throw new NotFoundError(`Product with ID '${line.productId}' not found.`, 'PRODUCT_NOT_FOUND');
    }

    const unitPrice = Number(line.unitPrice !== undefined ? line.unitPrice : product.listPrice);
    const quantity = Number(line.quantity || 1);
    const requestedDiscountPct = Number(line.requestedDiscountPct || 0);
    const standardCost = Number(product.standardCost || 0);

    // Fetch category limit
    let categoryMaxDiscountPct = null;
    if (product.categoryId) {
      const catLimitRecord = await findCategoryLimitByCategoryId(product.categoryId);
      if (catLimitRecord) {
        categoryMaxDiscountPct = Number(catLimitRecord.maxDiscountPct);
      }
    }

    // Effective allowed discount is min of customer tier limit and category limit (if set)
    const effectiveAllowedDiscountPct = categoryMaxDiscountPct !== null
      ? Math.min(tierMaxDiscountPct, categoryMaxDiscountPct)
      : tierMaxDiscountPct;

    const overagePct = Math.max(0, requestedDiscountPct - effectiveAllowedDiscountPct);
    const effectiveUnitPrice = unitPrice * (1 - requestedDiscountPct / 100);
    const lineBaseAmount = unitPrice * quantity;
    const lineNetAmount = effectiveUnitPrice * quantity;
    const lineCostAmount = standardCost * quantity;
    const lineMarginPct = lineNetAmount > 0
      ? ((lineNetAmount - lineCostAmount) / lineNetAmount) * 100
      : 0;

    const isExceeding = overagePct > 0;

    totalBaseAmount += lineBaseAmount;
    totalNetAmount += lineNetAmount;
    totalCostAmount += lineCostAmount;
    totalOverageWeighted += overagePct * lineBaseAmount;

    if (isExceeding) {
      const constraintDesc = categoryMaxDiscountPct !== null && categoryMaxDiscountPct < tierMaxDiscountPct
        ? `category limit (${categoryMaxDiscountPct}%)`
        : `tier limit (${tierMaxDiscountPct}%)`;
      explanations.push(
        `Line ${i + 1} (${product.name}): Requested ${requestedDiscountPct.toFixed(1)}% exceeds ${constraintDesc} by ${overagePct.toFixed(1)}%.`
      );
    }

    lineEvaluations.push({
      lineNumber: i + 1,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      quantity,
      unitPrice,
      requestedDiscountPct,
      tierMaxDiscountPct,
      categoryMaxDiscountPct,
      effectiveAllowedDiscountPct,
      overagePct: Number(overagePct.toFixed(2)),
      effectiveUnitPrice: Number(effectiveUnitPrice.toFixed(2)),
      lineBaseAmount: Number(lineBaseAmount.toFixed(2)),
      lineNetAmount: Number(lineNetAmount.toFixed(2)),
      lineCostAmount: Number(lineCostAmount.toFixed(2)),
      lineMarginPct: Number(lineMarginPct.toFixed(2)),
      status: isExceeding ? 'EXCEEDS_POLICY' : 'WITHIN_POLICY',
    });
  }

  const blendedOveragePct = totalBaseAmount > 0
    ? totalOverageWeighted / totalBaseAmount
    : 0;

  const totalDiscountAmount = totalBaseAmount - totalNetAmount;
  const overallMarginPct = totalNetAmount > 0
    ? ((totalNetAmount - totalCostAmount) / totalNetAmount) * 100
    : 0;
  const blendedDiscountPct = totalBaseAmount > 0
    ? (totalDiscountAmount / totalBaseAmount) * 100
    : 0;

  // Map blended overage to required approval level
  let requiredApprovalLevel = 'NONE';
  if (blendedOveragePct > 0) {
    let matchedRule = null;
    for (const rule of activeApprovalRules) {
      const min = Number(rule.minOveragePct);
      const max = rule.maxOveragePct !== null ? Number(rule.maxOveragePct) : Infinity;
      if (blendedOveragePct >= min && blendedOveragePct < max) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      requiredApprovalLevel = matchedRule.requiredLevel;
    } else {
      // Fallback standard band
      if (blendedOveragePct <= 10) {
        requiredApprovalLevel = 'NONE';
      } else if (blendedOveragePct <= 20) {
        requiredApprovalLevel = 'MANAGER';
      } else {
        requiredApprovalLevel = 'MANAGER_FINANCE';
      }
    }
  }

  if (requiredApprovalLevel === 'NONE') {
    explanations.push('Quotation is within authorized delegation limits. Instant approval eligible.');
  } else if (requiredApprovalLevel === 'MANAGER') {
    explanations.push(`Blended discount overage of ${blendedOveragePct.toFixed(2)}% requires Sales Manager approval.`);
  } else if (requiredApprovalLevel === 'MANAGER_FINANCE') {
    explanations.push(`High discount overage of ${blendedOveragePct.toFixed(2)}% requires dual Sales Manager & Finance approval.`);
  }

  // Risk flags
  const riskFlags = [];
  if (overallMarginPct < 15) {
    riskFlags.push({ code: 'LOW_MARGIN', message: `Overall quotation margin is critically low (${overallMarginPct.toFixed(1)}%).` });
  }
  if (blendedOveragePct > 15) {
    riskFlags.push({ code: 'HIGH_DISCOUNT_OVERAGE', message: `Blended discount overage is high (${blendedOveragePct.toFixed(1)}%).` });
  }

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      tier: customer.tier,
      tierMaxDiscountPct,
    },
    summary: {
      totalBaseAmount: Number(totalBaseAmount.toFixed(2)),
      totalNetAmount: Number(totalNetAmount.toFixed(2)),
      totalDiscountAmount: Number(totalDiscountAmount.toFixed(2)),
      blendedDiscountPct: Number(blendedDiscountPct.toFixed(2)),
      blendedOveragePct: Number(blendedOveragePct.toFixed(2)),
      overallMarginPct: Number(overallMarginPct.toFixed(2)),
      blendedRiskScore: Number(blendedOveragePct.toFixed(2)),
      requiredApprovalLevel,
      policyStatus: requiredApprovalLevel === 'NONE' ? 'COMPLIANT' : 'REQUIRES_APPROVAL',
      riskFlags,
    },
    lineEvaluations,
    explanations,
  };
}
