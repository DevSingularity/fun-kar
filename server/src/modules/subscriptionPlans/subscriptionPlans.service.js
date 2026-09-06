import * as repo from './subscriptionPlans.repository.js';
import { NotFoundError, ConflictError } from '../../common/errors.js';

export async function listPlans(query = {}) {
  const isActive = query.isActive !== undefined ? query.isActive === 'true' || query.isActive === true : undefined;
  return repo.findAllPlans({ isActive });
}

export async function getPlan(id) {
  const plan = await repo.findPlanById(id);
  if (!plan) throw new NotFoundError(`Subscription plan '${id}' not found.`, 'PLAN_NOT_FOUND');
  return plan;
}

export async function addPlan(data) {
  const existing = await repo.findPlanByName(data.name);
  if (existing) throw new ConflictError(`A plan named '${data.name}' already exists.`, 'DUPLICATE_PLAN_NAME');
  return repo.createPlan(data);
}

export async function editPlan(id, data) {
  await getPlan(id); // 404s if missing
  return repo.updatePlan(id, data);
}
