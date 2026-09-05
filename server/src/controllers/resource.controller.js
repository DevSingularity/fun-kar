/**
 * Resource Controller — TEMPLATE
 * Copy/rename for each domain entity. Replace service imports accordingly.
 */
import { listResources, getResourceById, createResource, updateResource, deleteResource } from '../services/resource.service.js';

export async function listController(req, res, next) {
  try {
    const { search, limit, offset } = req.query;
    const items = await listResources({ userId: req.auth.userId, search, limit: Number(limit) || 20, offset: Number(offset) || 0 });
    return res.status(200).json({ items });
  } catch (e) { return next(e); }
}
export async function getOneController(req, res, next) {
  try {
    const item = await getResourceById({ userId: req.auth.userId, resourceId: req.params.id });
    return res.status(200).json({ item });
  } catch (e) { return next(e); }
}
export async function createController(req, res, next) {
  try {
    const item = await createResource({ userId: req.auth.userId, payload: req.body });
    return res.status(201).json({ item });
  } catch (e) { return next(e); }
}
export async function updateController(req, res, next) {
  try {
    const item = await updateResource({ userId: req.auth.userId, resourceId: req.params.id, payload: req.body });
    return res.status(200).json({ item });
  } catch (e) { return next(e); }
}
export async function deleteController(req, res, next) {
  try {
    await deleteResource({ userId: req.auth.userId, resourceId: req.params.id });
    return res.status(200).json({ message: 'Deleted successfully.' });
  } catch (e) { return next(e); }
}
