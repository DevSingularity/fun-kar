/**
 * Pure pricing and margin calculation functions for quotations
 * Completely isolated from database and I/O.
 */

function round2(val) {
  return Number(Math.round(Number(val) * 100) / 100);
}

export function computeLineTotals({
  unitPrice,
  quantity,
  discountPct = 0,
  taxRatePct = 0,
  estimatedCostPerUnit = 0,
}) {
  const price = Number(unitPrice);
  const qty = Math.max(1, Number(quantity));
  const discount = Math.max(0, Math.min(100, Number(discountPct) || 0));
  const taxRate = Math.max(0, Number(taxRatePct) || 0);
  const unitCost = Math.max(0, Number(estimatedCostPerUnit) || 0);

  const grossAmount = price * qty;
  const discountAmount = round2((grossAmount * discount) / 100);
  const taxableAmount = grossAmount - discountAmount;
  const taxAmount = round2((taxableAmount * taxRate) / 100);
  const lineTotal = taxableAmount + taxAmount;
  const estimatedCost = round2(unitCost * qty);

  return {
    discountAmount,
    taxAmount,
    lineTotal,
    estimatedCost,
  };
}

export function computeQuotationTotals(items = []) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  let grandTotal = 0;
  let totalCost = 0;

  for (const item of items) {
    const qty = Number(item.quantity || 1);
    const unitPrice = Number(item.unitPrice || 0);
    subtotal += unitPrice * qty;
    discountTotal += Number(item.discountAmount || 0);
    taxTotal += Number(item.taxAmount || 0);
    grandTotal += Number(item.lineTotal || 0);
    totalCost += Number(item.estimatedCost || 0);
  }

  const preTaxRevenue = subtotal - discountTotal;
  const marginAmount = preTaxRevenue - totalCost;
  const marginPct = preTaxRevenue > 0 ? round2((marginAmount / preTaxRevenue) * 100) : 0;

  return {
    subtotal: String(round2(subtotal)),
    discountTotal: String(round2(discountTotal)),
    taxTotal: String(round2(taxTotal)),
    grandTotal: String(round2(grandTotal)),
    estimatedMarginPct: String(marginPct),
    marginAmount: round2(marginAmount),
  };
}

export function marginHealthLabel(marginPct) {
  const pct = Number(marginPct || 0);
  if (pct >= 20) return 'HEALTHY';
  if (pct >= 10) return 'WATCH';
  return 'LOW_MARGIN';
}
