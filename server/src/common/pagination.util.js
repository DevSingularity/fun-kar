/**
 * Pagination & Sorting Query Parser
 */

export function parseListQuery(query = {}) {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || query.pageSize || '20', 10)));
  const offset = (page - 1) * limit;

  const sortBy = query.sortBy || 'createdAt';
  const sortOrder = (query.sortOrder || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
  const search = typeof query.search === 'string' ? query.search.trim() : undefined;

  return {
    page,
    limit,
    offset,
    sortBy,
    sortOrder,
    search,
  };
}

export function buildMeta(totalItems, page, limit) {
  const totalPages = Math.ceil(totalItems / limit) || 1;
  return {
    total: totalItems,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
