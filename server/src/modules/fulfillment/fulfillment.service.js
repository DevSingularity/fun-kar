import * as repo from './fulfillment.repository.js';
import * as quotationsRepo from '../quotations/quotations.repository.js';
import * as engine from './fulfillment.allocationEngine.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../common/errors.js';

function assertOwnership(orderRow, auth) {
  if (!auth) return;
  if (auth.role === 'SALES_REP' && orderRow.salesRepId !== auth.id && orderRow.salesRepId !== auth.userId) {
    throw new ForbiddenError('You do not have permission to access or modify this order.');
  }
}

function deriveOrderStatus(itemsWithState = []) {
  if (itemsWithState.length === 0) return 'PENDING_FULFILLMENT';

  let allFulfilled = true;
  let totalAllocated = 0;

  for (const item of itemsWithState) {
    const qty = Number(item.quantity || 0);
    const allocated = Number(item.allocatedQty || 0);
    if (allocated < qty || item.hasOpenBackorder) {
      allFulfilled = false;
    }
    totalAllocated += allocated;
  }

  if (allFulfilled) return 'FULFILLED';
  if (totalAllocated === 0) return 'BACKORDERED';
  return 'PARTIALLY_FULFILLED';
}

export async function createOrderFromQuotation(quotationId, auth) {
  const quoteJoined = await quotationsRepo.findByIdJoined(quotationId);
  if (!quoteJoined) {
    throw new NotFoundError(`Quotation with ID '${quotationId}' not found.`, 'QUOTATION_NOT_FOUND');
  }

  const quotation = quoteJoined.quotation;
  if (auth?.role === 'SALES_REP' && quotation.salesRepId !== auth.id && quotation.salesRepId !== auth.userId) {
    throw new ForbiddenError('You do not have permission to convert this quotation.');
  }

  if (quotation.status !== 'APPROVED') {
    throw new ConflictError('Only an approved quotation can be converted to an order.', 'INVALID_STATE');
  }

  // Idempotency check
  const existingOrder = await repo.findOrderByQuotationId(quotationId);
  if (existingOrder) {
    const detail = await getOrderFulfillmentDetail(existingOrder.id, auth);
    return {
      order: existingOrder,
      detail,
      alreadyExisted: true,
    };
  }

  const itemsJoined = await quotationsRepo.findItemsJoined(quotationId);
  if (itemsJoined.length === 0) {
    throw new ValidationError('Cannot convert a quotation with no line items.');
  }

  const orderNumber = `ORD-${quotation.quoteNumber.replace(/^Q-/, '')}`;
  const defaultLeadDays = 7;
  const estimatedDeliveryDate = new Date(Date.now() + defaultLeadDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const order = await repo.insertOrder({
    orderNumber,
    quotationId,
    customerId: quotation.customerId,
    status: 'PENDING_FULFILLMENT',
    subtotal: quotation.subtotal,
    discountTotal: quotation.discountTotal,
    taxTotal: quotation.taxTotal,
    grandTotal: quotation.grandTotal,
    promisedDeliveryDate: quotation.promisedDeliveryDate || null,
    estimatedDeliveryDate,
  });

  const orderItemsData = itemsJoined.map((r) => ({
    orderId: order.id,
    quotationItemId: r.item.id,
    productId: r.item.productId,
    quantity: r.item.quantity,
    unitPrice: r.item.unitPrice,
    discountPct: r.item.discountPct,
    discountAmount: r.item.discountAmount,
    lineTotal: r.item.lineTotal,
    billingLineType: r.productType === 'SUBSCRIPTION' ? 'RECURRING' : 'ONE_TIME',
  }));

  await repo.insertOrderItems(orderItemsData);

  await repo.insertAuditLog({
    actorId: auth?.id || auth?.userId,
    entityId: order.id,
    action: 'CREATED_FROM_QUOTATION',
    reason: `Order created from approved quotation ${quotation.quoteNumber}`,
    newValue: { orderNumber, grandTotal: quotation.grandTotal },
  });

  // Run initial auto-allocation
  try {
    await allocateOrder(order.id, auth);
  } catch (err) {
    console.warn('[FULFILLMENT] Initial allocation notice:', err.message);
  }

  const detail = await getOrderFulfillmentDetail(order.id, auth);

  return {
    order,
    detail,
    alreadyExisted: false,
  };
}

export async function allocateOrder(orderId, auth) {
  const orderRow = await repo.findOrderById(orderId);
  if (!orderRow) {
    throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'ORDER_NOT_FOUND');
  }
  assertOwnership(orderRow, auth);

  const allItems = await repo.findOrderItemsJoined(orderId);
  const existingAllocations = await repo.existingAllocationsForOrder(orderId);

  // Group existing allocations by orderItemId
  const manualItemIds = new Set(
    existingAllocations.filter((a) => a.isManualOverride).map((a) => a.orderItemId)
  );

  // Target items that do not have manual override
  const targetItems = allItems.filter((i) => !manualItemIds.has(i.id));
  const targetItemIds = targetItems.map((i) => i.id);

  // Release prior auto allocations for target items
  const autoAllocationsToRelease = existingAllocations.filter(
    (a) => !a.isManualOverride && targetItemIds.includes(a.orderItemId)
  );

  for (const alloc of autoAllocationsToRelease) {
    const item = allItems.find((i) => i.id === alloc.orderItemId);
    if (item) {
      await repo.restoreStock(alloc.warehouseId, item.productId, alloc.quantityAllocated);
    }
  }

  if (autoAllocationsToRelease.length > 0) {
    await repo.deleteAllocationsForItems(autoAllocationsToRelease.map((a) => a.orderItemId));
  }

  // Read live stock candidates for products on target items
  const distinctProductIds = [...new Set(targetItems.map((i) => i.productId))];
  const stockMap = await repo.batchedStockCandidates(distinctProductIds);

  const runningTouchedWarehouseIds = new Set(
    existingAllocations.filter((a) => a.isManualOverride).map((a) => a.warehouseId)
  );

  const newAllocationsToInsert = [];

  for (const item of targetItems) {
    const candidates = stockMap[item.productId] || [];
    const plan = engine.planAllocation({
      requestedQty: item.quantity,
      candidates,
      alreadyTouchedWarehouseIds: runningTouchedWarehouseIds,
    });

    let fulfilledForLine = 0;

    for (const alloc of plan.allocations) {
      const decremented = await repo.tryDecrementStock(alloc.warehouseId, item.productId, alloc.qty);
      if (decremented) {
        newAllocationsToInsert.push({
          orderId,
          orderItemId: item.id,
          warehouseId: alloc.warehouseId,
          quantityAllocated: alloc.qty,
          shippingCost: String(alloc.shippingCost),
          isManualOverride: false,
        });
        fulfilledForLine += alloc.qty;
        runningTouchedWarehouseIds.add(alloc.warehouseId);
      }
    }

    const shortfall = item.quantity - fulfilledForLine;
    if (shortfall > 0) {
      await repo.upsertBackorder(item.id, {
        quantityRequested: item.quantity,
        quantityFulfilled: fulfilledForLine,
        quantityBackordered: shortfall,
        status: fulfilledForLine === 0 ? 'OPEN' : 'PARTIALLY_FULFILLED',
      });
    } else {
      await repo.resolveBackorderIfOpen(item.id);
    }
  }

  if (newAllocationsToInsert.length > 0) {
    await repo.insertAllocations(newAllocationsToInsert);
  }

  // Derive order status
  const stateItems = await repo.allItemsWithFulfillmentState(orderId);
  const newStatus = deriveOrderStatus(stateItems);
  const updatedOrder = await repo.updateOrderStatus(orderId, newStatus);

  await repo.insertAuditLog({
    actorId: auth?.id || auth?.userId,
    entityId: orderId,
    action: 'AUTO_ALLOCATED',
    newValue: { status: newStatus, itemsAllocated: targetItems.length },
  });

  return {
    order: updatedOrder,
    detail: await getOrderFulfillmentDetail(orderId, auth),
  };
}

