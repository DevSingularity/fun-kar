import { successResponse } from '../../common/response.util.js';
import { getDashboardOverview } from './dashboard.service.js';

export async function handleGetDashboardOverview(req, res) {
  const result = await getDashboardOverview(req.user);
  return successResponse(res, result, 200);
}
