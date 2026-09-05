import { createRequest, getPendingByQuotationId } from './approval.repository.js';

export async function createIfRequired(quotationId, riskResult, tx = undefined) {
  if (!riskResult || riskResult.requiredApprovalLevel === 'NONE') {
    return null;
  }

  const existing = await getPendingByQuotationId(quotationId, tx);
  if (existing) {
    return existing; // Idempotency backstop
  }

  return createRequest(
    {
      quotationId,
      blendedRiskScore: riskResult.summary?.blendedRiskScore || riskResult.blendedRiskScore || 0,
      requiredLevel: riskResult.summary?.requiredApprovalLevel || riskResult.requiredApprovalLevel,
    },
    tx
  );
}
