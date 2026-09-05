import { eq } from 'drizzle-orm';
import { getDb } from '../../config/database.js';
import { billingSchedules } from '../../db/schema/billing.js';
import * as repo from './billing.repository.js';
import * as calc from './billing.calc.js';
import * as repoPlans from '../subscriptionPlans/subscriptionPlans.repository.js';
import { NotFoundError, ConflictError, ForbiddenError, ValidationError } from '../../common/errors.js';

const ONE_TIME_DUE_DAYS = 15;

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

async function requirePlan(planId) {
  const plan = await repoPlans.findPlanById(planId);
  if (!plan) throw new NotFoundError(`Subscription plan '${planId}' not found.`, 'PLAN_NOT_FOUND');
  return plan;
}

/**
 * Generates billing for a freshly-created order: one ONE_TIME invoice for
 * all ONE_TIME/SERVICE lines (issued immediately), and one subscriptionLine
 * + first SCHEDULED billingSchedule per RECURRING line. Idempotent — safe
 * to call more than once for the same order.
 */
export async function generateBillingForOrder(orderId, auth) {
  const orderRow = await repo.findOrderWithRep(orderId);
  if (!orderRow) {
    throw new NotFoundError(`Order '${orderId}' not found.`, 'ORDER_NOT_FOUND');
  }
  if (auth?.role === 'SALES_REP' && orderRow.salesRepId !== auth.id && orderRow.salesRepId !== auth.userId) {
    throw new ForbiddenError('You do not have permission to generate billing for this order.');
  }

  const items = await repo.findOrderItemsWithProduct(orderId);
  if (items.length === 0) {
    throw new ValidationError('Order has no line items to bill.');
  }

  const oneTimeItems = items.filter((i) => i.billingLineType === 'ONE_TIME');
  const recurringItems = items.filter((i) => i.billingLineType === 'RECURRING');

  const result = { oneTimeInvoice: null, subscriptionLines: [], alreadyExisted: false };

  // --- One-time invoice (idempotent) ---
  const existingInvoice = await repo.findExistingOneTimeInvoice(orderId);
  if (existingInvoice) {
    result.oneTimeInvoice = existingInvoice;
    result.alreadyExisted = true;
  } else if (oneTimeItems.length > 0) {
    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;
    const lineRows = [];

    for (const item of oneTimeItems) {
      const gross = Number(item.unitPrice) * item.quantity;
      const taxable = gross - Number(item.discountAmount);
      const lineAmount = Number(item.lineTotal);
      subtotal += gross;
      taxTotal += lineAmount - taxable;
      total += lineAmount;
      lineRows.push({
        orderItemId: item.id,
        description: `${item.productName} (Qty ${item.quantity})`,
        amount: String(lineAmount.toFixed(2)),
      });
    }

    const invoiceNumber = await repo.nextInvoiceNumber();
    const invoice = await repo.insertInvoice({
      invoiceNumber,
      orderId,
      customerId: orderRow.customerId,
      invoiceType: 'ONE_TIME',
      status: 'ISSUED',
      subtotal: String(subtotal.toFixed(2)),
      taxTotal: String(taxTotal.toFixed(2)),
      total: String(total.toFixed(2)),
      dueDate: addDays(today(), ONE_TIME_DUE_DAYS),
      issuedAt: new Date(),
    });

    await repo.insertInvoiceLines(lineRows.map((l) => ({ ...l, invoiceId: invoice.id })));
    await repo.insertAuditLog({
      actorId: auth?.id || auth?.userId,
      entityType: 'INVOICE',
      entityId: invoice.id,
      action: 'ONE_TIME_INVOICE_GENERATED',
      reason: `Generated from order ${orderId}`,
      newValue: { invoiceNumber, total: invoice.total },
    });

    result.oneTimeInvoice = invoice;
  }

  // --- Recurring subscription lines + first billing schedule (idempotent) ---
  const existingSubLines = await repo.findSubscriptionLinesForOrder(orderId);
  const existingOrderItemIds = new Set(existingSubLines.map((r) => r.orderItemId));
  if (existingSubLines.length > 0) {
    result.subscriptionLines.push(...existingSubLines.map((r) => r.line));
  }

  for (const item of recurringItems) {
    if (existingOrderItemIds.has(item.id)) {
      result.alreadyExisted = true;
      continue;
    }
    if (!item.subscriptionPlanId) {
      await repo.insertAuditLog({
        actorId: auth?.id || auth?.userId,
        entityType: 'ORDER',
        entityId: orderId,
        action: 'BILLING_GENERATION_SKIPPED_LINE',
        reason: `Product '${item.productName}' is SUBSCRIPTION type but has no subscriptionPlanId. Fix the product config and re-run billing generation.`,
      });
      continue;
    }

    const plan = await requirePlan(item.subscriptionPlanId);
    const startDate = today();
    const nextBillingDate = calc.addBillingPeriod(startDate, plan.frequency);
    const recurringAmount = Number(item.lineTotal);

    const line = await repo.insertSubscriptionLine({
      orderItemId: item.id,
      subscriptionPlanId: plan.id,
      quantity: item.quantity,
      recurringAmount: String(recurringAmount.toFixed(2)),
      startDate,
      nextBillingDate,
      status: 'ACTIVE',
    });

    await repo.insertBillingSchedule({
      subscriptionLineId: line.id,
      billingPeriodStart: startDate,
      billingPeriodEnd: nextBillingDate,
      amount: String(recurringAmount.toFixed(2)),
      isProrated: false,
      status: 'SCHEDULED',
    });

    await repo.insertAuditLog({
      actorId: auth?.id || auth?.userId,
      entityType: 'SUBSCRIPTION_LINE',
      entityId: line.id,
      action: 'SUBSCRIPTION_LINE_CREATED',
      reason: `Created from order ${orderId} for product '${item.productName}'`,
      newValue: { recurringAmount: line.recurringAmount, nextBillingDate },
    });

    result.subscriptionLines.push(line);
  }

  return result;
}

