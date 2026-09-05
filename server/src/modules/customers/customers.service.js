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
import { NotFoundError, ConflictError } from '../../common/errors.js';
import { buildMeta } from '../../common/pagination.util.js';

export async function listCustomers(query = {}) {
  const { items, total } = await findCustomers({
    search: query.search,
    tier: query.tier,
    assignedRepId: query.assignedRepId,
    limit: query.limit,
    offset: query.offset,
  });
  const meta = buildMeta(total, query.page || 1, query.limit || 20);
  return { customers: items, meta };
}

export async function getCustomer(id) {
  const customer = await findCustomerById(id);
  if (!customer) {
    throw new NotFoundError(`Customer with ID '${id}' not found.`, 'CUSTOMER_NOT_FOUND');
  }
  return customer;
}

export async function addCustomer(data) {
  const existing = await findCustomerByEmail(data.email);
  if (existing) {
    throw new ConflictError(`Customer with email '${data.email}' already exists.`, 'DUPLICATE_CUSTOMER_EMAIL');
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

  return createCustomer(data);
}

export async function editCustomer(id, data) {
  const customer = await getCustomer(id);

  if (data.email && data.email.toLowerCase().trim() !== customer.email.toLowerCase()) {
    const existing = await findCustomerByEmail(data.email);
    if (existing) {
      throw new ConflictError(`Customer with email '${data.email}' already exists.`, 'DUPLICATE_CUSTOMER_EMAIL');
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

export async function removeCustomer(id) {
  await getCustomer(id);
  return deleteCustomer(id);
}
