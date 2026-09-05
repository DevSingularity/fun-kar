import * as repo from './payments.repository.js';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../common/errors.js';
import { parseListQuery, buildMeta } from '../../common/pagination.util.js';

export async function recordPayment(invoiceId, { amount, method, transactionReference }, authUser) {

  const result = await repo.findInvoiceById(invoiceId);
  if (!result) {
    throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`, 'INVOICE_NOT_FOUND');
  }

  const { invoice, salesRepId } = result;

  if (authUser.role === 'SALES_REP' && salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to record payments for this invoice.', 'ACCESS_DENIED');
  }

  if (!['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status)) {
    throw new ConflictError('Invoice must be ISSUED or PARTIALLY_PAID to record a payment.', 'INVALID_INVOICE_STATE');
  }

  const numAmount = Number(amount);
  const currentTotal = Number(invoice.total);
  const currentPaid = Number(invoice.amountPaid || 0);
  const remainingBalance = Number((currentTotal - currentPaid).toFixed(2));

  if (numAmount > remainingBalance) {
    throw new ValidationError(`Payment amount (${numAmount}) exceeds remaining balance of ${remainingBalance}.`, [
      { field: 'amount', message: `Amount exceeds remaining balance of ${remainingBalance}.` },
    ]);
  }

  const payment = await repo.insertPayment({
    invoiceId,
    amount: String(numAmount.toFixed(2)),
    method,
    transactionReference,
    status: 'SUCCEEDED',
    paidAt: new Date(),
  });

  const newAmountPaid = Number((currentPaid + numAmount).toFixed(2));
  const newStatus = newAmountPaid >= currentTotal ? 'PAID' : 'PARTIALLY_PAID';

  const updatedInvoice = await repo.updateInvoice(invoiceId, {
    amountPaid: String(newAmountPaid.toFixed(2)),
    status: newStatus,
    updatedAt: new Date(),
  });

  await repo.insertAuditLog({
    actorId: authUser?.id || authUser?.userId,
    entityType: 'INVOICE',
    entityId: invoiceId,
    action: 'PAYMENT_RECORDED',
    newValue: {
      paymentId: payment.id,
      amount: payment.amount,
      newStatus: updatedInvoice.status,
    },
  });

  return { payment, invoice: updatedInvoice };
}


export async function listPayments(invoiceId, query, authUser) {
  const result = await repo.findInvoiceById(invoiceId);
  if (!result) {
    throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`, 'INVOICE_NOT_FOUND');
  }

  if (authUser.role === 'SALES_REP' && result.salesRepId !== authUser.id) {
    throw new ForbiddenError('You do not have access to view payments for this invoice.', 'ACCESS_DENIED');
  }

  const { page, limit, offset } = parseListQuery(query);
  const { rows, count } = await repo.listPayments(invoiceId, { offset, limit });

  return {
    items: rows,
    meta: buildMeta(count, page, limit),
  };

}