export async function overrideAllocation(orderId, payload, auth) {
  const orderRow = await repo.findOrderById(orderId);
  if (!orderRow) {
    throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'ORDER_NOT_FOUND');
  }
  assertOwnership(orderRow, auth);

  const allItems = await repo.findOrderItemsJoined(orderId);
  const overrides = payload.overrides;
  const targetItemIds = overrides.map((o) => o.orderItemId);

  // Validate items belong to order
  for (const item of overrides) {
    const matched = allItems.find((i) => i.id === item.orderItemId);
    if (!matched) {
      throw new ValidationError(`Order item '${item.orderItemId}' does not belong to this order.`);
    }
    const totalSplitQty = item.splits.reduce((acc, s) => acc + s.quantity, 0);
    if (totalSplitQty > matched.quantity) {
      throw new ValidationError(
        `Total requested split quantity (${totalSplitQty}) exceeds ordered item quantity (${matched.quantity}) for ${matched.productName}.`
      );
    }
  }

  // Release existing allocations for targeted items
  const existingForTargets = await repo.existingAllocationsForItems(targetItemIds);
  for (const alloc of existingForTargets) {
    const item = allItems.find((i) => i.id === alloc.orderItemId);
    if (item) {
      await repo.restoreStock(alloc.warehouseId, item.productId, alloc.quantityAllocated);
    }
  }
  if (targetItemIds.length > 0) {
    await repo.deleteAllocationsForItems(targetItemIds);
  }

  const newAllocationsToInsert = [];

  for (const override of overrides) {
    const item = allItems.find((i) => i.id === override.orderItemId);
    let totalFulfilled = 0;

    for (const split of override.splits) {
      const decremented = await repo.tryDecrementStock(split.warehouseId, item.productId, split.quantity);
      if (!decremented) {
        throw new ConflictError(
          `Insufficient live stock in warehouse to fulfill ${split.quantity} units of ${item.productName}.`,
          'INSUFFICIENT_STOCK'
        );
      }

      newAllocationsToInsert.push({
        orderId,
        orderItemId: item.id,
        warehouseId: split.warehouseId,
        quantityAllocated: split.quantity,
        shippingCost: String(engine.estimatedShipmentCost(1)),
        isManualOverride: true,
      });
      totalFulfilled += split.quantity;
    }

    const shortfall = item.quantity - totalFulfilled;
    if (shortfall > 0) {
      await repo.upsertBackorder(item.id, {
        quantityRequested: item.quantity,
        quantityFulfilled: totalFulfilled,
        quantityBackordered: shortfall,
        status: totalFulfilled === 0 ? 'OPEN' : 'PARTIALLY_FULFILLED',
      });
    } else {
      await repo.resolveBackorderIfOpen(item.id);
    }
  }

  if (newAllocationsToInsert.length > 0) {
    await repo.insertAllocations(newAllocationsToInsert);
  }

  const stateItems = await repo.allItemsWithFulfillmentState(orderId);
  const newStatus = deriveOrderStatus(stateItems);
  const updatedOrder = await repo.updateOrderStatus(orderId, newStatus);

  await repo.insertAuditLog({
    actorId: auth?.id || auth?.userId,
    entityId: orderId,
    action: 'MANUAL_OVERRIDE',
    newValue: { status: newStatus, overridesCount: overrides.length },
  });

  return {
    order: updatedOrder,
    detail: await getOrderFulfillmentDetail(orderId, auth),
  };
}