// ---------- Invoices ----------

export async function listInvoices(query, auth) {
  const salesRepId = auth.role === 'SALES_REP' ? auth.id : undefined;
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const offset = Math.max(0, Number(query.offset) || 0);
  const { rows, total } = await repo.listInvoices({
    status: query.status,
    invoiceType: query.invoiceType,
    customerId: query.customerId,
    salesRepId,
    offset,
    limit,
  });
  return { items: rows, meta: { page: Math.floor(offset / limit) + 1, limit, total, hasMore: offset + rows.length < total } };
}

export async function getInvoiceDetail(id, auth) {
  const invoice = await repo.findInvoiceByIdFull(id);
  if (!invoice) throw new NotFoundError(`Invoice '${id}' not found.`, 'INVOICE_NOT_FOUND');
  if (auth.role === 'SALES_REP' && invoice.salesRepId !== auth.id) {
    throw new ForbiddenError('You do not have access to this invoice.');
  }
  return invoice;
}

// ---------- Subscription change / cancel ----------

export async function changeSubscription(subscriptionLineId, { quantity, newPlanId }, auth) {
  const found = await repo.findSubscriptionLineById(subscriptionLineId);
  if (!found) throw new NotFoundError(`Subscription line '${subscriptionLineId}' not found.`, 'SUBSCRIPTION_LINE_NOT_FOUND');
  if (found.line.status !== 'ACTIVE') {
    throw new ConflictError('Only an ACTIVE subscription can be changed.', 'INVALID_STATE');
  }
  if (!quantity && !newPlanId) {
    throw new ValidationError('Provide at least a new quantity or a new plan.');
  }

  const schedule = await repo.findCurrentScheduleForLine(subscriptionLineId);
  if (!schedule) {
    throw new ConflictError('No open billing cycle found for this subscription line to prorate against.', 'NO_OPEN_CYCLE');
  }

  const newQuantity = quantity ? Number(quantity) : found.line.quantity;
  const targetPlan = newPlanId ? await requirePlan(newPlanId) : found.plan;
  const unitRecurring = Number(found.line.recurringAmount) / found.line.quantity;
  const newCycleAmount = newPlanId
    ? Number(targetPlan.price) * newQuantity
    : unitRecurring * newQuantity;

  const { delta, oldRemainingAmount, newRemainingAmount } = calc.computeChangeDelta({
    cycleStart: schedule.billingPeriodStart,
    cycleEnd: schedule.billingPeriodEnd,
    asOfDate: today(),
    oldCycleAmount: Number(found.line.recurringAmount),
    newCycleAmount,
  });

  let creditNote = null;
  let supplementalInvoiceLine = null;

  if (delta < 0) {
    const creditNoteNumber = await repo.nextCreditNoteNumber();
    creditNote = await repo.insertCreditNote({
      subscriptionLineId,
      amount: String(Math.abs(delta).toFixed(2)),
      reason: `Mid-cycle downgrade proration: unused value of remaining cycle recalculated from ₹${oldRemainingAmount} to ₹${newRemainingAmount}.`,
      status: 'ISSUED',
    });
  } else if (delta > 0) {
    const orderId = found.orderId;
    let openInvoice = await repo.findOpenRecurringInvoice(orderId);
    if (!openInvoice) {
      const invoiceNumber = await repo.nextInvoiceNumber();
      openInvoice = await repo.insertInvoice({
        invoiceNumber,
        orderId,
        customerId: (await repo.findOrderWithRep(orderId)).order.customerId,
        invoiceType: 'RECURRING',
        status: 'ISSUED',
        subtotal: '0',
        taxTotal: '0',
        total: '0',
        dueDate: addDays(today(), ONE_TIME_DUE_DAYS),
        issuedAt: new Date(),
      });
    }
    [supplementalInvoiceLine] = await repo.insertInvoiceLines([
      {
        invoiceId: openInvoice.id,
        billingScheduleId: schedule.id,
        description: `Mid-cycle upgrade proration — ${found.productName}`,
        amount: String(delta.toFixed(2)),
      },
    ]);
    const newTotal = Number(openInvoice.total) + delta;
    await repo.updateInvoiceTotals(openInvoice.id, {
      subtotal: newTotal,
      taxTotal: openInvoice.taxTotal,
      total: newTotal,
    });
  }

  await repo.updateSubscriptionLine(subscriptionLineId, {
    quantity: newQuantity,
    recurringAmount: String(unitRecurring === newCycleAmount / newQuantity ? found.line.recurringAmount : newCycleAmount.toFixed(2)),
    subscriptionPlanId: targetPlan.id,
  });
  await repo.updateScheduleStatus(schedule.id, {
    amount: String(newCycleAmount.toFixed(2)),
    isProrated: true,
  });

  await repo.insertAuditLog({
    actorId: auth.id || auth.userId,
    entityType: 'SUBSCRIPTION_LINE',
    entityId: subscriptionLineId,
    action: 'SUBSCRIPTION_CHANGED',
    reason: `Quantity ${found.line.quantity} -> ${newQuantity}${newPlanId ? `, plan ${found.plan.name} -> ${targetPlan.name}` : ''}`,
    newValue: { delta, newCycleAmount },
  });

  return { delta, creditNote, supplementalInvoiceLine, newCycleAmount };
}

