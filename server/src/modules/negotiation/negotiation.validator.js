import { ValidationError } from '../../common/errors.js';

const REQUEST_TYPES = ['COMMENT', 'CHANGE_REQUEST', 'COUNTER_DISCOUNT'];
const DECISIONS = ['ACCEPT', 'REJECT', 'RETURN'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateRequest(req, res, next) {
  const { requestType, message, quotationItemId, requestedDiscountPct, requestedDeliveryDate } = req.body || {};
  const errors = [];

  if (!requestType || !REQUEST_TYPES.includes(requestType)) {
    errors.push({ field: 'requestType', message: `requestType must be one of: ${REQUEST_TYPES.join(', ')}` });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    errors.push({ field: 'message', message: 'Message is required.' });
  }

  if (requestType === 'COUNTER_DISCOUNT') {
    if (quotationItemId && !UUID_REGEX.test(quotationItemId)) {
      errors.push({ field: 'quotationItemId', message: 'quotationItemId must be a valid UUID.' });
    }
    const pct = Number(requestedDiscountPct);
    if (requestedDiscountPct === undefined || requestedDiscountPct === null || isNaN(pct) || pct < 0 || pct > 100) {
      errors.push({ field: 'requestedDiscountPct', message: 'requestedDiscountPct must be a number between 0 and 100.' });
    }
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for negotiation request input.', errors));
  }

  req.body.message = message.trim();
  if (requestedDiscountPct !== undefined) {
    req.body.requestedDiscountPct = Number(requestedDiscountPct);
  }
  next();
}

export function validateComment(req, res, next) {
  const { message, negotiationRequestId } = req.body || {};
  const errors = [];

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    errors.push({ field: 'message', message: 'Message is required.' });
  }

  if (negotiationRequestId && !UUID_REGEX.test(negotiationRequestId)) {
    errors.push({ field: 'negotiationRequestId', message: 'negotiationRequestId must be a valid UUID.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for comment input.', errors));
  }

  req.body.message = message.trim();
  next();
}

export function validateResolve(req, res, next) {
  const { decision, resolutionNote } = req.body || {};
  const errors = [];

  if (!decision || !DECISIONS.includes(decision)) {
    errors.push({ field: 'decision', message: `decision must be one of: ${DECISIONS.join(', ')}` });
  }

  if (!resolutionNote || typeof resolutionNote !== 'string' || resolutionNote.trim().length === 0) {
    errors.push({ field: 'resolutionNote', message: 'resolutionNote is required.' });
  }

  if (errors.length > 0) {
    return next(new ValidationError('Validation failed for resolution input.', errors));
  }

  req.body.resolutionNote = resolutionNote.trim();
  next();
}