export async function consolidateBackorder(orderId, auth) {
  const orderRow = await repo.findOrderById(orderId);
  if (!orderRow) {
    throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'ORDER_NOT_FOUND');
  }
  assertOwnership(orderRow, auth);

  const openBackorders = await repo.openBackordersForOrder(orderId);
  if (openBackorders.length === 0) {
    return {
      order: orderRow.order,
      resolved: [],
      message: 'No open backorders to consolidate.',
    };
  }

  const allItems = await repo.findOrderItemsJoined(orderId);
  const distinctProductIds = [...new Set(openBackorders.map((b) => b.orderItem.productId))];
  const stockMap = await repo.batchedStockCandidates(distinctProductIds);

  const existingAllocations = await repo.existingAllocationsForOrder(orderId);
  const runningTouchedWarehouseIds = new Set(existingAllocations.map((a) => a.warehouseId));

  const newlyAllocated = [];
  const resolvedList = [];

  for (const b of openBackorders) {
    const item = allItems.find((i) => i.id === b.orderItem.id);
    const candidates = stockMap[item.productId] || [];
    const plan = engine.planAllocation({
      requestedQty: b.backorder.quantityBackordered,
      candidates,
      alreadyTouchedWarehouseIds: runningTouchedWarehouseIds,
    });

    let newlyCovered = 0;
    for (const alloc of plan.allocations) {
      const decremented = await repo.tryDecrementStock(alloc.warehouseId, item.productId, alloc.qty);
      if (decremented) {
        newlyAllocated.push({
          orderId,
          orderItemId: item.id,
          warehouseId: alloc.warehouseId,
          quantityAllocated: alloc.qty,
          shippingCost: String(alloc.shippingCost),
          isManualOverride: false,
        });
        newlyCovered += alloc.qty;
        runningTouchedWarehouseIds.add(alloc.warehouseId);
      }
    }

    if (newlyCovered > 0) {
      const remainingBackordered = b.backorder.quantityBackordered - newlyCovered;
      const totalFulfilled = b.backorder.quantityFulfilled + newlyCovered;
      const isResolved = remainingBackordered === 0;

      await repo.upsertBackorder(item.id, {
        quantityRequested: b.backorder.quantityRequested,
        quantityFulfilled: totalFulfilled,
        quantityBackordered: remainingBackordered,
        status: isResolved ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
      });

      resolvedList.push({
        orderItemId: item.id,
        productName: item.productName,
        newlyFulfilled: newlyCovered,
        remainingBackordered,
        status: isResolved ? 'FULFILLED' : 'PARTIALLY_FULFILLED',
      });
    }
  }

  if (newlyAllocated.length > 0) {
    await repo.insertAllocations(newlyAllocated);
  }

  const stateItems = await repo.allItemsWithFulfillmentState(orderId);
  const newStatus = deriveOrderStatus(stateItems);
  const updatedOrder = await repo.updateOrderStatus(orderId, newStatus);

  await repo.insertAuditLog({
    actorId: auth?.id || auth?.userId,
    entityId: orderId,
    action: 'BACKORDER_CONSOLIDATED',
    newValue: { status: newStatus, resolvedCount: resolvedList.length },
  });

  return {
    order: updatedOrder,
    resolved: resolvedList,
    detail: await getOrderFulfillmentDetail(orderId, auth),
  };
}