export async function cancelSubscription(subscriptionLineId, { reason }, auth) {
  const found = await repo.findSubscriptionLineById(subscriptionLineId);
  if (!found) throw new NotFoundError(`Subscription line '${subscriptionLineId}' not found.`, 'SUBSCRIPTION_LINE_NOT_FOUND');
  if (found.line.status === 'CANCELLED') {
    throw new ConflictError('This subscription is already cancelled.', 'ALREADY_CANCELLED');
  }

  const schedule = await repo.findCurrentScheduleForLine(subscriptionLineId);
  let creditNote = null;

  if (schedule) {
    const unusedAmount = calc.computeCancellationCredit({
      cycleStart: schedule.billingPeriodStart,
      cycleEnd: schedule.billingPeriodEnd,
      asOfDate: today(),
      cycleAmount: Number(schedule.amount),
    });

    if (unusedAmount > 0) {
      const creditNoteNumber = await repo.nextCreditNoteNumber();
      creditNote = await repo.insertCreditNote({
        subscriptionLineId,
        amount: String(unusedAmount.toFixed(2)),
        reason: reason || `Subscription cancelled mid-cycle; unused value of current billing period refunded.`,
        status: 'ISSUED',
      });
    }
    await repo.updateScheduleStatus(schedule.id, { status: 'SKIPPED' });
  }

  await repo.updateSubscriptionLine(subscriptionLineId, {
    status: 'CANCELLED',
    endDate: today(),
    cancelledAt: new Date(),
  });

  await repo.insertAuditLog({
    actorId: auth.id || auth.userId,
    entityType: 'SUBSCRIPTION_LINE',
    entityId: subscriptionLineId,
    action: 'SUBSCRIPTION_CANCELLED',
    reason: reason || 'Cancelled by user',
    newValue: { creditNoteAmount: creditNote?.amount || '0.00' },
  });

  return { creditNote };
}

