import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.middleware.js';
import { authorize } from '../../middlewares/authorize.middleware.js';
import { asyncHandler } from '../../common/asyncHandler.js';
import {
  handleListRules,
  handleGetRule,
  handleCreateRule,
  handleUpdateRule,
  handleDeleteRule,
  handleSuggestForQuotation,
  handleAddSuggestionToQuote,
} from './intelligence.controller.js';

// Admin config surface — mounted at /upsell-rules
const adminRouter = Router();
adminRouter.use(authenticate);
adminRouter.get('/', asyncHandler(handleListRules));
adminRouter.get('/:id', asyncHandler(handleGetRule));
adminRouter.post('/', authorize('ADMIN'), asyncHandler(handleCreateRule));
adminRouter.patch('/:id', authorize('ADMIN'), asyncHandler(handleUpdateRule));
adminRouter.delete('/:id', authorize('ADMIN'), asyncHandler(handleDeleteRule));

// Recommendation surface — mounted at /quotations/:id/...
const suggestionsRouter = Router({ mergeParams: true });
suggestionsRouter.use(authenticate);
suggestionsRouter.get('/upsell-suggestions', asyncHandler(handleSuggestForQuotation));
suggestionsRouter.post('/items/from-upsell/:ruleId', asyncHandler(handleAddSuggestionToQuote));

export { adminRouter, suggestionsRouter };
export default adminRouter;
