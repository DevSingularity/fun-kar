import { ValidationError } from '../../common/errors.js';

export function validateDecision(requireReason = false) {
  return (body) => {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (requireReason && reason.length === 0) {
      throw new ValidationError('A detailed reason is required for rejection or return.');
    }
    if (reason.length > 2000) {
      throw new ValidationError('Reason cannot exceed 2000 characters.');
    }
    return {
      reason: reason || null,
    };
  };
}

export const validateApprove = validateDecision(false);
export const validateRejectOrReturn = validateDecision(true);
