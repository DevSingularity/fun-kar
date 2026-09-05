import {
  findCustomers,
  findCustomerById,
  findCustomerByEmail,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './customers.repository.js';
import { findUserById } from '../auth/auth.repository.js';
import { findPriceListById } from '../priceLists/priceLists.repository.js';
import { NotFoundError, ConflictError, ForbiddenError } from '../../common/errors.js';
import { buildMeta } from '../../common/pagination.util.js';
import { resolveRepScope } from '../../common/scope.util.js';

function assertCustomerOwnership(customer, authUser) {
  if (!authUser) return;
  if (authUser.role === 'SALES_REP' && customer.assignedRepId !== authUser.id) {
    throw new ForbiddenError('You do not have permission to access or modify this customer.');
  }
}

export async function listCustomers(query = {}, authUser) {
  const repScope = await resolveRepScope(authUser);
  const scopedAssignedRepId = repScope !== null ? repScope : query.assignedRepId;

  const { items, total } = await findCustomers({
    search: query.search,
    tier: query.tier,
    assignedRepId: scopedAssignedRepId,
    limit: query.limit,
    offset: query.offset,
  });
  const meta = buildMeta(total, query.page || 1, query.limit || 20);
  return { customers: items, meta };
}

export async function getCustomer(id, authUser) {
  const customer = await findCustomerById(id);
  if (!customer) {
    throw new NotFoundError(`Customer with ID '${id}' not found.`, 'CUSTOMER_NOT_FOUND');
  }
  assertCustomerOwnership(customer, authUser);
  return customer;
}

export async function addCustomer(data, authUser) {
  const existing = await findCustomerByEmail(data.email);
  if (existing) {
    throw new ConflictError(`Customer with email '${data.email}' already exists.`, 'DUPLICATE_CUSTOMER_EMAIL');
  }

  const payload = { ...data };

  if (authUser?.role === 'SALES_REP') {
    // A rep cannot hand a new account to someone else...
    if (payload.assignedRepId && payload.assignedRepId !== authUser.id) {
      throw new ForbiddenError('You can only create customers assigned to yourself.');
    }
    // ...and every customer a rep creates must be assigned to them,
    // otherwise it would be created invisible to its own creator.
    payload.assignedRepId = authUser.id;
  }

  if (payload.assignedRepId) {
    const rep = await findUserById(payload.assignedRepId);
    if (!rep) {
      throw new NotFoundError(`Assigned sales representative '${payload.assignedRepId}' not found.`, 'REP_NOT_FOUND');
    }
  }

  if (payload.priceListId) {
    const priceList = await findPriceListById(payload.priceListId);
    if (!priceList) {
      throw new NotFoundError(`Price list '${payload.priceListId}' not found.`, 'PRICE_LIST_NOT_FOUND');
    }
  }

  return createCustomer(payload);
}

export async function editCustomer(id, data, authUser) {
  // getCustomer() enforces ownership — a rep editing someone else's
  // customer never gets past this line.
  const customer = await getCustomer(id, authUser);

  if (data.email && data.email.toLowerCase().trim() !== customer.email.toLowerCase()) {
    const existing = await findCustomerByEmail(data.email);
    if (existing) {
      throw new ConflictError(`Customer with email '${data.email}' already exists.`, 'DUPLICATE_CUSTOMER_EMAIL');
    }
  }

  // Only Admin/Manager may move a customer to a different rep's book —
  // mirrors the same rule already used for quotation reassignment.
  if (data.assignedRepId !== undefined && data.assignedRepId !== customer.assignedRepId) {
    if (authUser && !['ADMIN', 'SALES_MANAGER'].includes(authUser.role)) {
      throw new ForbiddenError('Only a Sales Manager or Admin can reassign a customer to another representative.');
    }
  }

  if (data.assignedRepId) {
    const rep = await findUserById(data.assignedRepId);
    if (!rep) {
      throw new NotFoundError(`Assigned sales representative '${data.assignedRepId}' not found.`, 'REP_NOT_FOUND');
    }
  }

  if (data.priceListId) {
    const priceList = await findPriceListById(data.priceListId);
    if (!priceList) {
      throw new NotFoundError(`Price list '${data.priceListId}' not found.`, 'PRICE_LIST_NOT_FOUND');
    }
  }

  return updateCustomer(id, data);
}

export async function removeCustomer(id, authUser) {
  await getCustomer(id, authUser);
  return deleteCustomer(id);
}
