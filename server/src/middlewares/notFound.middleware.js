export function notFoundHandler(req, res) {
  return res.status(404).json({ message: `Route ${req.method} ${req.url} not found.` });
}
