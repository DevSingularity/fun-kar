import { successResponse } from '../../common/response.util.js';
import { parseListQuery } from '../../common/pagination.util.js';
import {
  listCustomers,
  getCustomer,
  addCustomer,
  editCustomer,
  removeCustomer,
} from './customers.service.js';

export async function handleListCustomers(req, res) {
  const query = parseListQuery(req.query);
  const result = await listCustomers({
    ...query,
    tier: req.query.tier,
    assignedRepId: req.query.assignedRepId,
  });
  return successResponse(res, result.customers, 200, result.meta);
}

export async function handleGetCustomer(req, res) {
  const customer = await getCustomer(req.params.id);
  return successResponse(res, customer, 200);
}

export async function handleCreateCustomer(req, res) {
  const customer = await addCustomer(req.body);
  return successResponse(res, customer, 201);
}

export async function handleUpdateCustomer(req, res) {
  const customer = await editCustomer(req.params.id, req.body);
  return successResponse(res, customer, 200);
}

export async function handleDeleteCustomer(req, res) {
  const customer = await removeCustomer(req.params.id);
  return successResponse(res, { deleted: true, customer }, 200);
}