// ---------- Reconciliation ----------

export async function invoiceBillingSchedule(scheduleId, auth) {
  const db = getDb();
  const [scheduleRow] = await db
    .select()
    .from(billingSchedules)
    .where(eq(billingSchedules.id, scheduleId));

  if (!scheduleRow) throw new NotFoundError(`Billing schedule '${scheduleId}' not found.`, 'SCHEDULE_NOT_FOUND');
  if (scheduleRow.status !== 'SCHEDULED') {
    throw new ConflictError(`This schedule is already '${scheduleRow.status}'.`, 'INVALID_STATE');
  }

  const line = await repo.findSubscriptionLineById(scheduleRow.subscriptionLineId);
  if (!line) throw new NotFoundError('Owning subscription line not found.', 'SUBSCRIPTION_LINE_NOT_FOUND');

  let openInvoice = await repo.findOpenRecurringInvoice(line.orderId);
  if (!openInvoice) {
    const invoiceNumber = await repo.nextInvoiceNumber();
    const orderRow = await repo.findOrderWithRep(line.orderId);
    openInvoice = await repo.insertInvoice({
      invoiceNumber,
      orderId: line.orderId,
      customerId: orderRow.order.customerId,
      invoiceType: 'RECURRING',
      status: 'ISSUED',
      subtotal: '0',
      taxTotal: '0',
      total: '0',
      dueDate: addDays(today(), ONE_TIME_DUE_DAYS),
      issuedAt: new Date(),
    });
  }

  const amount = Number(scheduleRow.amount);
  await repo.insertInvoiceLines([
    {
      invoiceId: openInvoice.id,
      billingScheduleId: scheduleRow.id,
      description: `${line.productName} — recurring cycle ${scheduleRow.billingPeriodStart} to ${scheduleRow.billingPeriodEnd}`,
      amount: String(amount.toFixed(2)),
    },
  ]);
  const newTotal = Number(openInvoice.total) + amount;
  await repo.updateInvoiceTotals(openInvoice.id, { subtotal: newTotal, taxTotal: openInvoice.taxTotal, total: newTotal });
  await repo.updateScheduleStatus(scheduleRow.id, { status: 'INVOICED', invoiceId: openInvoice.id });

  // Roll the cycle forward: create the NEXT scheduled cycle so reconciliation stays continuous
  const nextStart = scheduleRow.billingPeriodEnd;
  const nextEnd = calc.addBillingPeriod(nextStart, line.plan.frequency);
  await repo.insertBillingSchedule({
    subscriptionLineId: line.line.id,
    billingPeriodStart: nextStart,
    billingPeriodEnd: nextEnd,
    amount: line.line.recurringAmount,
    isProrated: false,
    status: 'SCHEDULED',
  });
  await repo.updateSubscriptionLine(line.line.id, { nextBillingDate: nextEnd });

  await repo.insertAuditLog({
    actorId: auth.id || auth.userId,
    entityType: 'INVOICE',
    entityId: openInvoice.id,
    action: 'RECURRING_CYCLE_INVOICED',
    reason: `Reconciled billing schedule ${scheduleId} for ${line.productName}`,
    newValue: { amount, invoiceNumber: openInvoice.invoiceNumber },
  });

  return { invoice: await repo.findInvoiceByIdFull(openInvoice.id) };
}

export async function getReconciliationOverview() {
  const asOf = today();
  const [dueSchedules, overdueInvoices, unappliedCreditNotes] = await Promise.all([
    repo.findDueSchedules({ asOfDate: asOf }),
    repo.findOverdueInvoices({ asOfDate: asOf }),
    repo.findUnappliedCreditNotes(),
  ]);

  return {
    asOfDate: asOf,
    dueSchedules,
    overdueInvoices,
    unappliedCreditNotes,
    summary: {
      dueScheduleCount: dueSchedules.length,
      dueScheduleTotal: dueSchedules.reduce((sum, r) => sum + Number(r.schedule.amount), 0),
      overdueInvoiceCount: overdueInvoices.length,
      overdueInvoiceTotal: overdueInvoices.reduce((sum, r) => sum + (Number(r.invoice.total) - Number(r.invoice.amountPaid)), 0),
      unappliedCreditTotal: unappliedCreditNotes.reduce((sum, r) => sum + Number(r.creditNote.amount), 0),
    },
  };
}
