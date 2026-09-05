/**
 * Pure Deterministic Allocation Engine (no DB access)
 * Implements greedy allocation with shipping weight ranking and consolidation tie-breaking.
 */

const BASE_SHIPMENT_COST = Number(process.env.FULFILLMENT_BASE_SHIPMENT_COST || 100);

export function round2(val) {
  return Number(Math.round(Number(val) * 100) / 100);
}

export function estimatedShipmentCost(shippingCostWeight) {
  const weight = Number(shippingCostWeight || 1);
  return round2(weight * BASE_SHIPMENT_COST);
}

/**
 * Candidates: [{ warehouseId, quantityOnHand, shippingCostWeight }]
 * alreadyTouchedWarehouseIds: Set of warehouseIds used earlier in the same order allocation
 */
export function rankCandidates(candidates = [], alreadyTouchedWarehouseIds = new Set()) {
  return [...candidates].sort((a, b) => {
    const aTouched = alreadyTouchedWarehouseIds.has(a.warehouseId) ? 0 : 1;
    const bTouched = alreadyTouchedWarehouseIds.has(b.warehouseId) ? 0 : 1;
    if (aTouched !== bTouched) {
      return aTouched - bTouched; // Prioritize already touched warehouses for shipment consolidation
    }
    const aWeight = Number(a.shippingCostWeight || 1);
    const bWeight = Number(b.shippingCostWeight || 1);
    return aWeight - bWeight; // Then pick cheapest shipping cost weight
  });
}

/**
 * Plans fulfillment allocation for a single product line item.
 * Returns { allocations: [{ warehouseId, qty, shippingCost }], shortfall: number }
 */
export function planAllocation({ requestedQty, candidates = [], alreadyTouchedWarehouseIds = new Set() }) {
  const ranked = rankCandidates(candidates, alreadyTouchedWarehouseIds);
  let remaining = Math.max(0, Number(requestedQty));
  const allocations = [];

  for (const candidate of ranked) {
    if (remaining <= 0) break;
    const available = Math.max(0, Number(candidate.quantityOnHand || 0));
    if (available <= 0) continue;

    const take = Math.min(remaining, available);
    allocations.push({
      warehouseId: candidate.warehouseId,
      qty: take,
      shippingCost: estimatedShipmentCost(candidate.shippingCostWeight),
    });
    remaining -= take;
  }

  return {
    allocations,
    shortfall: remaining,
  };
}
