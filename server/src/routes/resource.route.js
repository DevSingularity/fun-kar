/**
 * Resource router — TEMPLATE
 * Copy/rename for each domain entity.
 * TODO: rename the router import alias and mount path in routes/index.js
 */
import { Router } from 'express';
import { listController, getOneController, createController, updateController, deleteController } from '../controllers/resource.controller.js';
import { validateCreateResource, validateUpdateResource } from '../validators/resource.validator.js';
import { verifyToken } from '../middlewares/verifyToken.js';

const router = Router();

function validate(fn) {
  return (req, res, next) => {
    const { valid, errors } = fn(req.body);
    if (!valid) return res.status(400).json({ message: 'Validation failed.', errors });
    return next();
  };
}

router.use(verifyToken); // All resource routes require auth

router.get('/',     listController);
router.get('/:id',  getOneController);
router.post('/',    validate(validateCreateResource), createController);
router.patch('/:id', validate(validateUpdateResource), updateController);
router.delete('/:id', deleteController);

export default router;
