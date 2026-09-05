/**
 * Resource validator — TEMPLATE
 * Copy/rename for each domain entity.
 */
export function validateCreateResource(payload = {}) {
  const errors = [];
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  // TODO: Add more field validations for your domain
  if (!title) errors.push('Title is required.');
  return { valid: errors.length === 0, errors };
}

export function validateUpdateResource(payload = {}) {
  const errors = [];
  // All fields optional for update — just validate format if present
  if (payload.title !== undefined && !payload.title?.trim()) errors.push('Title cannot be empty.');
  return { valid: errors.length === 0, errors };
}
