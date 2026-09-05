import { successResponse } from '../../common/response.util.js';
import { evaluateQuoteRisk } from './risk.service.js';

export async function handleEvaluateQuoteRisk(req, res) {
  const result = await evaluateQuoteRisk(req.body);
  return successResponse(res, result, 200);
}