export async function getOrderFulfillmentDetail(orderId, auth) {
  const orderRow = await repo.findOrderById(orderId);
  if (!orderRow) {
    throw new NotFoundError(`Order with ID '${orderId}' not found.`, 'ORDER_NOT_FOUND');
  }
  assertOwnership(orderRow, auth);

  const items = await repo.findOrderItemsJoined(orderId);
  const { allocations, backorderRows } = await repo.readAllocationView(orderId);

  // Group allocations by warehouse
  const warehouseMap = {};
  for (const alloc of allocations) {
    if (!warehouseMap[alloc.warehouseId]) {
      warehouseMap[alloc.warehouseId] = {
        warehouseId: alloc.warehouseId,
        warehouseName: alloc.warehouseName,
        lines: [],
        totalQty: 0,
        shipmentCost: Number(alloc.shippingCost || 100),
      };
    }
    warehouseMap[alloc.warehouseId].lines.push({
      id: alloc.id,
      orderItemId: alloc.orderItemId,
      productName: alloc.productName,
      productSku: alloc.productSku,
      quantityAllocated: alloc.quantityAllocated,
      isManualOverride: alloc.isManualOverride,
    });
    warehouseMap[alloc.warehouseId].totalQty += alloc.quantityAllocated;
  }

  const warehouseSplits = Object.values(warehouseMap);
  const estimatedShipments = warehouseSplits.length;
  const estimatedShippingTotal = warehouseSplits.reduce((acc, w) => acc + w.shipmentCost, 0);

  return {
    order: orderRow.order,
    customerName: orderRow.customerName,
    customerEmail: orderRow.customerEmail,
    customerTier: orderRow.customerTier,
    quoteNumber: orderRow.quoteNumber,
    items,
    warehouseSplits,
    estimatedShipments,
    estimatedShippingTotal,
    backorders: backorderRows,
  };
}

export async function listFulfillmentOrders(query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
  const offset = Math.max(0, Number(query.offset) || 0);

  const { rows, total } = await repo.listOrdersAwaitingFulfillment({
    search: query.search,
    status: query.status,
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
